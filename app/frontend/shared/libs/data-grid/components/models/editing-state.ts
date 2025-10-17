import type { GridCell, Theme } from "@glideapps/glide-data-grid";
import {
	deserializeEditingState,
	serializeEditingState,
} from "@shared/libs/data-grid/serializers/editing-state";
import {
	areValuesEqual,
	getCellValueForComparison,
} from "@shared/libs/data-grid/utils/value";
import { validateEditingState } from "@shared/libs/data-grid/validation/editing-state-validation";
import type { IColumnDefinition } from "../core/interfaces/i-data-source";
import type { BaseColumnProps } from "../core/types";
import { isNullOrUndefined } from "../utils/general-utils";

export class EditingState_DEPRECATED_DO_NOT_USE_HERE {
	private editedCells: Map<number, Map<number, GridCell>> = new Map();
	private addedRows: Map<number, GridCell>[] = [];
	private deletedRows: number[] = [];
	private numRows: number;
	private theme: Partial<Theme>;
	private isDarkTheme: boolean | undefined;
	private readonly columnDefinitions: Map<number, IColumnDefinition> =
		new Map();
	private readonly onChangeCallbacks: Set<() => void> = new Set();
	private readonly originalCells: Map<number, Map<number, unknown>> = new Map();

	constructor(numRows: number, theme?: Partial<Theme>, isDarkTheme?: boolean) {
		this.numRows = numRows;
		this.theme = theme || {};
		this.isDarkTheme = isDarkTheme;
	}

	setColumnDefinitions(definitions: IColumnDefinition[]): void {
		this.columnDefinitions.clear();
		for (const [index, def] of definitions.entries()) {
			this.columnDefinitions.set(index, def);
		}
	}

	toJson(columns: BaseColumnProps[]): string {
		return serializeEditingState({
			editedCells: this.editedCells,
			addedRows: this.addedRows,
			deletedRows: this.deletedRows,
			columns,
			columnDefinitions: this.columnDefinitions,
			getOriginalCellValue: (row, col) => this.getOriginalCellValue(row, col),
		});
	}

	fromJson(editingStateJson: string, columns: BaseColumnProps[]): void {
		const { editedCells, addedRows, deletedRows } = deserializeEditingState({
			json: editingStateJson,
			columns,
			columnDefinitions: this.columnDefinitions,
			theme: this.theme,
			isDarkTheme: this.isDarkTheme,
		});
		this.editedCells = editedCells;
		this.addedRows = addedRows;
		this.deletedRows = deletedRows;
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
			this.handleAddedRowCell(row, col, cell);
		} else {
			this.handleEditedRowCell(row, col, cell);
		}
		this.triggerOnChange();
	}

	private handleAddedRowCell(row: number, col: number, cell: GridCell): void {
		const addedRowIndex = row - this.numRows;
		if (
			addedRowIndex >= this.addedRows.length ||
			!this.addedRows[addedRowIndex]
		) {
			return;
		}
		this.addedRows[addedRowIndex].set(col, cell);
	}

	private handleEditedRowCell(row: number, col: number, cell: GridCell): void {
		const colDef = this.columnDefinitions.get(col);
		const cellValue = getCellValueForComparison(cell, colDef);
		const originalValue = this.getOriginalCellValue(row, col);
		const hasOriginalValue = originalValue !== undefined;
		const matchesOriginal =
			hasOriginalValue && areValuesEqual(cellValue, originalValue);

		if (matchesOriginal) {
			this.clearEditedCell(row, col);
		} else {
			this.setEditedCell(row, col, cell);
		}
	}

	private clearEditedCell(row: number, col: number): void {
		if (this.editedCells.has(row)) {
			this.editedCells.get(row)?.delete(col);
			if (this.editedCells.get(row)?.size === 0) {
				this.editedCells.delete(row);
			}
		}
	}

	private setEditedCell(row: number, col: number, cell: GridCell): void {
		if (!this.editedCells.has(row)) {
			this.editedCells.set(row, new Map());
		}
		this.editedCells.get(row)?.set(col, cell);
	}

	addRow(rowCells: Map<number, GridCell>): void {
		this.addedRows.push(rowCells);
		this.triggerOnChange();
	}

	deleteRows(rows: number[]): void {
		const sortedRows = rows.sort((a, b) => b - a);
		for (const row of sortedRows) {
			this.deleteRow(row);
		}
	}

	deleteRow(row: number): void {
		if (isNullOrUndefined(row) || row < 0) {
			return;
		}

		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.numRows;
			this.addedRows.splice(addedRowIndex, 1);
			this.triggerOnChange();
			return;
		}

		if (!this.deletedRows.includes(row)) {
			this.deletedRows.push(row);
			this.deletedRows = this.deletedRows.sort((a, b) => a - b);
		}

		this.editedCells.delete(row);
		this.triggerOnChange();
	}

	getOriginalRowIndex(row: number): number {
		if (this.isAddedRow(row)) {
			return -1;
		}

		let originalIndex = row;
		for (const deletedRow of this.deletedRows) {
			if (deletedRow > originalIndex) {
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

	hasChanges(): boolean {
		if (this.deletedRows.length > 0) {
			return true;
		}

		if (this.addedRows.length > 0) {
			return true;
		}

		for (const [rowIndex, row] of this.editedCells) {
			for (const [colIndex, cell] of row) {
				const colDef = this.columnDefinitions.get(colIndex);
				const cellValue = getCellValueForComparison(cell, colDef);
				const originalValue = this.getOriginalCellValue(rowIndex, colIndex);

				if (!areValuesEqual(cellValue, originalValue)) {
					return true;
				}
			}
		}

		return false;
	}

	validateCells(columns: BaseColumnProps[]) {
		return validateEditingState({
			editedCells: this.editedCells,
			addedRows: this.addedRows,
			numRows: this.numRows,
			columns,
			columnDefinitions: this.columnDefinitions,
		});
	}

	getDeletedRows(): number[] {
		return [...this.deletedRows];
	}

	updateTheme(theme: Partial<Theme>, isDarkTheme: boolean): void {
		this.theme = theme;
		this.isDarkTheme = isDarkTheme;
	}

	onChange(callback: () => void): () => void {
		this.onChangeCallbacks.add(callback);
		return () => {
			this.onChangeCallbacks.delete(callback);
		};
	}

	private triggerOnChange(): void {
		for (const callback of this.onChangeCallbacks) {
			try {
				callback();
			} catch {
				// Intentionally ignore callback errors
			}
		}
	}

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

	private getOriginalCellValue(row: number, col: number): unknown {
		return this.originalCells.get(row)?.get(col);
	}

	setBaseRowCount(newCount: number): void {
		if (
			typeof newCount !== "number" ||
			Number.isNaN(newCount) ||
			newCount < 0
		) {
			return;
		}
		this.numRows = newCount;
		this.triggerOnChange();
	}
}
