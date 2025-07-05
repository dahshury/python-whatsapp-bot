/**
 * Based on Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
 * Adapted for use in this project
 */

import {
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import type { IColumnDefinition } from "../core/interfaces/IDataSource";
import { ColumnTypeRegistry } from "../core/services/ColumnTypeRegistry";
import type { BaseColumnProps } from "../core/types";
import { isNullOrUndefined, notNullOrUndefined } from "../utils/generalUtils";
import { messages } from "../utils/i18n";

const INDEX_IDENTIFIER = "_index";

export function getColumnName(column: BaseColumnProps): string {
	return column.isIndex
		? INDEX_IDENTIFIER
		: isNullOrUndefined(column.name)
			? ""
			: column.name;
}

export function isMissingValueCell(cell: GridCell): boolean {
	const cellData = (cell as any).data;
	const displayData = (cell as any).displayData;

	// Check if cell has the isMissingValue flag
	if ((cell as any).isMissingValue === true) {
		console.log(
			"🚨 isMissingValueCell: cell has isMissingValue flag set to true",
		);
		return true;
	}

	// For custom cells, check the data property more thoroughly
	if (cell.kind === GridCellKind.Custom) {
		const customData = (cell as any).data;
		if (customData?.kind === "phone-input-cell") {
			const isMissing = !customData.phone || customData.phone === "";
			console.log("🔍 isMissingValueCell phone-input-cell:", {
				phone: customData.phone,
				isMissing,
			});
			return isMissing;
		}
		if (customData?.kind === "tempus-date-cell") {
			const isMissing = !customData.date;
			console.log("🔍 isMissingValueCell tempus-date-cell:", {
				date: customData.date,
				isMissing,
			});
			return isMissing;
		}
		if (customData?.kind === "dropdown-cell") {
			const isMissing = !customData.value || customData.value === "";
			console.log("🔍 isMissingValueCell dropdown-cell:", {
				value: customData.value,
				isMissing,
			});
			return isMissing;
		}
		if (customData?.kind === "timekeeper-cell") {
			const isMissing = !customData.time;
			console.log("🔍 isMissingValueCell timekeeper-cell:", {
				time: customData.time,
				isMissing,
			});
			return isMissing;
		}
	}

	const isMissing =
		isNullOrUndefined(cellData) ||
		cellData === "" ||
		isNullOrUndefined(displayData) ||
		displayData === "";

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
	private originalCells: Map<number, Map<number, any>> = new Map();

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
		console.log("🏗️ EditingState.toJson called with columns:", columns.length);
		console.log("🏗️ Current state:", {
			editedCellsSize: this.editedCells.size,
			addedRowsLength: this.addedRows.length,
			deletedRowsLength: this.deletedRows.length,
		});

		const columnsByIndex = new Map<number, BaseColumnProps>();
		columns.forEach((column) => {
			columnsByIndex.set(column.indexNumber, column);
		});

		const currentState = {
			// We use snake case here since this is the widget state
			// that is sent and used in the backend. Therefore, it should
			// conform with the Python naming conventions.
			edited_rows: {} as Record<number, Record<string, any>>,
			added_rows: [] as Record<string, any>[],
			deleted_rows: [] as number[],
		};

		// Loop through all edited cells and transform into the structure
		// we use for the JSON-compatible widget state:
		// row position -> column name -> edited value
		this.editedCells.forEach((row: Map<number, GridCell>, rowIndex: number) => {
			const editedRow: Record<string, any> = {};
			row.forEach((cell: GridCell, colIndex: number) => {
				const column = columnsByIndex.get(colIndex);
				if (column) {
					const cellValue = this.getCellValue(cell, column);
					const originalValue = this.getOriginalCellValue(rowIndex, colIndex);

					// Only include if value is different from original
					const isDifferent = !this.areValuesEqual(cellValue, originalValue);

					// Only include the cell if it has a value and is different from original
					if (
						isDifferent &&
						notNullOrUndefined(cellValue) &&
						cellValue !== ""
					) {
						editedRow[getColumnName(column)] = cellValue;
					}
				}
			});
			// Only add the row if it has at least one edited cell
			if (Object.keys(editedRow).length > 0) {
				currentState.edited_rows[rowIndex] = editedRow;
			}
		});

		// Loop through all added rows and transform into the format that
		// we use for the JSON-compatible widget state:
		// List of column name -> edited value
		this.addedRows.forEach(
			(row: Map<number, GridCell>, addedRowIndex: number) => {
				console.log(
					`🏗️ Processing added row ${addedRowIndex}, has ${row.size} cells`,
				);

				const addedRow: Record<string, any> = {};
				// This flag is used to check if the row is incomplete
				// (i.e. missing required values) and should therefore not be included in
				// the current state version.
				let isIncomplete = false;
				const debugInfo: any = {};

				row.forEach((cell: GridCell, colIndex: number) => {
					const column = columnsByIndex.get(colIndex);
					if (column) {
						const cellValue = this.getCellValue(cell, column);
						const colDef = this.columnDefinitions.get(colIndex);
						const isMissing = isMissingValueCell(cell);

						debugInfo[column.name || column.id || colIndex] = {
							cellValue,
							isMissing,
							isRequired: colDef?.isRequired,
							isEditable: colDef?.isEditable,
						};

						if (
							colDef?.isRequired &&
							colDef?.isEditable !== false &&
							isMissing
						) {
							// If the cell is missing a required value, the row is incomplete
							console.log(
								`🚨 Row ${addedRowIndex} marked incomplete due to missing required field: ${column.name || column.id}`,
							);
							isIncomplete = true;
						}

						if (notNullOrUndefined(cellValue) && cellValue !== "") {
							addedRow[getColumnName(column)] = cellValue;
						}
					}
				});

				console.log(`🏗️ Added row ${addedRowIndex} debug:`, debugInfo);
				console.log(`🏗️ Added row ${addedRowIndex} result:`, {
					addedRow,
					isIncomplete,
				});

				if (!isIncomplete) {
					currentState.added_rows.push(addedRow);
					console.log(`✅ Added row ${addedRowIndex} included in changes`);
				} else {
					console.log(
						`❌ Added row ${addedRowIndex} excluded due to incomplete data`,
					);
				}
			},
		);

		// The deleted rows don't need to be transformed
		currentState.deleted_rows = this.deletedRows;

		// Convert undefined values to null, otherwise this is removed here since
		// undefined does not exist in JSON.
		return JSON.stringify(currentState, (_k, v) =>
			v === undefined ? null : v,
		);
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

		(editingState.added_rows || []).forEach((row: Record<string, any>) => {
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
			if (addedRowIndex >= this.addedRows.length) {
				return;
			}
			this.addedRows[addedRowIndex].set(col, cell);
		} else {
			// Get the cell value
			const cellValue = this.getCellValueForComparison(cell, col);

			// Check if this matches the original value
			const originalValue = this.getOriginalCellValue(row, col);
			const hasOriginalValue = originalValue !== undefined;
			const matchesOriginal =
				hasOriginalValue && this.areValuesEqual(cellValue, originalValue);

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
			if (this.deletedRows[i] > originalIndex) {
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
					// First check if the cell itself has the isMissingValue flag
					if ((cell as any).isMissingValue === true) {
						errors.push({
							row: rowIndex,
							col: colIndex,
							message: messages.validation.required(
								column.title || column.name || "Field",
							),
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
								message: messages.validation.required(
									column.title || column.name || "Field",
								),
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
		this.addedRows.forEach(
			(row: Map<number, GridCell>, addedRowIndex: number) => {
				const rowIndex = this.numRows + addedRowIndex;

				row.forEach((cell: GridCell, colIndex: number) => {
					const column = columnsByIndex.get(colIndex);
					const colDef = this.columnDefinitions.get(colIndex);

					if (column && colDef) {
						// First check if the cell itself has the isMissingValue flag
						if ((cell as any).isMissingValue === true) {
							errors.push({
								row: rowIndex,
								col: colIndex,
								message: messages.validation.required(
									column.title || column.name || "Field",
								),
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
									message: messages.validation.required(
										column.title || column.name || "Field",
									),
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
			},
		);

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private getCellValue(cell: GridCell, column: BaseColumnProps): any {
		const colDef = this.columnDefinitions.get(column.indexNumber);
		if (!colDef) {
			return (cell as any).data;
		}

		const columnType = this.columnTypeRegistry.get(colDef.dataType);
		if (columnType) {
			return columnType.getCellValue(cell);
		}

		// Fallback for unknown types
		if (cell.kind === GridCellKind.Text) {
			return (cell as any).data;
		}
		if (cell.kind === GridCellKind.Number) {
			return (cell as any).data;
		}
		if (cell.kind === GridCellKind.Boolean) {
			return (cell as any).data;
		}
		if (cell.kind === GridCellKind.Custom) {
			const customCell = cell as any;
			if (customCell.data?.kind === "dropdown-cell") {
				return customCell.data.value;
			}
			if (customCell.data?.kind === "tempus-date-cell") {
				return customCell.data.date;
			}
			if (customCell.data?.kind === "phone-input-cell") {
				return customCell.data.phone;
			}
			return customCell.data;
		}
		return (cell as any).data;
	}

	private createCellFromDefinition(
		value: any,
		colDef: IColumnDefinition,
	): GridCell | null {
		const columnType = this.columnTypeRegistry.get(colDef.dataType);
		if (columnType) {
			return columnType.createCell(value, colDef, this.theme, this.isDarkTheme);
		}

		// Fallback to text cell if column type not found
		return {
			kind: GridCellKind.Text,
			data: value || "",
			displayData: value?.toString() || "",
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
	storeOriginalValue(row: number, col: number, value: any): void {
		if (!this.originalCells.has(row)) {
			this.originalCells.set(row, new Map());
		}
		const rowMap = this.originalCells.get(row)!;
		const existing = rowMap.get(col);
		if (existing === undefined || existing === null || existing === "") {
			rowMap.set(col, value);
		}
	}

	/**
	 * Get the original value for a cell
	 */
	private getOriginalCellValue(row: number, col: number): any {
		return this.originalCells.get(row)?.get(col);
	}

	/**
	 * Get cell value for comparison (extracts the actual value from the cell)
	 */
	private getCellValueForComparison(cell: GridCell, col: number): any {
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
	private areValuesEqual(value1: any, value2: any): boolean {
		// Handle nullish values
		if (value1 == null && value2 == null) return true;
		if (value1 == null || value2 == null) return false;

		// Handle dates
		if (value1 instanceof Date && value2 instanceof Date) {
			return value1.getTime() === value2.getTime();
		}
		if (value1 instanceof Date || value2 instanceof Date) {
			// Try to convert both to dates for comparison
			const date1 = value1 instanceof Date ? value1 : new Date(value1);
			const date2 = value2 instanceof Date ? value2 : new Date(value2);
			return (
				!Number.isNaN(date1.getTime()) &&
				!Number.isNaN(date2.getTime()) &&
				date1.getTime() === date2.getTime()
			);
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

	// Backward compatibility method for when column definitions are not set
	private createCell(value: any, column: BaseColumnProps): GridCell | null {
		// First try to use column definition if available
		const colDef = this.columnDefinitions.get(column.indexNumber);
		if (colDef) {
			return this.createCellFromDefinition(value, colDef);
		}

		// Fallback to name/id inference for backward compatibility
		const lowerId = column.id?.toLowerCase() || "";
		const lowerName = column.name?.toLowerCase() || "";

		// DATE
		if (lowerId.includes("date") || lowerName.includes("date")) {
			const dateObj = value ? new Date(value) : null;
			const displayDate =
				dateObj && !Number.isNaN(dateObj.getTime())
					? dateObj.toLocaleDateString("en-GB")
					: "";
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "tempus-date-cell",
					format: "date",
					date: dateObj,
					displayDate,
					isDarkTheme: this.isDarkTheme,
				},
				copyData: displayDate,
				allowOverlay: true,
			} as any;
		}

		// TIME
		if (lowerId.includes("time") || lowerName.includes("time")) {
			const dateObj = value ? new Date(value) : null;
			const displayTime =
				dateObj && !Number.isNaN(dateObj.getTime())
					? dateObj.toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
							hour12: true,
						})
					: "";
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "tempus-date-cell",
					format: "time",
					date: dateObj,
					displayDate: displayTime,
					isDarkTheme: this.isDarkTheme,
				},
				copyData: displayTime,
				allowOverlay: true,
			} as any;
		}

		// NUMBER
		if (
			lowerId.includes("number") ||
			lowerId.includes("amount") ||
			lowerName.includes("number") ||
			lowerName.includes("amount")
		) {
			const numValue =
				value !== null && value !== undefined ? Number(value) : 0;
			return {
				kind: GridCellKind.Number,
				data: numValue,
				displayData: numValue.toString(),
				allowOverlay: true,
			};
		}

		// BOOLEAN
		if (lowerId.includes("boolean") || lowerName.includes("boolean")) {
			return {
				kind: GridCellKind.Boolean,
				data: Boolean(value),
				allowOverlay: false,
			};
		}

		// PHONE
		if (lowerId.includes("phone") || lowerName.includes("phone")) {
			const phoneValue = value?.toString() || "";
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "phone-input-cell",
					phone: phoneValue,
					displayPhone: phoneValue,
					isDarkTheme: this.isDarkTheme,
				},
				copyData: phoneValue,
				allowOverlay: true,
			} as any;
		}

		// DROPDOWN
		if (
			lowerId.includes("status") ||
			lowerId.includes("dropdown") ||
			lowerId.includes("select") ||
			lowerName.includes("status") ||
			lowerName.includes("dropdown") ||
			lowerName.includes("select")
		) {
			const dropdownValue = value?.toString() || "";
			return {
				kind: GridCellKind.Custom,
				data: {
					kind: "dropdown-cell",
					value: dropdownValue,
					allowedValues: ["Option A", "Option B", "Option C"], // Default options
				},
				copyData: dropdownValue,
				allowOverlay: true,
			} as any;
		}

		// EMAIL
		if (
			lowerId.includes("email") ||
			lowerId.includes("mail") ||
			lowerName.includes("email") ||
			lowerName.includes("mail")
		) {
			const emailValue = value?.toString() || "";
			return {
				kind: GridCellKind.Text,
				data: emailValue,
				displayData: emailValue,
				allowOverlay: true,
				contentAlign: "left",
			};
		}

		// TEXT fallback
		return {
			kind: GridCellKind.Text,
			data: value || "",
			displayData: value?.toString() || "",
			allowOverlay: true,
		};
	}
}
