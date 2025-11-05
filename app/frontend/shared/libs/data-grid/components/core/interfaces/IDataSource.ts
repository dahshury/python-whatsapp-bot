import type { GridCell } from "@glideapps/glide-data-grid";

export type IDataSource = {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;

  getColumnDefinitions(): IColumnDefinition[];

  getCellData(col: number, row: number): Promise<unknown>;

  setCellData(col: number, row: number, value: unknown): Promise<boolean>;

  getRowData(row: number): Promise<unknown[]>;

  getColumnData(col: number): Promise<unknown[]>;

  refresh(): Promise<void>;

  addRow(): Promise<number>;

  deleteRow(row: number): Promise<boolean>;

  getDeletedRows(): Set<number>;
};

export type IColumnDefinition = {
  id: string;
  name: string;
  title: string;
  dataType: ColumnDataType;
  width?: number;
  isEditable?: boolean;
  isRequired?: boolean;
  isPinned?: boolean;
  isHidden?: boolean;
  defaultValue?: unknown;
  validationRules?: IValidationRule[];
  formatting?: IColumnFormatting;
  metadata?: Record<string, unknown>;
  validateInput?: (value: string) => boolean | string;
};

export const ColumnDataType = {
  TEXT: "text",
  NUMBER: "number",
  DATE: "date",
  TIME: "time",
  DATETIME: "datetime",
  BOOLEAN: "boolean",
  DROPDOWN: "dropdown",
  EMAIL: "email",
  PHONE: "phone",
  URL: "url",
  JSON: "json",
  CUSTOM: "custom",
} as const;

export type ColumnDataType =
  (typeof ColumnDataType)[keyof typeof ColumnDataType];

export type IValidationRule = {
  type: "required" | "min" | "max" | "pattern" | "custom";
  value?: unknown;
  message?: string;
  validate?: (value: string) => boolean;
};

export type IColumnFormatting = {
  type?: string;
  pattern?: string;
  locale?: string;
  options?: Record<string, unknown>;
};

export type IDataProvider = {
  getCell(col: number, row: number): GridCell;
  setCell(col: number, row: number, value: GridCell): void;
  getColumnDefinition(col: number): IColumnDefinition;
  getRowCount(): number;
  getColumnCount(): number;
};
