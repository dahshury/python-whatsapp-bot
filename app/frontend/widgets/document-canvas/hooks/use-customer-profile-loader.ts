"use client";

import { useCustomer } from "@shared/libs/query/customers.hooks";
import { queryKeys } from "@shared/libs/query/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { onCustomerProfile } from "@/processes/customers/customer-events.process";
import { getDocGridApi } from "@/shared/libs/data-grid/components/utils/grid-api";
import { clearEditingAndCacheForCells } from "@/shared/libs/data-grid/components/utils/provider-state";

type ProviderRef = { current: unknown | null };

type DataSourceShape = {
	setCellData: (
		col: number,
		row: number,
		v: unknown
	) => Promise<boolean> | Promise<void>;
	getCellData: (col: number, row: number) => Promise<unknown>;
};

type CustomerData = {
	name?: string | null;
	customer_name?: string | null;
	age?: number | null;
	document?: Record<string, unknown> | null;
};

const TIMEOUT_DELAY_MS = 1000;

function getCellIndices(customerColumns: { id: string }[]) {
	return {
		nameCol: customerColumns.findIndex((c) => c.id === "name"),
		ageCol: customerColumns.findIndex((c) => c.id === "age"),
		phoneCol: customerColumns.findIndex((c) => c.id === "phone"),
	};
}

async function applyCellData(
	dataSource: DataSourceShape,
	cellIndices: { nameCol: number; ageCol: number; phoneCol: number },
	name: string,
	age: number | null
) {
	const { nameCol, ageCol } = cellIndices;
	if (nameCol !== -1) {
		await dataSource.setCellData(nameCol, 0, name);
	}
	if (ageCol !== -1) {
		await dataSource.setCellData(ageCol, 0, age);
	}
}

function validateCellData(
	nameCol: number,
	ageCol: number,
	dataSource: DataSourceShape
) {
	return Promise.all([
		nameCol !== -1 ? dataSource.getCellData(nameCol, 0) : undefined,
		ageCol !== -1 ? dataSource.getCellData(ageCol, 0) : undefined,
	]).catch(() => {
		// Intentional: cell validation failures are handled silently
	});
}

function updateGridDisplay(
	provider: unknown,
	nameCol: number,
	ageCol: number,
	phoneCol: number
) {
	try {
		clearEditingAndCacheForCells(provider, [
			{ col: nameCol, row: 0 },
			{ col: ageCol, row: 0 },
			...(typeof phoneCol === "number" && phoneCol !== -1
				? [{ col: phoneCol, row: 0 }]
				: []),
		]);
		const gridApi = getDocGridApi();
		if (gridApi?.updateCells) {
			const cells: { cell: [number, number] }[] = [
				{ cell: [nameCol, 0] },
				{ cell: [ageCol, 0] },
			];
			if (typeof phoneCol === "number" && phoneCol !== -1) {
				cells.push({ cell: [phoneCol, 0] });
			}
			gridApi.updateCells(cells);
		}
	} catch {
		// Intentional: grid update may fail
	}
}

type ApplyArgs = {
	record?: CustomerData;
	waId: string;
	provider: unknown;
	indices: ReturnType<typeof getCellIndices>;
	dataSource: DataSourceShape;
};

async function applyFromCustomerRecord(args: ApplyArgs): Promise<boolean> {
	const { record, waId, provider, indices, dataSource } = args;
	const customerData = record || {};
	const restName = (customerData.name ??
		customerData.customer_name ??
		"") as string;
	const restAge = (customerData.age ?? null) as number | null;
	const restDocument = customerData.document || null;
	if (restDocument) {
		window.dispatchEvent(
			new CustomEvent("documents:external-update", {
				detail: { wa_id: waId, document: restDocument },
			})
		);
	}
	await applyCellData(dataSource, indices, restName, restAge);
	await validateCellData(indices.nameCol, indices.ageCol, dataSource);
	updateGridDisplay(
		provider,
		indices.nameCol,
		indices.ageCol,
		indices.phoneCol
	);
	window.dispatchEvent(
		new CustomEvent("doc:customer-loaded", { detail: { waId } })
	);
	return true;
}

function buildApplySequence(
	waId: string,
	provider: unknown,
	indices: ReturnType<typeof getCellIndices>,
	dataSource: DataSourceShape
) {
	return {
		applyCached: async (cached?: { data?: CustomerData }) => {
			if (cached?.data) {
				await applyFromCustomerRecord({
					record: cached.data,
					waId,
					provider,
					indices,
					dataSource,
				});
				return true;
			}
			return false;
		},
		applyFresh: async (fresh?: { data?: CustomerData }) => {
			const record = fresh?.data;
			if (record) {
				const ok = await applyFromCustomerRecord({
					record,
					waId,
					provider,
					indices,
					dataSource,
				});
				return ok;
			}
			return false;
		},
	};
}

export function useCustomerProfileLoader(params: {
	waId: string;
	customerColumns: { id: string }[];
	customerDataSource: DataSourceShape;
	providerRef: ProviderRef;
}) {
	const { waId, customerColumns, customerDataSource, providerRef } = params;
	const [customerLoading, setCustomerLoading] = useState(false);
	const [customerError, setCustomerError] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const customerQuery = useCustomer(waId);

	const onDataProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				providerRef.current = provider;
				if (!waId || waId.trim() === "") {
					return;
				}

				setCustomerLoading(true);
				let resolved = false;
				const cellIndices = getCellIndices(customerColumns);
				const seq = buildApplySequence(
					waId,
					provider,
					cellIndices,
					customerDataSource
				);

				// Try cache first for instant population
				const cached = queryClient.getQueryData(
					queryKeys.customers.detail(waId)
				) as { data?: CustomerData } | undefined;
				try {
					const applied = await seq.applyCached(cached);
					if (applied) {
						resolved = true;
					}
				} catch {
					// ignore cache apply errors
				}

				// Then ensure fresh data via query result
				try {
					const fresh = customerQuery.data as
						| { data?: CustomerData }
						| undefined;
					const ok = await seq.applyFresh(fresh);
					if (ok) {
						resolved = true;
						setCustomerError(null);
						setCustomerLoading(false);
					}
				} catch (error) {
					setCustomerError(
						(error as Error)?.message || "Failed to load customer"
					);
				}

				const off = onCustomerProfile(
					waId,
					(d: {
						wa_id?: string;
						name?: string | null;
						age?: number | null;
					}) => {
						try {
							resolved = true;
							applyCellData(
								customerDataSource,
								cellIndices,
								(d?.name || "") as string,
								(d?.age ?? null) as number | null
							)
								.then(() => {
									window.dispatchEvent(
										new CustomEvent("doc:customer-loaded", { detail: { waId } })
									);
								})
								.catch(() => {
									// Intentional: apply failures are handled silently
								});
							setCustomerError(null);
							setCustomerLoading(false);
							try {
								off();
							} catch {
								// Intentional: off may fail
							}
						} catch {
							// Intentional: callback errors are handled silently
						}
					}
				);

				setTimeout(() => {
					if (!resolved) {
						try {
							off();
						} catch {
							// Intentional: off may fail
						}
						setCustomerLoading(false);
					}
				}, TIMEOUT_DELAY_MS);
			} catch (error) {
				setCustomerError(
					(error as Error)?.message || "Failed to load customer"
				);
				setCustomerLoading(false);
			}
		},
		[
			waId,
			customerColumns,
			customerDataSource,
			providerRef,
			queryClient,
			customerQuery,
		]
	);

	return { onDataProviderReady, customerLoading, customerError } as const;
}
