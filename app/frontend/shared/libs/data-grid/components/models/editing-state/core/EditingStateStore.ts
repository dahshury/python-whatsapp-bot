import type { GridCell } from "@glideapps/glide-data-grid";

type EditedCells = Map<number, Map<number, GridCell>>;

type AddedRowEntry = {
  originalRowIndex: number;
  cells: Map<number, GridCell>;
};

export class EditingStateStore {
  private readonly editedCells: EditedCells = new Map();
  private addedRows: AddedRowEntry[] = [];
  private deletedRows: number[] = [];
  private readonly originalCells: Map<number, Map<number, unknown>> = new Map();
  private baseRowCount: number;

  constructor(initialRowCount: number) {
    this.baseRowCount = initialRowCount;
  }

  isAddedRow(row: number): boolean {
    return row >= this.baseRowCount;
  }

  getCell(col: number, row: number): GridCell | undefined {
    if (this.isAddedRow(row)) {
      const entry = this.findAddedRowEntry(row);
      return entry?.cells.get(col);
    }
    return this.editedCells.get(row)?.get(col);
  }

  setCell(
    col: number,
    row: number,
    cell: GridCell,
    matchesOriginal: boolean
  ): void {
    if (this.isAddedRow(row)) {
      const entry = this.findAddedRowEntry(row);
      if (!entry) {
        return;
      }
      entry.cells.set(col, cell);
      return;
    }

    if (matchesOriginal) {
      if (this.editedCells.has(row)) {
        const rowMap = this.editedCells.get(row);
        rowMap?.delete(col);
        if ((rowMap?.size ?? 0) === 0) {
          this.editedCells.delete(row);
        }
      }
      return;
    }

    if (!this.editedCells.has(row)) {
      this.editedCells.set(row, new Map());
    }
    this.editedCells.get(row)?.set(col, cell);
  }

  addRow(rowCells: Map<number, GridCell>, originalRowIndex?: number): number {
    const assignedIndex =
      typeof originalRowIndex === "number" && Number.isFinite(originalRowIndex)
        ? originalRowIndex
        : this.baseRowCount + this.addedRows.length;
    this.addedRows.push({
      originalRowIndex: assignedIndex,
      cells: rowCells,
    });
    return assignedIndex;
  }

  deleteRows(rows: number[]): void {
    const sortedRows = [...rows].sort((a, b) => b - a);
    for (const row of sortedRows) {
      this.deleteRow(row);
    }
  }

  deleteRow(row: number): void {
    if (row === undefined || row === null || row < 0) {
      return;
    }

    if (this.isAddedRow(row)) {
      const explicitIndex = this.addedRows.findIndex(
        (entry) => entry.originalRowIndex === row
      );
      if (explicitIndex >= 0) {
        this.addedRows.splice(explicitIndex, 1);
        return;
      }
      const fallbackIndex = this.getAddedRowIndex(row);
      if (fallbackIndex >= 0 && fallbackIndex < this.addedRows.length) {
        this.addedRows.splice(fallbackIndex, 1);
      }
      return;
    }

    if (!this.deletedRows.includes(row)) {
      this.deletedRows.push(row);
      this.deletedRows = this.deletedRows.sort((a, b) => a - b);
    }

    this.editedCells.delete(row);
  }

  getOriginalRowIndex(row: number): number {
    if (this.isAddedRow(row)) {
      return -1;
    }

    let originalIndex = row;
    for (const deletedRow of this.deletedRows) {
      if (deletedRow !== undefined && deletedRow > originalIndex) {
        break;
      }
      originalIndex += 1;
    }

    return originalIndex;
  }

  getNumRows(): number {
    return this.baseRowCount + this.addedRows.length - this.deletedRows.length;
  }

  resetTransientState(): void {
    this.editedCells.clear();
    this.addedRows = [];
    this.deletedRows = [];
  }

  clearAllState(): void {
    this.resetTransientState();
    this.originalCells.clear();
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

  getDeletedRows(): number[] {
    return [...this.deletedRows];
  }

  setDeletedRows(rows: number[]): void {
    this.deletedRows = [...rows].sort((a, b) => a - b);
  }

  getAddedRows(): readonly Map<number, GridCell>[] {
    return this.addedRows.map((entry) => entry.cells);
  }

  editedRowEntries(): IterableIterator<[number, Map<number, GridCell>]> {
    return this.editedCells.entries();
  }

  getEditedRow(rowIndex: number): Map<number, GridCell> | undefined {
    return this.editedCells.get(rowIndex);
  }

  setEditedRow(rowIndex: number, row: Map<number, GridCell>): void {
    this.editedCells.set(rowIndex, row);
  }

  removeEditedRow(rowIndex: number): void {
    this.editedCells.delete(rowIndex);
  }

  storeOriginalValue(row: number, col: number, value: unknown): void {
    let rowMap = this.originalCells.get(row);
    if (!rowMap) {
      rowMap = new Map();
      this.originalCells.set(row, rowMap);
    }
    const existing = rowMap.get(col);
    if (existing === undefined || existing === null || existing === "") {
      rowMap.set(col, value);
    }
  }

  getOriginalCellValue(row: number, col: number): unknown {
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
    this.baseRowCount = newCount;
  }

  getBaseRowCount(): number {
    return this.baseRowCount;
  }

  hasAddedRow(row: number): boolean {
    return this.addedRows.some((entry) => entry.originalRowIndex === row);
  }

  private findAddedRowEntry(row: number): AddedRowEntry | undefined {
    const addedRowIndex = this.getAddedRowIndex(row);
    const directEntry = this.addedRows[addedRowIndex];
    if (directEntry?.originalRowIndex === row) {
      return directEntry;
    }
    return this.addedRows.find((entry) => entry.originalRowIndex === row);
  }

  private getAddedRowIndex(row: number): number {
    return row - this.baseRowCount;
  }
}
