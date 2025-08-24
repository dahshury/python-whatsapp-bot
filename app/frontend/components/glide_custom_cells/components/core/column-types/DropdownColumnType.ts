import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class DropdownColumnType implements IColumnType {
	id = "dropdown";
	dataType = ColumnDataType.DROPDOWN;

	createCell(
		value: any,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: any,
	): GridCell {
		const options = column.metadata?.options || [];
		const selectedValue = value || column.defaultValue || "";

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "dropdown-cell",
				allowedValues: options,
				value: selectedValue,
			},
			copyData: selectedValue,
			allowOverlay: true,
		} as any;

		// Validate and store error details
		const validation = this.validateValue(selectedValue, column);
		if (!validation.isValid) {
			cell.isMissingValue = true;
			cell.validationError = validation.error;
		}

		return cell;
	}

	getCellValue(cell: GridCell): any {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as any).data?.kind === "dropdown-cell"
		) {
			return (cell as any).data.value;
		}
		return "";
	}

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || "Selection",
				),
			};
		}

		const options = column.metadata?.options || [];
		if (value && !options.includes(value)) {
			return { isValid: false, error: messages.validation.invalidFormat() };
		}

		return { isValid: true };
	}

	formatValue(value: any, _formatting?: IColumnFormatting): string {
		return String(value || "");
	}

	parseValue(input: string, _column: IColumnDefinition): any {
		return input;
	}

	getDefaultValue(column: IColumnDefinition): any {
		return column.defaultValue || "";
	}

	canEdit(column: IColumnDefinition): boolean {
		return column.isEditable !== false;
	}

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition,
	): EditableGridCell {
		return cell as EditableGridCell;
	}
}
