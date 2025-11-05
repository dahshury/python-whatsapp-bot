import type { GridCell } from "@glideapps/glide-data-grid";

import type { IColumnDefinition } from "../../../core/interfaces/IDataSource";
import type { BaseColumnProps } from "../../../core/types";
import { notNullOrUndefined } from "../../../utils/generalUtils";
import { getColumnName, isMissingValueCell } from "../column-utils";
import type { EditingStateStore } from "../core/EditingStateStore";
import { PHONE_PREFIX_PATTERN } from "../editing-state.tokens";

type SerializerDeps = {
  store: EditingStateStore;
  columnDefinitions: Map<number, IColumnDefinition>;
  getCellValue: (cell: GridCell, column: BaseColumnProps) => unknown;
  areValuesEqual: (value1: unknown, value2: unknown) => boolean;
  createCellFromDefinition: (
    value: unknown,
    colDef: IColumnDefinition
  ) => GridCell | null;
};

export class EditingStateSerializer {
  private readonly store: EditingStateStore;
  private readonly columnDefinitions: Map<number, IColumnDefinition>;
  private readonly getCellValue: (
    cell: GridCell,
    column: BaseColumnProps
  ) => unknown;
  private readonly areValuesEqual: (
    value1: unknown,
    value2: unknown
  ) => boolean;
  private readonly createCellFromDefinition: (
    value: unknown,
    colDef: IColumnDefinition
  ) => GridCell | null;

  constructor(deps: SerializerDeps) {
    this.store = deps.store;
    this.columnDefinitions = deps.columnDefinitions;
    this.getCellValue = deps.getCellValue;
    this.areValuesEqual = deps.areValuesEqual;
    this.createCellFromDefinition = deps.createCellFromDefinition;
  }

  toJson(columns: BaseColumnProps[]): string {
    const columnsByIndex = new Map<number, BaseColumnProps>();
    for (const column of columns) {
      columnsByIndex.set(column.indexNumber, column);
    }

    const currentState = {
      edited_rows: {} as Record<number, Record<string, unknown>>,
      added_rows: [] as Record<string, unknown>[],
      deleted_rows: [] as number[],
    };

    for (const [rowIndex, row] of this.store.editedRowEntries()) {
      const editedRow: Record<string, unknown> = {};
      let hasOriginalData = false;

      for (const [colIndex, cell] of row.entries()) {
        const column = columnsByIndex.get(colIndex);
        if (!column) {
          continue;
        }
        const cellValue = this.getCellValue(cell, column);
        const originalValue = this.store.getOriginalCellValue(
          rowIndex,
          colIndex
        );

        const isPhonePrefix =
          typeof originalValue === "string" &&
          PHONE_PREFIX_PATTERN.test(originalValue.trim());

        if (originalValue != null && originalValue !== "" && !isPhonePrefix) {
          hasOriginalData = true;
        }

        const isDifferent = !this.areValuesEqual(cellValue, originalValue);

        if (isDifferent && notNullOrUndefined(cellValue) && cellValue !== "") {
          editedRow[getColumnName(column)] = cellValue;
        }
      }

      if (Object.keys(editedRow).length > 0) {
        if (hasOriginalData) {
          currentState.edited_rows[rowIndex] = editedRow;
        } else {
          const completeRow: Record<string, unknown> = {};
          for (const [colIndex, column] of columnsByIndex.entries()) {
            const currentCell = row.get(colIndex);
            let cellValue: unknown;

            if (currentCell) {
              cellValue = this.getCellValue(currentCell, column);
            } else {
              cellValue = this.store.getOriginalCellValue(rowIndex, colIndex);
            }

            if (notNullOrUndefined(cellValue)) {
              completeRow[column.id || column.name || `col_${colIndex}`] =
                cellValue;
            }
          }
          currentState.added_rows.push(completeRow);
        }
      }
    }

    for (const row of this.store.getAddedRows()) {
      const addedRow: Record<string, unknown> = {};
      let isIncomplete = false;

      for (const [colIndex, cell] of row.entries()) {
        const column = columnsByIndex.get(colIndex);
        if (!column) {
          continue;
        }
        const cellValue = this.getCellValue(cell, column);
        const colDef = this.columnDefinitions.get(colIndex);
        const missingValue = isMissingValueCell(cell);

        if (
          colDef?.isRequired &&
          colDef?.isEditable !== false &&
          missingValue
        ) {
          isIncomplete = true;
        }

        if (notNullOrUndefined(cellValue) && cellValue !== "") {
          addedRow[getColumnName(column)] = cellValue;
        }
      }

      if (!isIncomplete) {
        currentState.added_rows.push(addedRow);
      }
    }

    currentState.deleted_rows = this.store.getDeletedRows();

    return JSON.stringify(currentState, (_k, v) =>
      v === undefined ? null : v
    );
  }

  fromJson(editingStateJson: string, columns: BaseColumnProps[]): void {
    this.store.resetTransientState();

    const editingState = JSON.parse(editingStateJson);

    const columnsByName = new Map<string, BaseColumnProps>();
    for (const column of columns) {
      columnsByName.set(getColumnName(column), column);
    }

    const editedRows = editingState.edited_rows ?? {};
    for (const key of Object.keys(editedRows)) {
      const rowIndex = Number(key);
      const editedRow = editedRows[key];
      for (const colName of Object.keys(editedRow)) {
        const cellValue = editedRow[colName];
        const column = columnsByName.get(colName);
        if (!column) {
          continue;
        }
        const colDef = this.columnDefinitions.get(column.indexNumber);
        if (!colDef) {
          continue;
        }
        const cell = this.createCellFromDefinition(cellValue, colDef);
        if (!cell) {
          continue;
        }
        this.store.setCell(column.indexNumber, rowIndex, cell, false);
      }
    }

    for (const row of (editingState.added_rows || []) as Record<
      string,
      unknown
    >[]) {
      const addedRow: Map<number, GridCell> = new Map();

      for (const column of columns) {
        const colDef = this.columnDefinitions.get(column.indexNumber);
        if (!colDef) {
          continue;
        }
        const cell = this.createCellFromDefinition(null, colDef);
        if (cell) {
          addedRow.set(column.indexNumber, cell);
        }
      }

      for (const colName of Object.keys(row)) {
        const column = columnsByName.get(colName);
        if (!column) {
          continue;
        }
        const colDef = this.columnDefinitions.get(column.indexNumber);
        if (!colDef) {
          continue;
        }
        const cell = this.createCellFromDefinition(row[colName], colDef);
        if (cell) {
          addedRow.set(column.indexNumber, cell);
        }
      }

      this.store.addRow(addedRow);
    }

    this.store.setDeletedRows(editingState.deleted_rows || []);
  }
}
