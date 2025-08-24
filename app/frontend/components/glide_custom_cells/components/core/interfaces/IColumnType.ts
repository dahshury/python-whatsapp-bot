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
	getRowCellData?: (col: number) => any;
}

export interface IColumnType {
	id: string;
	dataType: ColumnDataType;

	createCell(
		value: any,
		column: IColumnDefinition,
		theme: Partial<Theme>,
		isDarkTheme: boolean,
		rowContext?: IRowContext,
	): GridCell;

	getCellValue(cell: GridCell): any;

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string };

	formatValue(value: any, formatting?: IColumnFormatting): string;

	parseValue(input: string, column: IColumnDefinition): any;

	getDefaultValue(column: IColumnDefinition): any;

	canEdit(column: IColumnDefinition): boolean;

	createEditableCell(
		cell: GridCell,
		column: IColumnDefinition,
	): EditableGridCell;
}

export interface IColumnTypeRegistry {
	register(columnType: IColumnType): void;
	get(dataType: ColumnDataType): IColumnType | undefined;
	getAll(): Map<ColumnDataType, IColumnType>;
	hasType(dataType: ColumnDataType): boolean;
}
