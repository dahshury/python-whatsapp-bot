import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import { formatHijriDate } from "@/lib/hijri-utils";
import { FormattingService } from "../../services/FormattingService";
import type { TempusDateCell } from "../../TempusDominusDateCell";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class DateColumnType implements IColumnType {
	id = "date";
	dataType = ColumnDataType.DATE;

	createCell(
		value: any,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		isDarkTheme: boolean,
		_rowContext?: any,
	): GridCell {
		const date = this.parseValue(value, column);
		const displayDate = this.formatValue(date, column.formatting);

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "tempus-date-cell",
				format: "date",
				date: date,
				displayDate: displayDate,
				isDarkTheme: isDarkTheme,
				freeRoam: column.metadata?.freeRoam || false,
			},
			copyData: displayDate,
			allowOverlay: true,
		} as TempusDateCell;

		// Validate and store error details
		const validation = this.validateValue(date, column);
		if (!validation.isValid) {
			(cell as any).isMissingValue = true;
			(cell as any).validationError = validation.error;
		}

		return cell;
	}

	getCellValue(cell: GridCell): any {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as any).data?.kind === "tempus-date-cell"
		) {
			return (cell as any).data.date;
		}
		return null;
	}

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || "Date",
				),
			};
		}

		if (value && !(value instanceof Date) && !Date.parse(value)) {
			return { isValid: false, error: messages.validation.invalidDate() };
		}

		const date = value instanceof Date ? value : new Date(value);

		if (column.validationRules) {
			for (const rule of column.validationRules) {
				switch (rule.type) {
					case "min":
						if (rule.value) {
							const minDate = new Date(rule.value);
							if (date < minDate) {
								return {
									isValid: false,
									error:
										rule.message ||
										`Date must be after ${minDate.toLocaleDateString()}`,
								};
							}
						}
						break;
					case "max":
						if (rule.value) {
							const maxDate = new Date(rule.value);
							if (date > maxDate) {
								return {
									isValid: false,
									error:
										rule.message ||
										`Date must be before ${maxDate.toLocaleDateString()}`,
								};
							}
						}
						break;
					case "custom":
						if (rule.validate && !rule.validate(date)) {
							return { isValid: false, error: rule.message || "Invalid date" };
						}
						break;
				}
			}
		}

		return { isValid: true };
	}

	formatValue(value: any, formatting?: IColumnFormatting): string {
		if (!value) return "";

		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return "";

		// Check if we should show Hijri date based on locale/language
		const isRTL =
			typeof window !== "undefined" && localStorage.getItem("isRTL") === "true";

		if (isRTL && !formatting?.pattern) {
			// Show Hijri date only
			return formatHijriDate(date);
		}

		if (formatting?.type) {
			return FormattingService.formatValue(date, "date", formatting.type);
		}

		if (formatting?.pattern) {
			return FormattingService.formatValue(date, "date", formatting.pattern);
		}

		return date.toLocaleDateString(formatting?.locale || "en-GB");
	}

	parseValue(input: any, _column: IColumnDefinition): any {
		if (!input) return null;
		if (input instanceof Date) return input;

		const parsed = new Date(input);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	getDefaultValue(column: IColumnDefinition): any {
		if (column.defaultValue === "today") {
			return new Date();
		}
		return column.defaultValue ? new Date(column.defaultValue) : null;
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
