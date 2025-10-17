import type { ValidationResult } from "@widgets/data-table-editor/types";
import type React from "react";
import { useCallback, useMemo } from "react";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/data-provider";
import type { BaseColumnProps } from "@/shared/libs/data-grid/components/core/types";
import { useGridValidation } from "@/shared/libs/data-grid/components/hooks/use-grid-validation";

const DEFAULT_COLUMN_WIDTH = 150;

export function useDataTableValidation(
	dataProviderRef: React.RefObject<DataProvider | null>
) {
	// Build column list using the provider's true order and flags; fallback to sensible defaults
	const columns: BaseColumnProps[] = useMemo(() => {
		const provider = dataProviderRef.current as
			| (DataProvider & {
					getColumnCount?: () => number;
					getColumnDefinition?: (c: number) => IColumnDefinition;
			  })
			| null;
		try {
			const count = provider?.getColumnCount?.() ?? 0;
			if (count > 0 && provider?.getColumnDefinition) {
				const list: BaseColumnProps[] = [];
				for (let i = 0; i < count; i++) {
					const def = provider.getColumnDefinition(i) as IColumnDefinition;
					list.push({
						id: def?.id ?? def?.name ?? `col_${i}`,
						name: def?.name ?? def?.id ?? `col_${i}`,
						title: def?.title ?? def?.name ?? def?.id ?? `Column ${i}`,
						width: def?.width ?? DEFAULT_COLUMN_WIDTH,
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
				return list;
			}
		} catch {
			// Provider column retrieval failed; will use fallback columns
		}
		// Fallback order that mirrors getDataTableColumns
		const fallback = [
			{ name: "scheduled_time", required: true },
			{ name: "phone", required: true },
			{ name: "type", required: true },
			{ name: "name", required: true },
		];
		return fallback.map((c, i) => ({
			id: c.name,
			name: c.name,
			title: c.name,
			width: DEFAULT_COLUMN_WIDTH,
			isEditable: true,
			isHidden: false,
			isRequired: Boolean(c.required),
			isPinned: false,
			isIndex: false,
			indexNumber: i,
			contentAlignment: "left",
			columnTypeOptions: {},
		}));
	}, [dataProviderRef.current]);

	// Use the generic validation hook
	const {
		validateAllCells: baseValidateAllCells,
		getValidationState,
		hasUnsavedChanges,
	} = useGridValidation(dataProviderRef, columns, {
		validateOnlyChanged: false,
	});

	const validateAllCells = useCallback((): ValidationResult => {
		const result = baseValidateAllCells();

		// Post-process to suppress false-positive scheduled_time required errors
		// by checking the actual cell value via the provider (ensures default is applied).
		const provider = dataProviderRef.current as {
			getColumnDefinition?: (c: number) => {
				id?: string;
				name?: string;
				title?: string;
				defaultValue?: unknown;
			};
			getCell?: (c: number, r: number) => unknown;
		} | null;

		const filtered = (result.errors || [])
			.map((err: unknown) => {
				let fieldName = (err as { fieldName?: string })?.fieldName;
				if (!fieldName && provider?.getColumnDefinition) {
					try {
						const col = (err as { col?: number }).col ?? 0;
						const def = provider.getColumnDefinition(col) as
							| {
									id?: string;
									name?: string;
									title?: string;
									defaultValue?: unknown;
							  }
							| undefined;
						fieldName = def?.id || def?.name || def?.title;
					} catch {
						// Column definition retrieval failed; will use error as-is
					}
				}
				const errAsObj = err as Record<string, unknown> & {
					fieldName?: string;
				};
				return { ...errAsObj, fieldName };
			})
			.filter((err: unknown) => {
				const fn = String(
					(err as { fieldName?: string }).fieldName || ""
				).toLowerCase();
				if (fn !== "scheduled_time") {
					return true;
				}
				// Ensure the cell is realized; this will create a default cell if needed
				try {
					const col = (err as { col?: number }).col ?? 0;
					const row = (err as { row?: number }).row ?? 0;
					const cell = provider?.getCell?.(col, row) as
						| { data?: { kind?: string; date?: unknown } }
						| undefined;
					const hasDate = Boolean(
						cell &&
							(cell as { data?: { kind?: string; date?: unknown } }).data
								?.kind === "tempus-date-cell" &&
							(cell as { data?: { kind?: string; date?: unknown } }).data?.date
					);
					return !hasDate;
				} catch {
					return true;
				}
			});

		return {
			isValid: filtered.length === 0,
			errors: filtered.map((err: unknown) => {
				const errWithField = err as {
					fieldName?: string;
					row?: number;
					col?: number;
					message?: string;
				};
				return {
					row: errWithField.row ?? 0,
					col: errWithField.col ?? 0,
					message: errWithField.message ?? "",
					...(errWithField.fieldName
						? { fieldName: errWithField.fieldName }
						: {}),
				};
			}),
		};
	}, [baseValidateAllCells, dataProviderRef]);

	const checkEditingState = useCallback(() => {
		const state = getValidationState();

		if (!state.hasChanges) {
			return { hasChanges: false, isValid: false };
		}

		return { hasChanges: state.hasChanges, isValid: state.isValid };
	}, [getValidationState]);

	return {
		validateAllCells,
		checkEditingState,
		hasUnsavedChanges,
	};
}
