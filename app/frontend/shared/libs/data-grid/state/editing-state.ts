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
import type { IColumnDefinition } from "../components/core/interfaces/i-data-source";
import type { BaseColumnProps } from "../components/core/types";
import { ChangeEmitter } from "./change-emitter";
import { OriginalValuesStore } from "./original-values-store";
import { RowStore } from "./row-store";

export class EditingState {
	private editedCells: Map<number, Map<number, GridCell>> = new Map();
	private addedRows: Map<number, GridCell>[] = [];
	private readonly rowStore: RowStore;
	private theme: Partial<Theme>;
	private isDarkTheme: boolean | undefined;
	private readonly columnDefinitions: Map<number, IColumnDefinition> =
		new Map();
	private readonly changeEmitter = new ChangeEmitter();
	private readonly originalValues = new OriginalValuesStore();

	constructor(numRows: number, theme?: Partial<Theme>, isDarkTheme?: boolean) {
		this.theme = theme || {};
		this.isDarkTheme = isDarkTheme;
		this.rowStore = new RowStore(numRows);
	}

	setColumnDefinitions(definitions: IColumnDefinition[]): void {
		this.columnDefinitions.clear();
		definitions.forEach((def, index) => {
			this.columnDefinitions.set(index, def);
		});
	}

	toJson(columns: BaseColumnProps[]): string {
		return serializeEditingState({
			editedCells: this.editedCells,
			addedRows: this.addedRows,
			deletedRows: this.rowStore.getDeletedRows(),
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
		for (const r of deletedRows) {
			this.rowStore.addDeletedRow(r);
		}
	}

	isAddedRow(row: number): boolean {
		return this.rowStore.isAddedRow(row);
	}

	getCell(col: number, row: number): GridCell | undefined {
		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.getBaseRowCount();
			return this.addedRows[addedRowIndex]?.get(col);
		}
		return this.editedCells.get(row)?.get(col);
	}

	setCell(col: number, row: number, cell: GridCell): void {
		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.getBaseRowCount();
			this.handleAddedRowCell(addedRowIndex, col, cell);
		} else {
			this.handleEditedRowCell(col, row, cell);
		}
		this.changeEmitter.emit();
	}

	addRow(rowCells: Map<number, GridCell>): void {
		this.addedRows.push(rowCells);
		this.rowStore.setAddedRowsCount(this.addedRows.length);
		this.changeEmitter.emit();
	}

	deleteRows(rows: number[]): void {
		const sortedRows = rows.sort((a, b) => b - a);
		for (const row of sortedRows) {
			this.deleteRow(row);
		}
	}

	deleteRow(row: number): void {
		if (row == null || row < 0) {
			return;
		}

		if (this.isAddedRow(row)) {
			const addedRowIndex = row - this.getBaseRowCount();
			this.addedRows.splice(addedRowIndex, 1);
			this.rowStore.setAddedRowsCount(this.addedRows.length);
			this.changeEmitter.emit();
			return;
		}

		this.rowStore.addDeletedRow(row);
		this.editedCells.delete(row);
		this.changeEmitter.emit();
	}

	getOriginalRowIndex(row: number): number {
		return this.rowStore.getOriginalRowIndex(row);
	}

	getNumRows(): number {
		return this.rowStore.getNumRows();
	}

	clearMemory(): void {
		this.editedCells.clear();
		this.addedRows = [];
		this.rowStore.setAddedRowsCount(0);
		for (const r of this.rowStore.getDeletedRows()) {
			this.rowStore.removeDeletedRow(r);
		}
		this.originalValues.clear();
		this.changeEmitter.emit();
	}

	getMemoryUsage(): {
		editedCells: number;
		addedRows: number;
		deletedRows: number;
	} {
		return {
			editedCells: this.editedCells.size,
			addedRows: this.addedRows.length,
			deletedRows: this.rowStore.getDeletedRows().length,
		};
	}

	hasChanges(): boolean {
		if (this.rowStore.getDeletedRows().length > 0) {
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
			numRows: this.getBaseRowCount(),
			columns,
			columnDefinitions: this.columnDefinitions,
		});
	}

	getDeletedRows(): number[] {
		return this.rowStore.getDeletedRows();
	}

	updateTheme(theme: Partial<Theme>, isDarkTheme: boolean): void {
		this.theme = theme;
		this.isDarkTheme = isDarkTheme;
	}

	onChange(callback: () => void): () => void {
		return this.changeEmitter.on(callback);
	}

	storeOriginalValue(row: number, col: number, value: unknown): void {
		this.originalValues.store(row, col, value);
	}

	private getOriginalCellValue(row: number, col: number): unknown {
		return this.originalValues.get(row, col);
	}

	setBaseRowCount(newCount: number): void {
		this.rowStore.setBaseRowCount(newCount);
		this.changeEmitter.emit();
	}

	private getBaseRowCount(): number {
		return (
			this.rowStore.getNumRows() -
			this.addedRows.length +
			this.rowStore.getDeletedRows().length
		);
	}

	private handleAddedRowCell(
		addedRowIndex: number,
		col: number,
		cell: GridCell
	): boolean {
		if (
			addedRowIndex >= this.addedRows.length ||
			!this.addedRows[addedRowIndex]
		) {
			return false;
		}
		this.addedRows[addedRowIndex].set(col, cell);
		return true;
	}

	private handleEditedRowCell(col: number, row: number, cell: GridCell): void {
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
}
