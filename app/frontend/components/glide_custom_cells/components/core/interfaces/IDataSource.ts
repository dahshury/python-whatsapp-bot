import type { GridCell } from "@glideapps/glide-data-grid";

export interface IDataSource {
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
}

export interface IColumnDefinition {
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
}

export enum ColumnDataType {
	TEXT = "text",
	NUMBER = "number",
	DATE = "date",
	TIME = "time",
	DATETIME = "datetime",
	BOOLEAN = "boolean",
	DROPDOWN = "dropdown",
	PHONE = "phone",
	EMAIL = "email",
	URL = "url",
	JSON = "json",
	CUSTOM = "custom",
}

export interface IValidationRule {
	type: "required" | "min" | "max" | "pattern" | "custom";
	value?: unknown;
	message?: string;
	validate?: (value: string) => boolean;
}

export interface IColumnFormatting {
	type?: string;
	pattern?: string;
	locale?: string;
	options?: Record<string, unknown>;
}

export interface IDataProvider {
	getCell(col: number, row: number): GridCell;
	setCell(col: number, row: number, value: GridCell): void;
	getColumnDefinition(col: number): IColumnDefinition;
	getRowCount(): number;
	getColumnCount(): number;
}
