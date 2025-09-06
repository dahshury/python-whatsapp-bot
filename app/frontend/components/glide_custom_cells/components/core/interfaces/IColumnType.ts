import type {
	EditableGridCell,
	GridCell,
	Theme,
} from "@glideapps/glide-data-grid";
import type {
	ColumnDataType,
	IColumnDefinition,
	IColumnFormatting,
} from "./IDataSource";

export interface IRowContext {
	row: number;
	getRowCellData?: (col: number) => unknown;
}

export interface IColumnType {
	id: string;
	dataType: ColumnDataType;

	createCell(
		value: unknown,
		column: IColumnDefinition,
		theme: Partial<Theme>,
		isDarkTheme: boolean,
		rowContext?: IRowContext,
	): GridCell;

	getCellValue(cell: GridCell): unknown;

	validateValue(
		value: unknown,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string };

	formatValue(value: unknown, formatting?: IColumnFormatting): string;

	parseValue(input: unknown, column: IColumnDefinition): unknown;

	getDefaultValue(column: IColumnDefinition): unknown;

	canEdit(column: IColumnDefinition): boolean;

	createEditableCell(
		cell: GridCell,
		column: IColumnDefinition,
	): EditableGridCell;

	coercePasteValue?(
		value: string,
		cell: GridCell,
		column: IColumnDefinition,
	): GridCell | undefined;
}

export interface IColumnTypeRegistry {
	register(columnType: IColumnType): void;
	get(dataType: ColumnDataType): IColumnType | undefined;
	getAll(): Map<ColumnDataType, IColumnType>;
	hasType(dataType: ColumnDataType): boolean;
}
