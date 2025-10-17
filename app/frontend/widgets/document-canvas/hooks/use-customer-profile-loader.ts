"use client";

import { fetchCustomer } from "@shared/libs/api/index";
import { useCallback, useState } from "react";
import { onCustomerProfile } from "@/processes/customers/customer-events.process";
import { getDocGridApi } from "@/shared/libs/data-grid/components/utils/grid-api";
import { clearEditingAndCacheForCells } from "@/shared/libs/data-grid/components/utils/provider-state";
import {
	beginRestGuard,
	endRestGuard,
} from "@/shared/libs/http/inflight-guard";

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

async function fetchAndApplyCustomerData(
	waId: string,
	provider: unknown,
	{ nameCol, ageCol, phoneCol }: ReturnType<typeof getCellIndices>,
	customerDataSource: DataSourceShape
): Promise<boolean> {
	try {
		beginRestGuard("__docRestInFlight");
		const resp = (await fetchCustomer(waId)) as unknown as {
			data?: CustomerData;
		};
		const customerData = resp?.data || {};
		const restName = (customerData.name ??
			customerData.customer_name ??
			"") as string;
		const restAge = (customerData.age ?? null) as number | null;
		const restDocument = customerData.document || null;

		endRestGuard("__docRestInFlight");

		if (restDocument) {
			window.dispatchEvent(
				new CustomEvent("documents:external-update", {
					detail: { wa_id: waId, document: restDocument },
				})
			);
		}

		await applyCellData(
			customerDataSource,
			{ nameCol, ageCol, phoneCol },
			restName,
			restAge
		);
		await validateCellData(nameCol, ageCol, customerDataSource);
		updateGridDisplay(provider, nameCol, ageCol, phoneCol);

		window.dispatchEvent(
			new CustomEvent("doc:customer-loaded", { detail: { waId } })
		);
		return true;
	} catch (_error) {
		endRestGuard("__docRestInFlight");
		return false;
	}
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

				const success = await fetchAndApplyCustomerData(
					waId,
					provider,
					cellIndices,
					customerDataSource
				);

				if (success) {
					resolved = true;
					setCustomerError(null);
					setCustomerLoading(false);
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
							// Intentional: we don't await this async operation
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
		[waId, customerColumns, customerDataSource, providerRef]
	);

	return { onDataProviderReady, customerLoading, customerError } as const;
}
