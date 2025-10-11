/**
 * Based on Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
 * Adapted for use in this project
 */

import { type GridCell, GridCellKind, type Theme } from "@glideapps/glide-data-grid";
import type { IColumnDefinition } from "../core/interfaces/IDataSource";
import { ColumnTypeRegistry } from "../core/services/ColumnTypeRegistry";
import type { BaseColumnProps } from "../core/types";
import { isNullOrUndefined, notNullOrUndefined } from "../utils/generalUtils";
import { messages } from "../utils/i18n";

const INDEX_IDENTIFIER = "_index";

export function getColumnName(column: BaseColumnProps): string {
	return column.isIndex ? INDEX_IDENTIFIER : isNullOrUndefined(column.name) ? "" : column.name;
}

export function isMissingValueCell(cell: GridCell): boolean {
	const cellData = (cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }).data;
	const displayData = (cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }).displayData;

	// Check if cell has the isMissingValue flag
	if ((cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }).isMissingValue === true) {
		console.log("🚨 isMissingValueCell: cell has isMissingValue flag set to true");
		return true;
	}

	// For custom cells, check the data property more thoroughly
	if (cell.kind === GridCellKind.Custom) {
		const customData = (cell as { data?: unknown; displayData?: string; isMissingValue?: boolean }).data as
			| {
					kind?: string;
					date?: Date;
					value?: string;
					time?: Date;
			  }
			| undefined;
		if (customData?.kind === "tempus-date-cell") {
			const dateData = customData as { date?: Date };
			const isMissing = !dateData.date;
			console.log("🔍 isMissingValueCell tempus-date-cell:", {
				date: dateData.date,
				isMissing,
			});
			return isMissing;
		}
		if (customData?.kind === "dropdown-cell") {
			const dropdownData = customData as { value?: string };
			const isMissing = !dropdownData.value || dropdownData.value === "";
			console.log("🔍 isMissingValueCell dropdown-cell:", {
				value: dropdownData.value,
				isMissing,
			});
			return isMissing;
		}
		// Phone cells store phone under data.value; displayData may be undefined.
		if (customData?.kind === "phone-cell") {
			const phoneData = customData as { value?: string };
			const v = (phoneData.value ?? "").trim();
			const isMissing = v.length === 0;
			console.log("🔍 isMissingValueCell phone-cell:", {
				value: phoneData.value,
				isMissing,
			});
			return isMissing;
		}
		if (customData?.kind === "timekeeper-cell") {
			const timekeeperData = customData as { time?: Date };
			const isMissing = !timekeeperData.time;
			console.log("🔍 isMissingValueCell timekeeper-cell:", {
				time: timekeeperData.time,
				isMissing,
			});
			return isMissing;
		}
	}

	const isMissing =
		isNullOrUndefined(cellData) || cellData === "" || isNullOrUndefined(displayData) || displayData === "";

	console.log("🔍 isMissingValueCell default check:", {
		cellData,
		displayData,
		isMissing,
		cellKind: cell.kind,
	});

	return isMissing;
}

export class EditingState {
	private editedCells: Map<number, Map<number, GridCell>> = new Map();
	private addedRows: Array<Map<number, GridCell>> = [];
	private deletedRows: number[] = [];
	private numRows: number;
	private columnTypeRegistry: ColumnTypeRegistry;
	private theme: Partial<Theme>;
	private isDarkTheme: boolean;
	private columnDefinitions: Map<number, IColumnDefinition> = new Map();
	private onChangeCallbacks: Set<() => void> = new Set();
	// Track original cell values to detect real changes
	private originalCells: Map<number, Map<number, unknown>> = new Map();

	constructor(numRows: number, theme?: Partial<Theme>, isDarkTheme?: boolean) {
		this.numRows = numRows;
		this.theme = theme || {};
		this.isDarkTheme = isDarkTheme || false;
		this.columnTypeRegistry = ColumnTypeRegistry.getInstance();
	}

	setColumnDefinitions(definitions: IColumnDefinition[]): void {
		this.columnDefinitions.clear();
		definitions.forEach((def, index) => {
			this.columnDefinitions.set(index, def);
		});
	}

	toJson(columns: BaseColumnProps[]): string {
		const columnsByIndex = new Map<number, BaseColumnProps>();
		columns.forEach((column) => {
			columnsByIndex.set(column.indexNumber, column);
		});

		const currentState = {
			// We use snake case here since this is the widget state
			// that is sent and used in the backend. Therefore, it should
			// conform with the Python naming conventions.
			edited_rows: {} as Record<number, Record<string, unknown>>,
			added_rows: [] as Record<string, unknown>[],
			deleted_rows: [] as number[],
		};

		// Loop through all edited cells and transform into the structure
		// we use for the JSON-compatible widget state:
		// row position -> column name -> edited value
		this.editedCells.forEach((row: Map<number, GridCell>, rowIndex: number) => {
			const editedRow: Record<string, unknown> = {};
			let hasOriginalData = false;

			row.forEach((cell: GridCell, colIndex: number) => {
				const column = columnsByIndex.get(colIndex);
				if (column) {
					const cellValue = this.getCellValue(cell, column);
					const originalValue = this.getOriginalCellValue(rowIndex, colIndex);

					// Check if this cell originally had meaningful data
					// Treat phone country code prefixes as empty (they're just defaults)
					const isPhonePrefix = typeof originalValue === "string" && /^\+\d{1,4}\s*$/.test(originalValue.trim());

					if (originalValue != null && originalValue !== "" && !isPhonePrefix) {
						hasOriginalData = true;
					}

					// Only include if value is different from original
					const isDifferent = !this.areValuesEqual(cellValue, originalValue);

					// Only include the cell if it has a value and is different from original
					if (isDifferent && notNullOrUndefined(cellValue) && cellValue !== "") {
						editedRow[getColumnName(column)] = cellValue;
					}
				}
			});

			// Only add the row if it has at least one edited cell
			if (Object.keys(editedRow).length > 0) {
				// If the row originally had no data, treat it as an addition instead of edit
				if (!hasOriginalData) {
					// For moved rows, we need ALL cell values, not just changed ones
					const completeRow: Record<string, unknown> = {};
					// Iterate over ALL columns, not just edited cells
					columnsByIndex.forEach((column, colIndex) => {
						// Get current cell value (either edited or original)
						const currentCell = row.get(colIndex);
						let cellValue: unknown;

						if (currentCell) {
							// Use edited cell value
							cellValue = this.getCellValue(currentCell, column);
						} else {
							// Use original cell value
							cellValue = this.getOriginalCellValue(rowIndex, colIndex);
						}

						// Include ALL cell values for moved rows, even if they match defaults
						if (notNullOrUndefined(cellValue)) {
							completeRow[column.id || column.name || `col_${colIndex}`] = cellValue;
						}
					});

					console.log(`🔄 Complete row data for moved row ${rowIndex}:`, completeRow);
					currentState.added_rows.push(completeRow);
				} else {
					currentState.edited_rows[rowIndex] = editedRow;
				}
			}
		});

		// Loop through all added rows and transform into the format that
		// we use for the JSON-compatible widget state:
		// List of column name -> edited value
		this.addedRows.forEach((row: Map<number, GridCell>) => {
			const addedRow: Record<string, unknown> = {};
			// This flag is used to check if the row is incomplete
			// (i.e. missing required values) and should therefore not be included in
			// the current state version.
			let isIncomplete = false;

			row.forEach((cell: GridCell, colIndex: number) => {
				const column = columnsByIndex.get(colIndex);
				if (column) {
					const cellValue = this.getCellValue(cell, column);
					const colDef = this.columnDefinitions.get(colIndex);
					const isMissing = isMissingValueCell(cell);

					if (colDef?.isRequired && colDef?.isEditable !== false && isMissing) {
						// If the cell is missing a required value, the row is incomplete
						isIncomplete = true;
					}

					if (notNullOrUndefined(cellValue) && cellValue !== "") {
						addedRow[getColumnName(column)] = cellValue;
					}
				}
			});

			if (!isIncomplete) {
				currentState.added_rows.push(addedRow);
			}
		});

		// The deleted rows don't need to be transformed
		currentState.deleted_rows = this.deletedRows;

		// Convert undefined values to null, otherwise this is removed here since
		// undefined does not exist in JSON.
		return JSON.stringify(currentState, (_k, v) => (v === undefined ? null : v));
	}

	fromJson(editingStateJson: string, columns: BaseColumnProps[]): void {
		this.editedCells = new Map();
		this.addedRows = [];
		this.deletedRows = [];

		const editingState = JSON.parse(editingStateJson);

		const columnsByName = new Map<string, BaseColumnProps>();
		columns.forEach((column) => {
			columnsByName.set(getColumnName(column), column);
		});

		Object.keys(editingState.edited_rows || {}).forEach((key) => {
			const rowIndex = Number(key);
			const editedRow = editingState.edited_rows[key];
			Object.keys(editedRow).forEach((colName: string) => {
				const cellValue = editedRow[colName];
				const column = columnsByName.get(colName);
				if (column) {
					const colDef = this.columnDefinitions.get(column.indexNumber);
					if (colDef) {
						const cell = this.createCellFromDefinition(cellValue, colDef);
						if (cell) {
							if (!this.editedCells.has(rowIndex)) {
								this.editedCells.set(rowIndex, new Map());
							}
							this.editedCells.get(rowIndex)?.set(column.indexNumber, cell);
						}
					}
				}
			});
		});

		(editingState.added_rows || []).forEach((row: Record<string, unknown>) => {
			const addedRow: Map<number, GridCell> = new Map();

			columns.forEach((column) => {
				const colDef = this.columnDefinitions.get(column.indexNumber);
				if (colDef) {
					const cell = this.createCellFromDefinition(null, colDef);
					if (cell) {
						addedRow.set(column.indexNumber, cell);
					}
				}
			});

			Object.keys(row).forEach((colName) => {
				const column = columnsByName.get(colName);
				if (column) {
					const colDef = this.columnDefinitions.get(column.indexNumber);
					if (colDef) {
						const cell = this.createCellFromDefinition(row[colName], colDef);
						if (cell) {
							addedRow.set(column.indexNumber, cell);
						}
					}
				}
			});

			this.addedRows.push(addedRow);
		});

		this.deletedRows = editingState.deleted_rows || [];
	}

	isAddedRow(row: number): boolean {
		return row >= this.numRows;
	}

	getCell(col: number, row: number): GridCell | undefined {
		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.numRows;
			return this.addedRows[addedRowIndex]?.get(col);
		}
		return this.editedCells.get(row)?.get(col);
	}

	setCell(col: number, row: number, cell: GridCell): void {
		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.numRows;
			if (addedRowIndex >= this.addedRows.length || !this.addedRows[addedRowIndex]) {
				return;
			}
			this.addedRows[addedRowIndex].set(col, cell);
		} else {
			// Get the cell value
			const cellValue = this.getCellValueForComparison(cell, col);

			// Check if this matches the original value
			const originalValue = this.getOriginalCellValue(row, col);
			const hasOriginalValue = originalValue !== undefined;
			const matchesOriginal = hasOriginalValue && this.areValuesEqual(cellValue, originalValue);

			if (matchesOriginal) {
				// Value was reverted to original - remove from edited cells
				if (this.editedCells.has(row)) {
					this.editedCells.get(row)?.delete(col);
					// If no more edited cells in this row, remove the row
					if (this.editedCells.get(row)?.size === 0) {
						this.editedCells.delete(row);
					}
				}
			} else {
				// Value is different from original - track as edited
				if (!this.editedCells.has(row)) {
					this.editedCells.set(row, new Map());
				}
				this.editedCells.get(row)?.set(col, cell);
			}
		}
		// Trigger onChange callbacks after setting the cell
		this.triggerOnChange();
	}

	addRow(rowCells: Map<number, GridCell>): void {
		this.addedRows.push(rowCells);
		// Trigger onChange callbacks after adding row
		this.triggerOnChange();
	}

	deleteRows(rows: number[]): void {
		rows
			.sort((a, b) => b - a)
			.forEach((row) => {
				this.deleteRow(row);
			});
	}

	deleteRow(row: number): void {
		if (isNullOrUndefined(row) || row < 0) {
			return;
		}

		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.numRows;
			this.addedRows.splice(addedRowIndex, 1);
			// Trigger onChange callbacks after deleting row
			this.triggerOnChange();
			return;
		}

		if (!this.deletedRows.includes(row)) {
			this.deletedRows.push(row);
			this.deletedRows = this.deletedRows.sort((a, b) => a - b);
		}

		this.editedCells.delete(row);
		// Trigger onChange callbacks after deleting row
		this.triggerOnChange();
	}

	getOriginalRowIndex(row: number): number {
		if (this.isAddedRow(row)) {
			return -1;
		}

		let originalIndex = row;
		for (let i = 0; i < this.deletedRows.length; i++) {
			const deletedRow = this.deletedRows[i];
			if (deletedRow !== undefined && deletedRow > originalIndex) {
				break;
			}
			originalIndex += 1;
		}

		return originalIndex;
	}

	getNumRows(): number {
		return this.numRows + this.addedRows.length - this.deletedRows.length;
	}

	clearMemory(): void {
		this.editedCells.clear();
		this.addedRows = [];
		this.deletedRows = [];
		this.originalCells.clear();
		// Trigger onChange callbacks after clearing memory
		this.triggerOnChange();
	}

	getMemoryUsage(): {
		editedCells: number;
		addedRows: number;
		deletedRows: number;
	} {
		return {
			editedCells: this.editedCells.size,
			addedRows: this.addedRows.length,
			deletedRows: this.deletedRows.length,
		};
	}

	/**
	 * Check if there are any changes in the editing state
	 */
	hasChanges(): boolean {
		// Check deleted rows
		if (this.deletedRows.length > 0) {
			return true;
		}

		// Check added rows
		if (this.addedRows.length > 0) {
			return true;
		}

		// Check edited cells - need to verify they're actually different from originals
		for (const [rowIndex, row] of this.editedCells) {
			for (const [colIndex, cell] of row) {
				const cellValue = this.getCellValueForComparison(cell, colIndex);
				const originalValue = this.getOriginalCellValue(rowIndex, colIndex);

				if (!this.areValuesEqual(cellValue, originalValue)) {
					return true; // Found at least one real change
				}
			}
		}

		return false;
	}

	/**
	 * Validate all cells and return validation state
	 */
	validateCells(columns: BaseColumnProps[]): {
		isValid: boolean;
		errors: Array<{ row: number; col: number; message: string }>;
	} {
		const errors: Array<{ row: number; col: number; message: string }> = [];
		const columnsByIndex = new Map<number, BaseColumnProps>();
		columns.forEach((column) => {
			columnsByIndex.set(column.indexNumber, column);
		});

		// Validate edited cells
		this.editedCells.forEach((row: Map<number, GridCell>, rowIndex: number) => {
			row.forEach((cell: GridCell, colIndex: number) => {
				const column = columnsByIndex.get(colIndex);
				const colDef = this.columnDefinitions.get(colIndex);

				if (column && colDef) {
					// Check if the cell has validation error information
					const cellWithValidation = cell as GridCell & {
						isMissingValue?: boolean;
						validationError?: string | undefined;
					};

					if (cellWithValidation.isMissingValue === true) {
						// Use specific validation error message if available, otherwise use generic required message
						const errorMessage =
							cellWithValidation.validationError ||
							messages.validation.required(column.title || column.name || "Field");

						errors.push({
							row: rowIndex,
							col: colIndex,
							message: errorMessage,
						});
						return; // Skip further validation for this cell
					}

					// Get the cell value
					const cellValue = this.getCellValue(cell, column);

					// Check required fields by looking at the actual value
					if (colDef.isRequired && colDef.isEditable !== false) {
						// Check if value is empty/null/undefined
						if (
							cellValue === null ||
							cellValue === undefined ||
							cellValue === "" ||
							(typeof cellValue === "string" && cellValue.trim() === "")
						) {
							errors.push({
								row: rowIndex,
								col: colIndex,
								message: messages.validation.required(column.title || column.name || "Field"),
							});
							return; // Skip further validation
						}
					}

					// Additional validation for specific column types
					const columnType = this.columnTypeRegistry.get(colDef.dataType);
					if (columnType?.validateValue) {
						const validation = columnType.validateValue(cellValue, colDef);
						if (!validation.isValid) {
							errors.push({
								row: rowIndex,
								col: colIndex,
								message: validation.error || "Invalid value",
							});
						}
					}
				}
			});
		});

		// Validate added rows
		this.addedRows.forEach((row: Map<number, GridCell>, addedRowIndex: number) => {
			const rowIndex = this.numRows + addedRowIndex;

			row.forEach((cell: GridCell, colIndex: number) => {
				const column = columnsByIndex.get(colIndex);
				const colDef = this.columnDefinitions.get(colIndex);

				if (column && colDef) {
					// Check if the cell has validation error information
					const cellWithValidation = cell as GridCell & {
						isMissingValue?: boolean;
						validationError?: string | undefined;
					};

					if (cellWithValidation.isMissingValue === true) {
						// Use specific validation error message if available, otherwise use generic required message
						const errorMessage =
							cellWithValidation.validationError ||
							messages.validation.required(column.title || column.name || "Field");

						errors.push({
							row: rowIndex,
							col: colIndex,
							message: errorMessage,
						});
						return; // Skip further validation for this cell
					}

					// Get the cell value
					const cellValue = this.getCellValue(cell, column);

					// Check required fields by looking at the actual value
					if (colDef.isRequired && colDef.isEditable !== false) {
						// Check if value is empty/null/undefined
						if (
							cellValue === null ||
							cellValue === undefined ||
							cellValue === "" ||
							(typeof cellValue === "string" && cellValue.trim() === "")
						) {
							errors.push({
								row: rowIndex,
								col: colIndex,
								message: messages.validation.required(column.title || column.name || "Field"),
							});
							return; // Skip further validation
						}
					}

					// Additional validation for specific column types
					const columnType = this.columnTypeRegistry.get(colDef.dataType);
					if (columnType?.validateValue) {
						const validation = columnType.validateValue(cellValue, colDef);
						if (!validation.isValid) {
							errors.push({
								row: rowIndex,
								col: colIndex,
								message: validation.error || "Invalid value",
							});
						}
					}
				}
			});
		});

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private getCellValue(cell: GridCell, column: BaseColumnProps): unknown {
		const colDef = this.columnDefinitions.get(column.indexNumber);
		if (!colDef) {
			return (cell as { data?: unknown }).data;
		}

		const columnType = this.columnTypeRegistry.get(colDef.dataType);
		if (columnType) {
			return columnType.getCellValue(cell);
		}

		// Fallback for unknown types
		if (cell.kind === GridCellKind.Text) {
			return (cell as { data?: unknown }).data;
		}
		if (cell.kind === GridCellKind.Number) {
			return (cell as { data?: unknown }).data;
		}
		if (cell.kind === GridCellKind.Boolean) {
			return (cell as { data?: unknown }).data;
		}
		if (cell.kind === GridCellKind.Custom) {
			const customCell = cell as {
				data?: {
					kind?: string;
					value?: unknown;
					date?: unknown;
				};
			};
			if (customCell.data?.kind === "dropdown-cell") {
				return customCell.data.value;
			}
			if (customCell.data?.kind === "tempus-date-cell") {
				return customCell.data.date;
			}

			return customCell.data;
		}
		return (cell as { data?: unknown }).data;
	}

	private createCellFromDefinition(value: unknown, colDef: IColumnDefinition): GridCell | null {
		const columnType = this.columnTypeRegistry.get(colDef.dataType);
		if (columnType) {
			return columnType.createCell(value, colDef, this.theme, this.isDarkTheme);
		}

		// Fallback to text cell if column type not found
		const stringValue = typeof value === "string" ? value : String(value || "");
		return {
			kind: GridCellKind.Text,
			data: stringValue,
			displayData: stringValue,
			allowOverlay: true,
		};
	}

	getDeletedRows(): number[] {
		return [...this.deletedRows];
	}

	updateTheme(theme: Partial<Theme>, isDarkTheme: boolean): void {
		this.theme = theme;
		this.isDarkTheme = isDarkTheme;
	}

	/**
	 * Register a callback to be called when the editing state changes
	 */
	onChange(callback: () => void): () => void {
		this.onChangeCallbacks.add(callback);
		// Return a function to unregister the callback
		return () => {
			this.onChangeCallbacks.delete(callback);
		};
	}

	/**
	 * Trigger all registered onChange callbacks
	 */
	private triggerOnChange(): void {
		this.onChangeCallbacks.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				console.error("Error in onChange callback:", error);
			}
		});
	}

	/**
	 * Store original value for a cell when first accessed
	 */
	storeOriginalValue(row: number, col: number, value: unknown): void {
		if (!this.originalCells.has(row)) {
			this.originalCells.set(row, new Map());
		}
		const rowMap = this.originalCells.get(row) ?? new Map();
		const existing = rowMap.get(col);
		if (existing === undefined || existing === null || existing === "") {
			rowMap.set(col, value);
		}
	}

	/**
	 * Get the original value for a cell
	 */
	private getOriginalCellValue(row: number, col: number): unknown {
		return this.originalCells.get(row)?.get(col);
	}

	/**
	 * Get cell value for comparison (extracts the actual value from the cell)
	 */
	private getCellValueForComparison(cell: GridCell, col: number): unknown {
		// Prefer the actual column definition if available
		const colDef = this.columnDefinitions.get(col);
		if (colDef) {
			const columnType = this.columnTypeRegistry.get(colDef.dataType);
			if (columnType) {
				return columnType.getCellValue(cell);
			}
		}
		// Fallback to basic extraction
		const fallbackColumn = { indexNumber: col } as BaseColumnProps;
		return this.getCellValue(cell, fallbackColumn);
	}

	/**
	 * Compare two values for equality
	 */
	private areValuesEqual(value1: unknown, value2: unknown): boolean {
		// Handle nullish values
		if (value1 == null && value2 == null) return true;
		if (value1 == null || value2 == null) return false;

		// Handle dates
		if (value1 instanceof Date && value2 instanceof Date) {
			return value1.getTime() === value2.getTime();
		}
		if (value1 instanceof Date || value2 instanceof Date) {
			// Try to convert both to dates for comparison
			const date1 = value1 instanceof Date ? value1 : new Date(value1 as string | number | Date);
			const date2 = value2 instanceof Date ? value2 : new Date(value2 as string | number | Date);
			return !Number.isNaN(date1.getTime()) && !Number.isNaN(date2.getTime()) && date1.getTime() === date2.getTime();
		}

		// Handle numbers
		if (typeof value1 === "number" && typeof value2 === "number") {
			return value1 === value2;
		}

		// Handle strings (trim for comparison)
		if (typeof value1 === "string" && typeof value2 === "string") {
			return value1.trim() === value2.trim();
		}

		// Default comparison
		return value1 === value2;
	}

	/**
	 * Update the base (original) row count to match the underlying data source
	 * Call this after persisting changes so newly-added rows become base rows
	 */
	setBaseRowCount(newCount: number): void {
		if (typeof newCount !== "number" || Number.isNaN(newCount) || newCount < 0) {
			return;
		}
		this.numRows = newCount;
		// Notify listeners so grids recompute added/base row boundaries
		this.triggerOnChange();
	}
}
