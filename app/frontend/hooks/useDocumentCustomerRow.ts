"use client";

import type { GridCell } from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InMemoryDataSource } from "@/components/glide_custom_cells/components/core/data-sources/InMemoryDataSource";
import type { IColumnDefinition } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/components/glide_custom_cells/components/core/services/DataProvider";
import { useCustomerData } from "@/lib/customer-data-context";
import { DEFAULT_DOCUMENT_WA_ID } from "@/lib/default-document";
import { stableStringify } from "@/lib/documents/scene-utils";
import { i18n } from "@/lib/i18n";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { normalizePhoneForStorage } from "@/lib/utils/phone-utils";

// Removed client-side customer cache to enforce WebSocket-only profile loading

export function useDocumentCustomerRow(
	selectedWaId: string | null | undefined,
	isLocalized: boolean,
) {
	const waId = (selectedWaId || "").trim();
	const [customerLoading, setCustomerLoading] = useState(false);
	const [customerError, setCustomerError] = useState<string | null>(null);
	const [customerDataSource, setCustomerDataSource] =
		useState<InMemoryDataSource | null>(null);
	const customerDataSourceRef = useRef<InMemoryDataSource | null>(null);
	const customerProviderRef = useRef<DataProvider | null>(null);
	const [isCustomerDataComplete, setIsCustomerDataComplete] =
		useState<boolean>(false);
	const [isUnlockReady, setIsUnlockReady] = useState<boolean>(false);
	const [validationErrors, setValidationErrors] = useState<
		Array<{ row: number; col: number; message: string; fieldName?: string }>
	>([]);
	const prevValidationErrorsRef = useRef<string>("[]");
	const hasLoadedCustomerOnceRef = useRef<boolean>(false);
	const saveCustomerDebouncedRef = useRef<number | null>(null);
	const isInitializingRef = useRef<boolean>(false);
	const { customers } = useCustomerData();
	// deprecated: previously used to force data-source resets
	// const resetTokenRef = useRef<number>(0);
	const customersRef = useRef(customers);
	const router = useRouter();
	const { setSelectedDocumentWaId } = useSidebarChatStore();
	const isNewCustomerModeRef = useRef<boolean>(false);
	// deprecated: no longer prefill entire rows; cells are updated incrementally
	// const prefillRowRef = useRef<unknown[] | null>(null);
	const skipInitialClearRef = useRef<boolean>(false);

	// pulseGrid no longer used; provider.refresh is called in-place where needed

	// Re-evaluate completeness/unlock when data source is applied (e.g., after refresh)
	useEffect(() => {
		(async () => {
			try {
				if (!customerDataSource) return;
				const row = (await customerDataSource.getRowData(0)) || [];
				const name = String((row[0] as unknown) ?? "").trim();
				const ageNum = Number((row[1] as unknown) ?? Number.NaN);
				const phone = String((row[2] as unknown) ?? "").trim();
				const hasValidAge =
					Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 120;
				const complete = Boolean(
					name.length > 0 && hasValidAge && phone.length > 0,
				);
				setIsUnlockReady(complete);
				setIsCustomerDataComplete(complete);
			} catch {}
		})();
	}, [customerDataSource]);

	useEffect(() => {
		customersRef.current = customers;
	}, [customers]);

	const customerColumns: IColumnDefinition[] = useMemo(() => {
		return [
			{
				id: "name",
				name: "name",
				title: i18n.getMessage("field_name", isLocalized),
				dataType: ColumnDataType.TEXT,
				isEditable: true,
				isRequired: true,
				width: 220,
			},
			{
				id: "age",
				name: "age",
				title: i18n.getMessage("field_age", isLocalized),
				dataType: ColumnDataType.NUMBER,
				isEditable: true,
				isRequired: true,
				width: 100,
				metadata: { useWheel: true },
				validationRules: [
					{ type: "min", value: 10 },
					{ type: "max", value: 120 },
				],
			},
			{
				id: "phone",
				name: "phone",
				title: i18n.getMessage("field_phone", isLocalized),
				dataType: ColumnDataType.PHONE,
				isEditable: true,
				isRequired: true,
				width: 320,
			},
		];
	}, [isLocalized]);

	// Determine if all required customer fields in row 0 are complete and valid
	const computeIsCustomerComplete = useCallback(
		(provider: DataProvider | null): boolean => {
			try {
				if (!provider) return false;
				const rowIndex = 0;
				const colCount = provider.getColumnCount?.() ?? 0;
				for (let c = 0; c < colCount; c++) {
					const colDef = provider.getColumnDefinition?.(c) as
						| IColumnDefinition
						| undefined;
					if (!colDef || colDef.isRequired !== true) continue;
					const cell: unknown = provider.getCell?.(c, rowIndex);
					if (!cell) return false;
					if (
						typeof cell === "object" &&
						cell !== null &&
						"isMissingValue" in (cell as Record<string, unknown>) &&
						Boolean((cell as { isMissingValue?: boolean }).isMissingValue) ===
							true &&
						// For PHONE, ignore strict validation flags and check presence only
						colDef.dataType !== ColumnDataType.PHONE
					)
						return false;
					switch (colDef.dataType) {
						case ColumnDataType.TEXT: {
							const v = (cell as { data?: unknown })?.data as unknown;
							if (!(typeof v === "string" && v.trim().length > 0)) return false;
							break;
						}
						case ColumnDataType.NUMBER: {
							const kind = (cell as { kind?: GridCellKind })?.kind;
							const raw = (cell as { data?: unknown })?.data as
								| { kind?: string; value?: unknown }
								| unknown;
							let num: number;
							if (
								kind === GridCellKind.Custom &&
								raw &&
								typeof raw === "object" &&
								(raw as { kind?: string }).kind === "age-wheel-cell"
							) {
								const val = Number(
									(raw as { value?: unknown }).value as unknown,
								);
								num = val;
							} else {
								const v = (cell as { data?: unknown })?.data as unknown;
								num =
									typeof v === "number" && Number.isFinite(v)
										? (v as number)
										: Number(v as unknown);
							}
							if (!Number.isFinite(num)) return false;
							const rules =
								(
									colDef as {
										validationRules?: Array<{ type: string; value?: number }>;
									}
								).validationRules || [];
							for (const r of rules) {
								if (
									r?.type === "min" &&
									r.value !== undefined &&
									num < Number(r.value)
								)
									return false;
								if (
									r?.type === "max" &&
									r.value !== undefined &&
									num > Number(r.value)
								)
									return false;
							}
							break;
						}
						case ColumnDataType.PHONE: {
							const kind = (cell as { kind?: GridCellKind })?.kind;
							const data = (
								cell as { data?: { kind?: string; value?: unknown } | unknown }
							)?.data as { kind?: string; value?: unknown } | unknown;
							let phoneStr = "";
							if (
								kind === GridCellKind.Custom &&
								(data as { kind?: string })?.kind === "phone-cell"
							) {
								phoneStr = String((data as { value?: unknown })?.value ?? "");
							} else {
								phoneStr = String((cell as { data?: unknown })?.data ?? "");
							}
							if (phoneStr.trim().length === 0) return false;
							break;
						}
						default:
							return false;
					}
				}
				return true;
			} catch {
				return false;
			}
		},
		[],
	);

	const computeValidationErrors = useCallback(
		(provider: DataProvider | null) => {
			try {
				if (!provider)
					return [] as Array<{
						row: number;
						col: number;
						message: string;
						fieldName?: string;
					}>;
				const editingState = provider.getEditingState?.();
				const colCount: number = provider.getColumnCount?.() ?? 0;
				const columns: Array<{
					id?: string;
					name?: string;
					title?: string;
					width?: number;
					isEditable?: boolean;
					isHidden?: boolean;
					isRequired?: boolean;
					isPinned?: boolean;
					isIndex?: boolean;
					indexNumber: number;
					contentAlignment?: string;
					defaultValue?: unknown;
					columnTypeOptions?: Record<string, unknown>;
				}> = [];
				for (let i = 0; i < colCount; i++) {
					const def = provider.getColumnDefinition?.(i) as
						| IColumnDefinition
						| undefined;
					columns.push({
						id: def?.id ?? def?.name ?? `col_${i}`,
						name: def?.name ?? def?.id ?? `col_${i}`,
						title: def?.title ?? def?.name ?? def?.id ?? `Column ${i}`,
						width: def?.width ?? 150,
						isEditable: def?.isEditable !== false,
						isHidden: def?.isHidden === true,
						isRequired: def?.isRequired === true,
						isPinned: def?.isPinned === true,
						isIndex: false,
						indexNumber: i,
						contentAlignment: "left",
						defaultValue: def?.defaultValue,
						columnTypeOptions: {},
					});
				}
				const base = (
					editingState && typeof editingState.validateCells === "function"
						? (
								editingState.validateCells as (columns: unknown) => {
									isValid: boolean;
									errors: Array<{ row: number; col: number; message: string }>;
								}
							)(columns as unknown)
						: undefined
				) as
					| {
							isValid: boolean;
							errors: Array<{ row: number; col: number; message: string }>;
					  }
					| undefined;
				const errs = (base?.errors || []).map((e) => {
					const col = columns[e.col];
					const fieldName = (col?.name ||
						col?.id ||
						col?.title ||
						`Column ${e.col}`) as string | undefined;
					return {
						row: e.row,
						col: e.col,
						message: e.message,
						...(fieldName ? { fieldName } : {}),
					};
				});
				return errs;
			} catch {
				return [] as Array<{
					row: number;
					col: number;
					message: string;
					fieldName?: string;
				}>;
			}
		},
		[],
	);

	const updateValidationState = useCallback(
		(provider: DataProvider) => {
			try {
				const complete = computeIsCustomerComplete(provider);
				setIsCustomerDataComplete((prev) =>
					prev !== complete ? complete : prev,
				);
				// Unlock strictly mirrors completeness (name + age valid + phone)
				setIsUnlockReady(complete);
				// Fallback: avoid unlocking based on raw data source; rely on provider state only
				// This prevents transient unlocks when age is not yet applied to the provider
				if (!complete && customerDataSource) {
					Promise.resolve(customerDataSource.getRowData(0))
						.then(() => {
							// Intentionally do not set isUnlockReady here
						})
						.catch(() => {});
				}
				const errs = computeValidationErrors(provider);
				const key = stableStringify(errs);
				if (key !== prevValidationErrorsRef.current) {
					prevValidationErrorsRef.current = key;
					setValidationErrors(errs);
				}
			} catch {}
		},
		[computeIsCustomerComplete, computeValidationErrors, customerDataSource],
	);

	const scheduleSaveCustomer = useCallback(() => {
		if (!customerProviderRef.current || !waId) return;
		// Do not schedule saves during initial load or before user interaction
		if (isInitializingRef.current || !hasLoadedCustomerOnceRef.current) return;
		if (saveCustomerDebouncedRef.current)
			window.clearTimeout(saveCustomerDebouncedRef.current);
		saveCustomerDebouncedRef.current = window.setTimeout(async () => {
			try {
				const provider = customerProviderRef.current;
				if (!provider) return;
				if (waId === DEFAULT_DOCUMENT_WA_ID) {
					setIsCustomerDataComplete(true);
					return;
				}
				// Only persist if customer row is complete to avoid premature PUTs
				const isCompleteNow = computeIsCustomerComplete(provider);
				if (!isCompleteNow) return;
				const readCell = (colIndex: number): unknown => {
					const cell = provider.getCell(colIndex, 0) as unknown;
					if (
						cell &&
						typeof cell === "object" &&
						"kind" in (cell as Record<string, unknown>) &&
						(cell as { kind?: GridCellKind }).kind === GridCellKind.Custom &&
						"data" in (cell as Record<string, unknown>) &&
						(cell as { data?: { kind?: string; value?: unknown } | unknown })
					) {
						const data = (cell as { data?: { kind?: string; value?: unknown } })
							.data as { kind?: string; value?: unknown };
						if (data?.kind === "phone-cell") {
							return String(data.value ?? "");
						}
						if (data?.kind === "age-wheel-cell") {
							return Number(data.value as unknown);
						}
						return (cell as { data?: unknown }).data ?? null;
					}
					return (cell as { data?: unknown })?.data ?? null;
				};
				const name = String(readCell(0) ?? "").trim();
				const ageValRaw = readCell(1);
				const ageParsed =
					ageValRaw === null || ageValRaw === undefined
						? null
						: Number(ageValRaw as unknown);
				const age =
					ageParsed !== null && Number.isFinite(ageParsed) && ageParsed >= 10
						? ageParsed
						: null;
				const phoneRaw = String(readCell(2) ?? "").trim();
				const normalizedPhone = normalizePhoneForStorage(phoneRaw);

				setIsCustomerDataComplete(computeIsCustomerComplete(provider));

				// If phone changed to a different waId, create/update under the new id and route
				if (
					normalizedPhone &&
					normalizedPhone !== waId &&
					name &&
					age !== null
				) {
					await fetch(`/api/customers/${encodeURIComponent(normalizedPhone)}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ name, age }),
					});
					try {
						setSelectedDocumentWaId(normalizedPhone);
						router.push("/documents");
					} catch {}
					return;
				}

				// Normal update for existing customer
				await fetch(`/api/customers/${encodeURIComponent(waId)}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, age }),
				});
			} catch {}
		}, 400);
	}, [waId, computeIsCustomerComplete, router, setSelectedDocumentWaId]);

	const onAddRowOverride = useCallback(() => {
		try {
			const provider = customerProviderRef.current as DataProvider;
			if (!provider) return;
			// Enter new-customer flow: clear grid and keep canvas locked by removing waId
			isNewCustomerModeRef.current = true;
			router.push("/documents");
			const colCount = provider.getColumnCount();
			for (let c = 0; c < colCount; c++) {
				const colDef = provider.getColumnDefinition(c);
				let value: unknown = null;
				switch (colDef.dataType) {
					case ColumnDataType.PHONE:
					case ColumnDataType.TEXT:
						value = "";
						break;
					case ColumnDataType.NUMBER:
						value = null;
						break;
					default:
						value = null;
				}
				const cell = provider.getCell(c, 0);
				const updated = { ...(cell as unknown as GridCell) };
				(updated as { data?: unknown; displayData?: unknown }).data =
					value as unknown;
				(updated as { data?: unknown; displayData?: unknown }).displayData =
					value as unknown;
				provider.setCell(c, 0, updated as unknown as GridCell);
			}
			setIsCustomerDataComplete(false);
		} catch {}
	}, [router]);

	const hasAutoCreatedRef = useRef<boolean>(false);
	const maybeCreateCustomerFromRow = useCallback(async () => {
		try {
			const provider = customerProviderRef.current;
			if (!provider) return;
			// Only attempt auto-create when starting a new customer or no waId is selected
			if (
				!(
					isNewCustomerModeRef.current ||
					!waId ||
					waId === DEFAULT_DOCUMENT_WA_ID
				)
			)
				return;
			const isComplete = computeIsCustomerComplete(provider);
			if (!isComplete) return;
			if (hasAutoCreatedRef.current) return;
			// Read cells
			const readCell = (colIndex: number): unknown => {
				const cell = provider.getCell(colIndex, 0) as unknown;
				if (
					cell &&
					typeof cell === "object" &&
					"kind" in (cell as Record<string, unknown>) &&
					(cell as { kind?: GridCellKind }).kind === GridCellKind.Custom &&
					"data" in (cell as Record<string, unknown>) &&
					(cell as { data?: { kind?: string; value?: unknown } | unknown })
				) {
					const data = (cell as { data?: { kind?: string; value?: unknown } })
						.data as { kind?: string; value?: unknown };
					if (data?.kind === "phone-cell") {
						return String(data.value ?? "");
					}
					if (data?.kind === "age-wheel-cell") {
						return Number(data.value as unknown);
					}
					return (cell as { data?: unknown }).data ?? null;
				}
				return (cell as { data?: unknown })?.data ?? null;
			};
			const name = String(readCell(0) ?? "").trim();
			const ageVal = readCell(1);
			const ageParsed =
				ageVal === null || ageVal === undefined
					? null
					: Number(ageVal as unknown);
			const age =
				ageParsed !== null && Number.isFinite(ageParsed) && ageParsed >= 10
					? ageParsed
					: null;
			const phone = String(readCell(2) ?? "").trim();
			if (!phone) return;
			const newWaId = normalizePhoneForStorage(phone);
			if (!newWaId) return;
			// If customer already exists, just route; else create then route
			try {
				const exists = (customersRef.current || []).some(
					(c) =>
						normalizePhoneForStorage(
							String(
								(c as { phone?: string; id?: string }).phone ||
									(c as { id?: string }).id ||
									"",
							),
						) === newWaId,
				);
				if (!exists) {
					await fetch(`/api/customers/${encodeURIComponent(newWaId)}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ name, age }),
					});
				}
			} catch {}
			hasAutoCreatedRef.current = true;
			isNewCustomerModeRef.current = false;
			setSelectedDocumentWaId(newWaId);
			router.push("/documents");
		} catch {}
	}, [computeIsCustomerComplete, router, waId, setSelectedDocumentWaId]);

	useEffect(() => {
		// reset the guard when waId changes away from empty/default
		hasAutoCreatedRef.current = false;
	}, []);

	// Handle selection from phone-cell combobox via custom event and navigate
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as
					| { phone?: string; customerName?: string }
					| undefined;
				const phone = String(detail?.phone || "");
				if (!phone) return;
				try {
					const helper = (
						window as unknown as {
							__docSaveHelper?: { saveIfDirty?: () => Promise<void> };
						}
					).__docSaveHelper;
					void helper?.saveIfDirty?.();
				} catch {}
				const normalized = normalizePhoneForStorage(phone);
				// Commit phone and name via provider.setCell to mimic onCellEdited and avoid grid remount
				try {
					const provider = customerProviderRef.current;
					if (provider) {
						const displayPhone = phone.startsWith("+")
							? phone
							: `+${normalizePhoneForStorage(phone)}`;
						// Find customer name from unified data if not provided
						let resolvedName = String(detail?.customerName || "").trim();
						if (!resolvedName) {
							try {
								const list = customersRef.current || [];
								const match = list.find(
									(c) =>
										normalizePhoneForStorage(
											String(
												(c as { phone?: string; id?: string }).phone ||
													(c as { id?: string }).id ||
													"",
											),
										) === normalized,
								);
								resolvedName = String(
									(match as { name?: string })?.name || "",
								).trim();
							} catch {}
						}
						// Phone cell
						const phoneCell = {
							kind: GridCellKind.Custom,
							data: { kind: "phone-cell", value: displayPhone },
							copyData: displayPhone,
							allowOverlay: true,
						} as unknown as GridCell;
						(
							provider as unknown as {
								setCell?: (c: number, r: number, v: GridCell) => void;
							}
						).setCell?.(2, 0, phoneCell);
						// Age cell (if available in age registry)
						try {
							const reg = (
								globalThis as unknown as {
									__customerAgeRegistry?: {
										hasAge?: (waId: string) => boolean;
										ageByWaId?: Map<string, number | null>;
									};
								}
							).__customerAgeRegistry;
							const hasAge = reg?.hasAge?.(normalized) === true;
							const ageMaybe = hasAge
								? (reg?.ageByWaId?.get(normalized) as number | null)
								: null;
							if (hasAge && typeof ageMaybe === "number") {
								const age = Number(ageMaybe);
								if (Number.isFinite(age) && age >= 10 && age <= 120) {
									const ageCell = {
										kind: GridCellKind.Custom,
										data: {
											kind: "age-wheel-cell",
											value: age,
											display: String(age),
											min: 10,
											max: 120,
										},
										copyData: String(age),
										allowOverlay: true,
									} as unknown as GridCell;
									(
										provider as unknown as {
											setCell?: (c: number, r: number, v: GridCell) => void;
										}
									).setCell?.(1, 0, ageCell);
								}
							} else {
								// No known age for this customer: explicitly clear to avoid carrying over stale age
								const emptyAgeCell = {
									kind: GridCellKind.Custom,
									data: {
										kind: "age-wheel-cell",
										value: null,
										display: "",
										min: 10,
										max: 120,
									},
									copyData: "",
									allowOverlay: true,
								} as unknown as GridCell;
								(
									provider as unknown as {
										setCell?: (c: number, r: number, v: GridCell) => void;
									}
								).setCell?.(1, 0, emptyAgeCell);
							}
						} catch {}
						// Name cell (only if we have a non-empty name)
						if (resolvedName) {
							const nameCell = {
								kind: GridCellKind.Text,
								data: resolvedName,
								displayData: resolvedName,
								allowOverlay: true,
							} as unknown as GridCell;
							(
								provider as unknown as {
									setCell?: (c: number, r: number, v: GridCell) => void;
								}
							).setCell?.(0, 0, nameCell);
						}
						// Targeted redraw of just phone, age, and name cells
						try {
							(
								window as unknown as {
									__docGridApi?: {
										updateCells?: (cells: { cell: [number, number] }[]) => void;
									};
								}
							).__docGridApi?.updateCells?.([
								{ cell: [2, 0] },
								{ cell: [1, 0] },
								{ cell: [0, 0] },
							]);
						} catch {}
						setIsCustomerDataComplete(false);
						// Ensure initial clear is skipped once if waId change follows
						skipInitialClearRef.current = true;
					}
				} catch {}
				// Immediately select document locally to clear grid and start load
				try {
					isNewCustomerModeRef.current = false;
					setSelectedDocumentWaId(normalized);
					router.push("/documents");
				} catch {}
				if (normalized === DEFAULT_DOCUMENT_WA_ID) {
					return;
				}
				try {
					const exists = (customersRef.current || []).some((c) => {
						const idOrPhone = String(
							(c as { phone?: string; id?: string }).phone ||
								(c as { id?: string }).id ||
								"",
						);
						return normalizePhoneForStorage(idOrPhone) === normalized;
					});
					if (exists) {
						isNewCustomerModeRef.current = false;
						return;
					}
				} catch {}
				void fetch(`/api/customers/${encodeURIComponent(normalized)}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: detail?.customerName || undefined,
						phone,
					}),
				})
					.then(() => {
						try {
							isNewCustomerModeRef.current = false;
						} catch {}
					})
					.catch(() => {});
			} catch {}
		};
		window.addEventListener(
			"documents:customerSelected",
			handler as EventListener,
		);
		return () =>
			window.removeEventListener(
				"documents:customerSelected",
				handler as EventListener,
			);
	}, [router, setSelectedDocumentWaId]);

	// Load customer row when waId changes (WebSocket-only; keep grid instance; show Loading cells)
	useEffect(() => {
		// Ensure a stable data source exists once
		if (!customerDataSourceRef.current) {
			const ds = new InMemoryDataSource(
				1,
				customerColumns.length,
				customerColumns,
				[["", null, ""]],
			);
			customerDataSourceRef.current = ds;
			setCustomerDataSource(ds);
		}

		if (!waId) {
			setIsCustomerDataComplete(false);
			setCustomerLoading(false);
			setCustomerError(null);
			return;
		}

		if (waId === DEFAULT_DOCUMENT_WA_ID) {
			try {
				const provider = customerProviderRef.current as
					| (DataProvider & { refresh?: () => Promise<void> | void })
					| null;
				if (provider) {
					const nameCell = {
						kind: GridCellKind.Text,
						data: i18n.getMessage("default_contact", isLocalized),
						displayData: i18n.getMessage("default_contact", isLocalized),
						allowOverlay: true,
					} as unknown as GridCell;
					provider.setCell?.(0, 0, nameCell);
					const ageCell = {
						kind: GridCellKind.Custom,
						data: {
							kind: "age-wheel-cell",
							value: null,
							display: "",
							min: 10,
							max: 120,
						},
						copyData: "",
						allowOverlay: true,
					} as unknown as GridCell;
					provider.setCell?.(1, 0, ageCell);
					const phoneCell = {
						kind: GridCellKind.Custom,
						data: { kind: "phone-cell", value: "+0000000000000" },
						copyData: "+0000000000000",
						allowOverlay: true,
					} as unknown as GridCell;
					provider.setCell?.(2, 0, phoneCell);
					provider.refresh?.();
				}
			} catch {}
			setIsCustomerDataComplete(true);
			setCustomerLoading(false);
			setCustomerError(null);
			return;
		}

		setIsCustomerDataComplete(false);
		setIsUnlockReady(false);
		setCustomerLoading(true);
		setCustomerError(null);

		// CRITICAL: Clear name and age cells, then set phone, to avoid showing stale data
		try {
			const provider = customerProviderRef.current as
				| (DataProvider & { refresh?: () => Promise<void> | void })
				| null;
			if (provider) {
				// Clear name cell
				const emptyNameCell = {
					kind: GridCellKind.Text,
					data: "",
					displayData: "",
					allowOverlay: true,
				} as unknown as GridCell;
				provider.setCell?.(0, 0, emptyNameCell);

				// Clear age cell
				const emptyAgeCell = {
					kind: GridCellKind.Custom,
					data: {
						kind: "age-wheel-cell",
						value: null,
						display: "",
						min: 10,
						max: 120,
					},
					copyData: "",
					allowOverlay: true,
				} as unknown as GridCell;
				provider.setCell?.(1, 0, emptyAgeCell);

				// Set phone cell
				const displayPhone = waId.startsWith("+") ? waId : `+${waId}`;
				const phoneCell = {
					kind: GridCellKind.Custom,
					data: { kind: "phone-cell", value: displayPhone },
					copyData: displayPhone,
					allowOverlay: true,
				} as unknown as GridCell;
				provider.setCell?.(2, 0, phoneCell);

				// Update all three cells at once
				try {
					(
						window as unknown as {
							__docGridApi?: {
								updateCells?: (cells: { cell: [number, number] }[]) => void;
							};
						}
					).__docGridApi?.updateCells?.([
						{ cell: [0, 0] },
						{ cell: [1, 0] },
						{ cell: [2, 0] },
					]);
				} catch {}
				provider.refresh?.();
			}
		} catch {}

		const applyCustomer = (
			payload: { name?: string | null; age?: number | null } | null,
		) => {
			// Respect DB only: if no age in DB, keep it empty (null)
			const ageNum = Number(
				(payload?.age as unknown) !== undefined &&
					(payload?.age as unknown) !== null
					? (payload?.age as unknown)
					: Number.NaN,
			);
			const normalizedAge =
				Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 120
					? ageNum
					: null;

			const provider = customerProviderRef.current;
			if (provider) {
				const updates: Array<{ cell: [number, number] }> = [];
				const incomingName = String(payload?.name || "").trim();
				if (incomingName) {
					const nameCell = {
						kind: GridCellKind.Text,
						data: incomingName,
						displayData: incomingName,
						allowOverlay: true,
					} as unknown as GridCell;
					(
						provider as unknown as {
							setCell?: (c: number, r: number, v: GridCell) => void;
						}
					).setCell?.(0, 0, nameCell);
					updates.push({ cell: [0, 0] });
				}
				if (normalizedAge !== null) {
					const ageCell = {
						kind: GridCellKind.Custom,
						data: {
							kind: "age-wheel-cell",
							value: normalizedAge,
							display: String(normalizedAge),
							min: 10,
							max: 120,
						},
						copyData: String(normalizedAge),
						allowOverlay: true,
					} as unknown as GridCell;
					(
						provider as unknown as {
							setCell?: (c: number, r: number, v: GridCell) => void;
						}
					).setCell?.(1, 0, ageCell);
					updates.push({ cell: [1, 0] });
				} else {
					// Explicitly clear age when DB has none
					const emptyAgeCell = {
						kind: GridCellKind.Custom,
						data: {
							kind: "age-wheel-cell",
							value: null,
							display: "",
							min: 10,
							max: 120,
						},
						copyData: "",
						allowOverlay: true,
					} as unknown as GridCell;
					(
						provider as unknown as {
							setCell?: (c: number, r: number, v: GridCell) => void;
						}
					).setCell?.(1, 0, emptyAgeCell);
					updates.push({ cell: [1, 0] });
				}
				const displayPhone = waId.startsWith("+") ? waId : `+${waId}`;
				const phoneCell = {
					kind: GridCellKind.Custom,
					data: { kind: "phone-cell", value: displayPhone },
					copyData: displayPhone,
					allowOverlay: true,
				} as unknown as GridCell;
				(
					provider as unknown as {
						setCell?: (c: number, r: number, v: GridCell) => void;
					}
				).setCell?.(2, 0, phoneCell);
				updates.push({ cell: [2, 0] });

				try {
					(
						window as unknown as {
							__docGridApi?: {
								updateCells?: (cells: { cell: [number, number] }[]) => void;
							};
						}
					).__docGridApi?.updateCells?.(updates);
				} catch {}
			}

			const complete = Boolean(
				String(payload?.name || "").trim().length > 0 &&
					normalizedAge !== null &&
					String(waId).trim().length > 0,
			);
			setIsUnlockReady(complete);
			setIsCustomerDataComplete(complete);
		};

		const onWsProfile = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| { wa_id?: string; name?: string | null; age?: number | null }
					| undefined;
				const docWaId = String(detail?.wa_id || "");
				if (!docWaId || docWaId !== waId) return;
				const payload = {
					name: detail?.name ?? null,
					age: detail?.age ?? null,
				};
				applyCustomer(payload);
				setCustomerLoading(false);
			} catch {}
		};
		window.addEventListener(
			"documents:customerProfile",
			onWsProfile as EventListener,
		);
		try {
			const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
				.__wsConnection;
			if (wsRef?.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(
					JSON.stringify({ type: "get_customer", data: { wa_id: waId } }),
				);
			}
		} catch {}

		return () => {
			window.removeEventListener(
				"documents:customerProfile",
				onWsProfile as EventListener,
			);
		};
	}, [waId, customerColumns, isLocalized]);

	const onDataProviderReady = useCallback(
		(provider: unknown) => {
			customerProviderRef.current = provider as DataProvider;
			try {
				(provider as DataProvider).getEditingState().onChange(() => {
					// Ignore edits during initialization/normalization
					if (isInitializingRef.current) return;
					// Mark that user interacted with the grid at least once
					hasLoadedCustomerOnceRef.current = true;
					// Update validation state for completeness indicator
					try {
						updateValidationState(provider as DataProvider);
					} catch {}
					// Schedule save only after interaction and when complete for existing waId
					scheduleSaveCustomer();
					// For new-customer flow (or no waId), auto-create when row becomes complete
					maybeCreateCustomerFromRow().catch(() => {});
				});
				// Recompute completeness/unlock when async cell data is loaded into provider cache
				try {
					(provider as DataProvider).setOnCellDataLoaded?.(() => {
						try {
							updateValidationState(provider as DataProvider);
						} catch {}
					});
				} catch {}
			} catch {}

			setTimeout(() => {
				try {
					isInitializingRef.current = true;
					const dp = provider as DataProvider;
					const rowCount = dp.getRowCount();
					const colCount = dp.getColumnCount();
					for (let r = 0; r < rowCount; r++) {
						for (let c = 0; c < colCount; c++) {
							const currentCell = dp.getCell(c, r);
							if (currentCell && "data" in currentCell) {
								const cellData = (currentCell as { data?: unknown }).data;
								if (
									cellData !== undefined &&
									cellData !== null &&
									cellData !== ""
								) {
									dp.setCell(c, r, currentCell);
								}
							}
						}
					}
					updateValidationState(dp);
					isInitializingRef.current = false;
				} catch {}
			}, 100);
		},
		[updateValidationState, scheduleSaveCustomer, maybeCreateCustomerFromRow],
	);

	return {
		customerColumns,
		customerDataSource,
		customerLoading,
		customerError,
		validationErrors,
		onAddRowOverride,
		onDataProviderReady,
		isCustomerDataComplete,
		isUnlockReady,
	};
}
