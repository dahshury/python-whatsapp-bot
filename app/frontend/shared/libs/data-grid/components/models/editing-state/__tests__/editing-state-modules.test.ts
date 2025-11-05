import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";
import { beforeEach, describe, expect, it } from "vitest";
import { messages } from "@/shared/libs/i18n";
import {
  ColumnDataType,
  type IColumnDefinition,
} from "../../../../core/interfaces/IDataSource";
import { ColumnTypeRegistry } from "../../../../core/services/ColumnTypeRegistry";
import type { BaseColumnProps } from "../../../../core/types";
import {
  areGridValuesEqual,
  createGridCellFromDefinition,
  EditingStateSerializer,
  EditingStateStore,
  EditingStateValidator,
  extractGridCellValue,
} from "../index";

const createTextCell = (value: string): GridCell => ({
  kind: GridCellKind.Text,
  data: value,
  displayData: value,
  allowOverlay: true,
});

const baseColumnDefinition: IColumnDefinition = {
  id: "name",
  name: "name",
  title: "Name",
  dataType: ColumnDataType.TEXT,
  isEditable: true,
  isRequired: true,
};

const baseColumn: BaseColumnProps = {
  id: "name",
  name: "name",
  title: "Name",
  width: 120,
  isEditable: true,
  isHidden: false,
  isPinned: false,
  isRequired: true,
  isIndex: false,
  indexNumber: 0,
};

const registry = ColumnTypeRegistry.getInstance();

const getCellValue = (
  cell: GridCell,
  column: BaseColumnProps,
  columnDefinitions: Map<number, IColumnDefinition>
): unknown =>
  extractGridCellValue({
    cell,
    column,
    columnDefinitions,
    columnTypeRegistry: registry,
  });

const createCellFromDefinition = (
  value: unknown,
  columnDefinition: IColumnDefinition
): GridCell | null =>
  createGridCellFromDefinition({
    value,
    columnDefinition,
    columnTypeRegistry: registry,
    theme: {},
    isDarkTheme: false,
  });

beforeEach(() => {
  registry.clear();
});

describe("EditingStateStore", () => {
  it("tracks edited cells and clears them when reverted to original values", () => {
    const store = new EditingStateStore(2);
    const editedCell = createTextCell("updated");

    store.storeOriginalValue(0, 0, "original");
    store.setCell(0, 0, editedCell, false);

    const editedRows = Array.from(store.editedRowEntries());
    expect(editedRows).toHaveLength(1);
    expect(editedRows[0][0]).toBe(0);
    expect(editedRows[0][1].get(0)).toBe(editedCell);

    store.setCell(0, 0, editedCell, true);
    expect(Array.from(store.editedRowEntries())).toHaveLength(0);
  });

  it("handles added rows separately from deleted base rows", () => {
    const store = new EditingStateStore(1);
    const addedCell = createTextCell("added");

    store.addRow(new Map([[0, addedCell]]));
    expect(store.getAddedRows()).toHaveLength(1);

    const addedRowIndex = store.getBaseRowCount();
    store.deleteRow(addedRowIndex);
    expect(store.getAddedRows()).toHaveLength(0);

    store.deleteRow(0);
    expect(store.getDeletedRows()).toEqual([0]);
  });
});

describe("EditingStateSerializer", () => {
  it("serializes edited rows into JSON structure", () => {
    const store = new EditingStateStore(1);
    const columnDefinitions = new Map<number, IColumnDefinition>([
      [0, baseColumnDefinition],
    ]);
    const serializer = new EditingStateSerializer({
      store,
      columnDefinitions,
      getCellValue: (cell, column) =>
        getCellValue(cell, column, columnDefinitions),
      createCellFromDefinition: (value, colDef) =>
        createCellFromDefinition(value, colDef),
      areValuesEqual: areGridValuesEqual,
    });

    store.storeOriginalValue(0, 0, "original");
    store.setCell(0, 0, createTextCell("edited"), false);

    const json = serializer.toJson([baseColumn]);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({
      edited_rows: {
        0: { name: "edited" },
      },
      added_rows: [],
      deleted_rows: [],
    });
  });

  it("restores store state from JSON payload", () => {
    const store = new EditingStateStore(1);
    const columnDefinitions = new Map<number, IColumnDefinition>([
      [0, baseColumnDefinition],
    ]);
    const serializer = new EditingStateSerializer({
      store,
      columnDefinitions,
      getCellValue: (cell, column) =>
        getCellValue(cell, column, columnDefinitions),
      createCellFromDefinition: (value, colDef) =>
        createCellFromDefinition(value, colDef),
      areValuesEqual: areGridValuesEqual,
    });

    const jsonState = JSON.stringify({
      edited_rows: {
        0: { name: "restored" },
      },
      added_rows: [{ name: "new entry" }],
      deleted_rows: [0],
    });

    serializer.fromJson(jsonState, [baseColumn]);

    const editedRows = Array.from(store.editedRowEntries());
    expect(editedRows).toHaveLength(1);
    expect(editedRows[0][0]).toBe(0);
    expect(store.getDeletedRows()).toEqual([0]);
    expect(store.getAddedRows()).toHaveLength(1);

    const restoredCell = store.getCell(0, 0);
    expect(restoredCell?.kind).toBe(GridCellKind.Text);
    expect(restoredCell?.data).toBe("restored");
  });
});

describe("EditingStateValidator", () => {
  it("reports validation errors for edited cells missing required values", () => {
    const store = new EditingStateStore(1);
    const columnDefinitions = new Map<number, IColumnDefinition>([
      [0, baseColumnDefinition],
    ]);
    const validator = new EditingStateValidator({
      store,
      columnDefinitions,
      columnTypeRegistry: registry,
      getCellValue: (cell, column) =>
        getCellValue(cell, column, columnDefinitions),
    });

    store.storeOriginalValue(0, 0, "original");
    const emptyCell = {
      ...createTextCell(""),
      isMissingValue: true,
      validationError: "Custom error",
    } as GridCell & {
      isMissingValue: boolean;
      validationError: string;
    };
    store.setCell(0, 0, emptyCell, false);

    const { isValid, errors } = validator.validate([baseColumn]);
    expect(isValid).toBe(false);
    expect(errors).toEqual([{ row: 0, col: 0, message: "Custom error" }]);
  });

  it("validates required values for added rows", () => {
    const store = new EditingStateStore(1);
    const columnDefinitions = new Map<number, IColumnDefinition>([
      [0, baseColumnDefinition],
    ]);
    const validator = new EditingStateValidator({
      store,
      columnDefinitions,
      columnTypeRegistry: registry,
      getCellValue: (cell, column) =>
        getCellValue(cell, column, columnDefinitions),
    });

    store.addRow(new Map([[0, createTextCell("")]]));

    const { isValid, errors } = validator.validate([baseColumn]);
    expect(isValid).toBe(false);

    const expectedMessage = messages.validation.required(baseColumn.title);
    expect(errors).toContainEqual({
      row: 1,
      col: 0,
      message: expectedMessage,
    });
  });

  it("returns valid when all required cells contain values", () => {
    const store = new EditingStateStore(1);
    const columnDefinitions = new Map<number, IColumnDefinition>([
      [0, baseColumnDefinition],
    ]);
    const validator = new EditingStateValidator({
      store,
      columnDefinitions,
      columnTypeRegistry: registry,
      getCellValue: (cell, column) =>
        getCellValue(cell, column, columnDefinitions),
    });

    store.storeOriginalValue(0, 0, "original");
    store.setCell(0, 0, createTextCell("value"), false);

    const result = validator.validate([baseColumn]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
