import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class NumberColumnType implements IColumnType {
	id = "number";
	dataType = ColumnDataType.NUMBER;

	createCell(
		value: any,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: any,
	): GridCell {
		const numValue = this.parseValue(String(value || 0), column);
		const displayValue = this.formatValue(numValue, column.formatting);

		const cell: GridCell = {
			kind: GridCellKind.Number,
			data: numValue,
			displayData: displayValue,
			allowOverlay: true,
		};

		if (
			column.isRequired &&
			(numValue === null || numValue === undefined || Number.isNaN(numValue))
		) {
			(cell as any).isMissingValue = true;
		}

		return cell;
	}

	getCellValue(cell: GridCell): any {
		return (cell as any).data || 0;
	}

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		const num = Number(value);

		if (Number.isNaN(num)) {
			return { isValid: false, error: "Must be a valid number" };
		}

		if (column.validationRules) {
			for (const rule of column.validationRules) {
				switch (rule.type) {
					case "min":
						if (rule.value !== undefined && num < rule.value) {
							return {
								isValid: false,
								error: rule.message || `Minimum value is ${rule.value}`,
							};
						}
						break;
					case "max":
						if (rule.value !== undefined && num > rule.value) {
							return {
								isValid: false,
								error: rule.message || `Maximum value is ${rule.value}`,
							};
						}
						break;
					case "custom":
						if (rule.validate && !rule.validate(num)) {
							return { isValid: false, error: rule.message || "Invalid value" };
						}
						break;
				}
			}
		}

		return { isValid: true };
	}

	formatValue(value: any, formatting?: IColumnFormatting): string {
		if (value === null || value === undefined || Number.isNaN(value)) return "";

		const format = formatting?.type || "number";
		const locale = formatting?.locale || undefined;
		const options = formatting?.options || {};

		switch (format) {
			case "currency":
				return new Intl.NumberFormat(locale, {
					style: "currency",
					currency: options.currency || "USD",
					minimumFractionDigits: options.minimumFractionDigits ?? 2,
					maximumFractionDigits: options.maximumFractionDigits ?? 2,
				}).format(value);

			case "percent":
				return new Intl.NumberFormat(locale, {
					style: "percent",
					minimumFractionDigits: options.minimumFractionDigits ?? 1,
					maximumFractionDigits: options.maximumFractionDigits ?? 1,
				}).format(value / 100);

			case "scientific":
				return value.toExponential(options.precision || 2);

			case "compact":
				return new Intl.NumberFormat(locale, {
					notation: "compact",
					...options,
				}).format(value);

			default:
				return new Intl.NumberFormat(locale, {
					minimumFractionDigits: options.minimumFractionDigits ?? 0,
					maximumFractionDigits: options.maximumFractionDigits ?? 2,
					...options,
				}).format(value);
		}
	}

	parseValue(input: string, _column: IColumnDefinition): any {
		const cleaned = input.replace(/[^\d.-]/g, "");
		const num = Number(cleaned);
		return Number.isNaN(num) ? 0 : num;
	}

	getDefaultValue(column: IColumnDefinition): any {
		return column.defaultValue ?? 0;
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
