import type { GridCell, Theme } from "@glideapps/glide-data-grid";
import { logger } from "@/shared/libs/logger";
import type { IColumnDefinition } from "../../core/interfaces/IDataSource";
import { ColumnTypeRegistry } from "../../core/services/ColumnTypeRegistry";
import type { BaseColumnProps } from "../../core/types";
import { isNullOrUndefined } from "../../utils/generalUtils";
import { EditingStateStore } from "./core/EditingStateStore";
import { EditingStateSerializer } from "./serialization/EditingStateSerializer";
import { EditingStateValidator } from "./validation/EditingStateValidator";
import {
  areGridValuesEqual,
  createGridCellFromDefinition,
  extractGridCellValue,
  extractGridCellValueForComparison,
} from "./value-utils";

export class EditingState {
  private readonly store: EditingStateStore;
  private readonly columnTypeRegistry: ColumnTypeRegistry;
  private theme: Partial<Theme>;
  private isDarkTheme: boolean;
  private readonly columnDefinitions: Map<number, IColumnDefinition> =
    new Map();
  private readonly onChangeCallbacks: Set<() => void> = new Set();
  private readonly serializer: EditingStateSerializer;
  private readonly validator: EditingStateValidator;

  constructor(numRows: number, theme?: Partial<Theme>, isDarkTheme?: boolean) {
    this.store = new EditingStateStore(numRows);
    this.theme = theme || {};
    this.isDarkTheme = isDarkTheme ?? false;
    this.columnTypeRegistry = ColumnTypeRegistry.getInstance();
    this.serializer = new EditingStateSerializer({
      store: this.store,
      columnDefinitions: this.columnDefinitions,
      getCellValue: this.getCellValue.bind(this),
      createCellFromDefinition: this.createCellFromDefinition.bind(this),
      areValuesEqual: this.areValuesEqual.bind(this),
    });
    this.validator = new EditingStateValidator({
      store: this.store,
      columnDefinitions: this.columnDefinitions,
      columnTypeRegistry: this.columnTypeRegistry,
      getCellValue: this.getCellValue.bind(this),
    });
  }

  setColumnDefinitions(definitions: IColumnDefinition[]): void {
    this.columnDefinitions.clear();
    for (const [index, def] of definitions.entries()) {
      this.columnDefinitions.set(index, def);
    }
  }

  toJson(columns: BaseColumnProps[]): string {
    return this.serializer.toJson(columns);
  }

  fromJson(editingStateJson: string, columns: BaseColumnProps[]): void {
    this.serializer.fromJson(editingStateJson, columns);
  }

  isAddedRow(row: number): boolean {
    return this.store.isAddedRow(row);
  }

  getCell(col: number, row: number): GridCell | undefined {
    return this.store.getCell(col, row);
  }

  setCell(col: number, row: number, cell: GridCell): void {
    if (this.store.isAddedRow(row)) {
      this.store.setCell(col, row, cell, false);
    } else {
      const cellValue = this.getCellValueForComparison(cell, col);
      const originalValue = this.store.getOriginalCellValue(row, col);
      const hasOriginalValue = originalValue !== undefined;
      const matchesOriginal =
        hasOriginalValue && this.areValuesEqual(cellValue, originalValue);

      this.store.setCell(col, row, cell, matchesOriginal);
    }
    // Trigger onChange callbacks after setting the cell
    this.triggerOnChange();
  }

  addRow(rowCells: Map<number, GridCell>): void {
    this.store.addRow(rowCells);
    // Trigger onChange callbacks after adding row
    this.triggerOnChange();
  }

  deleteRows(rows: number[]): void {
    const sortedRows = [...rows].sort((a, b) => b - a);
    for (const row of sortedRows) {
      this.deleteRow(row);
    }
  }

  deleteRow(row: number): void {
    if (isNullOrUndefined(row) || row < 0) {
      return;
    }

    this.store.deleteRow(row);
    // Trigger onChange callbacks after deleting row
    this.triggerOnChange();
  }

  getOriginalRowIndex(row: number): number {
    return this.store.getOriginalRowIndex(row);
  }

  getNumRows(): number {
    return this.store.getNumRows();
  }

  clearMemory(): void {
    this.store.clearAllState();
    // Trigger onChange callbacks after clearing memory
    this.triggerOnChange();
  }

  getMemoryUsage(): {
    editedCells: number;
    addedRows: number;
    deletedRows: number;
  } {
    return this.store.getMemoryUsage();
  }

  /**
   * Check if there are any changes in the editing state
   */
  hasChanges(): boolean {
    // Check deleted rows
    if (this.store.getDeletedRows().length > 0) {
      return true;
    }

    // Check added rows
    if (this.store.getAddedRows().length > 0) {
      return true;
    }

    // Check edited cells - need to verify they're actually different from originals
    for (const [rowIndex, row] of this.store.editedRowEntries()) {
      for (const [colIndex, cell] of row.entries()) {
        const cellValue = this.getCellValueForComparison(cell, colIndex);
        const originalValue = this.store.getOriginalCellValue(
          rowIndex,
          colIndex
        );

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
    return this.validator.validate(columns);
  }

  private getCellValue(cell: GridCell, column: BaseColumnProps): unknown {
    return extractGridCellValue({
      cell,
      column,
      columnDefinitions: this.columnDefinitions,
      columnTypeRegistry: this.columnTypeRegistry,
    });
  }

  private createCellFromDefinition(
    value: unknown,
    colDef: IColumnDefinition
  ): GridCell | null {
    return createGridCellFromDefinition({
      value,
      columnDefinition: colDef,
      columnTypeRegistry: this.columnTypeRegistry,
      theme: this.theme,
      isDarkTheme: this.isDarkTheme,
    });
  }

  getDeletedRows(): number[] {
    return this.store.getDeletedRows();
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
    for (const callback of this.onChangeCallbacks) {
      try {
        callback();
      } catch (error) {
        logger.error("[EditingState] onChange callback failed", error);
      }
    }
  }

  /**
   * Store original value for a cell when first accessed
   */
  storeOriginalValue(row: number, col: number, value: unknown): void {
    this.store.storeOriginalValue(row, col, value);
  }

  /**
   * Get cell value for comparison (extracts the actual value from the cell)
   */
  private getCellValueForComparison(cell: GridCell, col: number): unknown {
    return extractGridCellValueForComparison({
      cell,
      columnIndex: col,
      columnDefinitions: this.columnDefinitions,
      columnTypeRegistry: this.columnTypeRegistry,
    });
  }

  /**
   * Compare two values for equality
   */
  private areValuesEqual(value1: unknown, value2: unknown): boolean {
    return areGridValuesEqual(value1, value2);
  }

  /**
   * Update the base (original) row count to match the underlying data source
   * Call this after persisting changes so newly-added rows become base rows
   */
  setBaseRowCount(newCount: number): void {
    const previousCount = this.store.getBaseRowCount();
    this.store.setBaseRowCount(newCount);
    if (this.store.getBaseRowCount() !== previousCount) {
      // Notify listeners so grids recompute added/base row boundaries
      this.triggerOnChange();
    }
  }
}
