import type { GridCell } from "@glideapps/glide-data-grid";
import { useCallback, useMemo } from "react";
import type { DataProvider } from "../core/services/DataProvider";
import type { BaseColumnProps } from "../core/types";

export interface ValidationError {
	row: number;
	col: number;
	message: string;
	fieldName?: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

export interface ValidationOptions {
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
			value: any,
			cell: GridCell,
			row: number,
		) => { isValid: boolean; error?: string };
	}>;
}

/**
 * Generic validation hook for grid data
 */
export function useGridValidation(
	dataProviderRef: React.RefObject<DataProvider | null>,
	columns: BaseColumnProps[],
	options: ValidationOptions = {},
) {
	const {
		translateMessage = (msg) => msg,
		validateOnlyChanged = false,
		customValidators = [],
	} = options;

	// Create custom validator map for quick lookup
	const customValidatorMap = useMemo(() => {
		const map = new Map<string, (typeof customValidators)[0]["validator"]>();
		customValidators.forEach(({ columnId, validator }) => {
			map.set(columnId, validator);
		});
		return map;
	}, [customValidators]);

	/**
	 * Validate all cells in the grid
	 */
	const validateAllCells = useCallback((): ValidationResult => {
		if (!dataProviderRef.current) {
			return { isValid: true, errors: [] };
		}

		const editingState = dataProviderRef.current.getEditingState();
		const baseValidation = editingState.validateCells(columns);

		const errors: ValidationError[] = [];

		// Process base validation errors
		baseValidation.errors.forEach((err: any) => {
			const column = columns.find((col) => col.indexNumber === err.col);
			errors.push({
				row: err.row,
				col: err.col,
				message: translateMessage(err.message),
				fieldName: column?.name || column?.id,
			});
		});

		// Apply custom validators if provided
		// Note: Without access to EditingState internals, we validate all cells when custom validators are provided
		if (customValidators.length > 0 && columns.length > 0) {
			const numRows = editingState.getNumRows() + 100; // Buffer for potential added rows

			for (let row = 0; row < numRows; row++) {
				for (const column of columns) {
					const col = column.indexNumber;
					const cell = editingState.getCell(col, row);

					if (!cell) continue;

					const customValidator = customValidatorMap.get(
						column.id || column.name || "",
					);
					if (customValidator) {
						const cellValue =
							(cell as any).data || (cell as any).displayData || null;
						const validation = customValidator(cellValue, cell, row);

						if (!validation.isValid) {
							errors.push({
								row,
								col,
								message: translateMessage(
									validation.error || "Validation failed",
								),
								fieldName: column.name || column.id,
							});
						}
					}
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}, [
		dataProviderRef,
		columns,
		translateMessage,
		customValidatorMap,
		customValidators.length,
	]);

	/**
	 * Validate specific cells
	 */
	const validateCells = useCallback(
		(cells: Array<{ row: number; col: number }>): ValidationResult => {
			if (!dataProviderRef.current) {
				return { isValid: true, errors: [] };
			}

			const errors: ValidationError[] = [];
			const editingState = dataProviderRef.current.getEditingState();

			cells.forEach(({ row, col }) => {
				const column = columns.find((c) => c.indexNumber === col);
				if (!column) return;

				const cell = editingState.getCell(col, row);
				if (!cell) return;

				// Check if cell has validation error flag
				if ((cell as any).isMissingValue || (cell as any).validationError) {
					errors.push({
						row,
						col,
						message: translateMessage(
							(cell as any).validationError ||
								`${column.name || column.id || "Field"} is required`,
						),
						fieldName: column.name || column.id,
					});
				}

				// Apply custom validator if exists
				const customValidator = customValidatorMap.get(
					column.id || column.name || "",
				);
				if (customValidator) {
					const cellValue =
						(cell as any).data || (cell as any).displayData || null;
					const validation = customValidator(cellValue, cell, row);

					if (!validation.isValid) {
						errors.push({
							row,
							col,
							message: translateMessage(
								validation.error || "Validation failed",
							),
							fieldName: column.name || column.id,
						});
					}
				}
			});

			return {
				isValid: errors.length === 0,
				errors,
			};
		},
		[dataProviderRef, columns, translateMessage, customValidatorMap],
	);

	/**
	 * Check if there are unsaved changes
	 */
	const hasUnsavedChanges = useCallback((): boolean => {
		if (!dataProviderRef.current) return false;

		const editingState = dataProviderRef.current.getEditingState();
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
		if (!dataProviderRef.current) return;

		// Clear validation errors by resetting the data provider
		dataProviderRef.current.refresh();
	}, [dataProviderRef]);

	return {
		validateAllCells,
		validateCells,
		hasUnsavedChanges,
		getValidationState,
		clearValidationErrors,
	};
}
