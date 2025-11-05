import {
  type GridCell,
  GridCellKind,
  type Theme,
} from "@glideapps/glide-data-grid";

import type { IColumnDefinition } from "../../core/interfaces/IDataSource";
import type { ColumnTypeRegistry } from "../../core/services/ColumnTypeRegistry";
import type { BaseColumnProps } from "../../core/types";

type ColumnDefinitions = Map<number, IColumnDefinition>;

type ExtractCellValueContext = {
  cell: GridCell;
  column: BaseColumnProps;
  columnDefinitions: ColumnDefinitions;
  columnTypeRegistry: ColumnTypeRegistry;
};

type CreateCellContext = {
  value: unknown;
  columnDefinition: IColumnDefinition;
  columnTypeRegistry: ColumnTypeRegistry;
  theme: Partial<Theme>;
  isDarkTheme: boolean;
};

type ComparisonContext = {
  cell: GridCell;
  columnIndex: number;
  columnDefinitions: ColumnDefinitions;
  columnTypeRegistry: ColumnTypeRegistry;
};

export function extractGridCellValue({
  cell,
  column,
  columnDefinitions,
  columnTypeRegistry,
}: ExtractCellValueContext): unknown {
  const columnDefinition = columnDefinitions.get(column.indexNumber);
  if (!columnDefinition) {
    return (cell as { data?: unknown }).data;
  }

  const columnType = columnTypeRegistry.get(columnDefinition.dataType);
  if (columnType?.getCellValue) {
    return columnType.getCellValue(cell);
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

export function createGridCellFromDefinition({
  value,
  columnDefinition,
  columnTypeRegistry,
  theme,
  isDarkTheme,
}: CreateCellContext): GridCell | null {
  const columnType = columnTypeRegistry.get(columnDefinition.dataType);
  if (columnType?.createCell) {
    return columnType.createCell({
      value,
      column: columnDefinition,
      theme,
      isDarkTheme,
    });
  }

  const stringValue = typeof value === "string" ? value : String(value || "");
  return {
    kind: GridCellKind.Text,
    data: stringValue,
    displayData: stringValue,
    allowOverlay: true,
  };
}

export function extractGridCellValueForComparison({
  cell,
  columnIndex,
  columnDefinitions,
  columnTypeRegistry,
}: ComparisonContext): unknown {
  const columnDefinition = columnDefinitions.get(columnIndex);
  if (columnDefinition) {
    const columnType = columnTypeRegistry.get(columnDefinition.dataType);
    if (columnType?.getCellValue) {
      return columnType.getCellValue(cell);
    }
  }

  const fallbackColumn = { indexNumber: columnIndex } as BaseColumnProps;
  return extractGridCellValue({
    cell,
    column: fallbackColumn,
    columnDefinitions,
    columnTypeRegistry,
  });
}

export function areGridValuesEqual(value1: unknown, value2: unknown): boolean {
  if (value1 == null && value2 == null) {
    return true;
  }
  if (value1 == null || value2 == null) {
    return false;
  }

  if (value1 instanceof Date && value2 instanceof Date) {
    return value1.getTime() === value2.getTime();
  }
  if (value1 instanceof Date || value2 instanceof Date) {
    const date1 =
      value1 instanceof Date
        ? value1
        : new Date(value1 as string | number | Date);
    const date2 =
      value2 instanceof Date
        ? value2
        : new Date(value2 as string | number | Date);
    return (
      !(Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) &&
      date1.getTime() === date2.getTime()
    );
  }

  if (typeof value1 === "number" && typeof value2 === "number") {
    return value1 === value2;
  }

  if (typeof value1 === "string" && typeof value2 === "string") {
    return value1.trim() === value2.trim();
  }

  return value1 === value2;
}
