import type { GridCell } from "@glideapps/glide-data-grid";
import { useCallback, useMemo } from "react";
import type { DataProvider } from "../core/services/data-provider";
import type { BaseColumnProps } from "../core/types";

// EditingState is not exported from glide-data-grid, use unknown type
// It has methods: getNumRows(), getCell(), validateCells(), hasChanges()
type EditingStateApi = {
	getNumRows: () => number;
	getCell: (col: number, row: number) => GridCell | undefined;
	validateCells: (columns: BaseColumnProps[]) => ValidationResult;
	hasChanges: () => boolean;
};

type DataProviderWithEditing = {
	getEditingState: () => EditingStateApi;
	refresh: () => void;
};

type ColumnWithIndex = BaseColumnProps & {
	indexNumber?: number;
	name?: string;
};

// Validation constants
const ADDED_ROWS_BUFFER = 100; // Buffer for potential added rows in validation

export type ValidationError = {
	row: number;
	col: number;
	message: string;
	fieldName?: string;
};

export type ValidationResult = {
	isValid: boolean;
	errors: ValidationError[];
};

export type ValidationOptions = {
	/**
	 * Custom message translator
	 */
	translateMessage?: (message: string) => string;

	/**
	 * Whether to validate only changed cells or all cells
	 */
	validateOnlyChanged?: boolean;

	/**
	 * Additional custom validators
	 */
	customValidators?: Array<{
		columnId: string;
		validator: (
			value: unknown,
			cell: GridCell,
			row: number
		) => { isValid: boolean; error?: string };
	}>;
};

/**
 * Generic validation hook for grid data
 */
export function useGridValidation(
	dataProviderRef: React.RefObject<DataProvider | null>,
	columns: BaseColumnProps[],
	options: ValidationOptions = {}
) {
	const {
		translateMessage = (msg) => msg,
		validateOnlyChanged: _validateOnlyChanged = false,
		customValidators = [],
	} = options;

	// Create custom validator map for quick lookup
	const customValidatorMap = useMemo(() => {
		const map = new Map<string, (typeof customValidators)[0]["validator"]>();
		for (const { columnId, validator } of customValidators) {
			map.set(columnId, validator);
		}
		return map;
	}, [customValidators]);

	// Helper to process base validation errors
	const getColumnAtIndex = useCallback(
		(cols: ColumnWithIndex[], colIdx: number) => {
			const byPosition = cols[colIdx];
			if (byPosition) {
				return byPosition;
			}
			return cols.find((c) => c.indexNumber === colIdx);
		},
		[]
	);

	const getColumnLabel = useCallback(
		(col?: ColumnWithIndex, fallback?: string) => {
			if (!col) {
				return fallback ?? "";
			}
			return (
				(col.name as string | undefined) ||
				col.title ||
				col.id ||
				fallback ||
				""
			);
		},
		[]
	);

	const processBaseValidationErrors = useCallback(
		(
			baseValidation: ValidationResult,
			cols: BaseColumnProps[],
			translate: (key: string) => string
		): ValidationError[] => {
			const typedCols = cols as ColumnWithIndex[];
			const errors: ValidationError[] = [];
			for (const err of baseValidation.errors) {
				const column = getColumnAtIndex(typedCols, err.col);
				errors.push({
					row: err.row,
					col: err.col,
					message: translate(err.message),
					fieldName: getColumnLabel(column, `Column ${err.col}`),
				});
			}
			return errors;
		},
		[getColumnAtIndex, getColumnLabel]
	);

	// Helper to validate custom validators for all cells
	const applyCustomValidationToAllCells = useCallback(
		(args: {
			editingState: EditingStateApi;
			columns: BaseColumnProps[];
			customValidatorMap: Map<
				string,
				(
					value: unknown,
					cell: GridCell,
					row: number
				) => { isValid: boolean; error?: string }
			>;
			customValidators: {
				columnId: string;
				validator: (
					value: unknown,
					cell: GridCell,
					row: number
				) => { isValid: boolean; error?: string };
			}[];
			translate: (key: string) => string;
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Validation logic requires multiple nested conditions
		}): ValidationError[] => {
			const cols = args.columns as ColumnWithIndex[];
			const errors: ValidationError[] = [];
			if (args.customValidators.length === 0 || cols.length === 0) {
				return errors;
			}

			const getCellValue = (cell: GridCell): unknown => {
				const gc = cell as GridCell & { data?: unknown; displayData?: unknown };
				return gc.data ?? gc.displayData ?? null;
			};

			const validateCell = (
				rowIndex: number,
				colIndex: number,
				column: ColumnWithIndex,
				cell: GridCell
			): ValidationError | undefined => {
				const validator = args.customValidatorMap.get(
					column.id || (column.name as string | undefined) || ""
				);
				if (!validator) {
					return;
				}
				const result = validator(getCellValue(cell), cell, rowIndex);
				if (result.isValid) {
					return;
				}
				return {
					row: rowIndex,
					col: colIndex,
					message: args.translate(result.error || "Validation failed"),
					fieldName: getColumnLabel(column),
				};
			};

			const totalRows = args.editingState.getNumRows() + ADDED_ROWS_BUFFER;
			for (let row = 0; row < totalRows; row++) {
				for (const column of cols) {
					const colIdx = column.indexNumber ?? cols.indexOf(column);
					const cell = args.editingState.getCell(colIdx, row);
					if (!cell) {
						continue;
					}
					const err = validateCell(row, colIdx, column, cell);
					if (err) {
						errors.push(err);
					}
				}
			}
			return errors;
		},
		[getColumnLabel]
	);

	/**
	 * Validate all cells in the grid
	 */
	const validateAllCells = useCallback((): ValidationResult => {
		if (!dataProviderRef.current) {
			return { isValid: true, errors: [] };
		}

		const editingState = (
			dataProviderRef.current as unknown as DataProviderWithEditing
		).getEditingState();
		const baseValidation = editingState.validateCells(columns);

		const baseErrors = processBaseValidationErrors(
			baseValidation,
			columns,
			translateMessage
		);
		const customErrors = applyCustomValidationToAllCells({
			editingState,
			columns,
			customValidatorMap,
			customValidators,
			translate: translateMessage,
		});

		const errors = [...baseErrors, ...customErrors];
		return {
			isValid: errors.length === 0,
			errors,
		};
	}, [
		dataProviderRef,
		columns,
		translateMessage,
		customValidatorMap,
		customValidators,
		applyCustomValidationToAllCells,
		processBaseValidationErrors,
	]);

	/**
	 * Validate specific cells
	 */
	const validateCells = useCallback(
		(cells: Array<{ row: number; col: number }>): ValidationResult => {
			if (!dataProviderRef.current) {
				return { isValid: true, errors: [] };
			}

			const editingState = (
				dataProviderRef.current as unknown as DataProviderWithEditing
			).getEditingState();
			const cols = columns as ColumnWithIndex[];

			const getCellValidationErrors = (
				row: number,
				col: number
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Cell validation requires multiple checks
			): ValidationError[] => {
				const errs: ValidationError[] = [];
				const column = getColumnAtIndex(cols, col);
				if (!column) {
					return errs;
				}

				const cell = editingState.getCell(col, row);
				if (!cell) {
					return errs;
				}

				const withFlags = cell as GridCell & {
					isMissingValue?: boolean;
					validationError?: string;
				};
				if (withFlags.isMissingValue || withFlags.validationError) {
					errs.push({
						row,
						col,
						message: translateMessage(
							withFlags.validationError ||
								`${getColumnLabel(column, "Field")} is required`
						),
						fieldName: getColumnLabel(column),
					});
				}

				const validator = customValidatorMap.get(
					column.id || (column.name as string | undefined) || ""
				);
				if (validator) {
					const gc = cell as GridCell & {
						data?: unknown;
						displayData?: unknown;
					};
					const val = gc.data ?? gc.displayData ?? null;
					const result = validator(val, cell, row);
					if (!result.isValid) {
						errs.push({
							row,
							col,
							message: translateMessage(result.error || "Validation failed"),
							fieldName: getColumnLabel(column),
						});
					}
				}
				return errs;
			};

			const allErrors = cells.flatMap(({ row, col }) =>
				getCellValidationErrors(row, col)
			);

			return {
				isValid: allErrors.length === 0,
				errors: allErrors,
			};
		},
		[
			dataProviderRef,
			columns,
			translateMessage,
			customValidatorMap,
			getColumnAtIndex,
			getColumnLabel,
		]
	);

	/**
	 * Check if there are unsaved changes
	 */
	const hasUnsavedChanges = useCallback((): boolean => {
		if (!dataProviderRef.current) {
			return false;
		}

		const editingState = (
			dataProviderRef.current as unknown as DataProviderWithEditing
		).getEditingState();
		return editingState.hasChanges();
	}, [dataProviderRef]);

	/**
	 * Get validation state for the grid
	 */
	const getValidationState = useCallback((): {
		hasChanges: boolean;
		isValid: boolean;
		errors: ValidationError[];
	} => {
		const hasChanges = hasUnsavedChanges();

		if (!hasChanges) {
			return { hasChanges: false, isValid: true, errors: [] };
		}

		const validation = validateAllCells();

		return {
			hasChanges,
			isValid: validation.isValid,
			errors: validation.errors,
		};
	}, [hasUnsavedChanges, validateAllCells]);

	/**
	 * Clear validation errors
	 */
	const clearValidationErrors = useCallback(() => {
		if (!dataProviderRef.current) {
			return;
		}

		// Clear validation errors by resetting the data provider
		(dataProviderRef.current as unknown as DataProviderWithEditing).refresh();
	}, [dataProviderRef]);

	return {
		validateAllCells,
		validateCells,
		hasUnsavedChanges,
		getValidationState,
		clearValidationErrors,
	};
}
