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
		value: unknown,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		isDarkTheme: boolean,
		_rowContext?: unknown,
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
			(
				cell as { isMissingValue?: boolean; validationError?: string }
			).isMissingValue = true;
			(
				cell as { isMissingValue?: boolean; validationError?: string }
			).validationError = validation.error;
		}

		return cell;
	}

	getCellValue(cell: GridCell): unknown {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as { data?: { kind?: string; date?: unknown } }).data?.kind ===
				"tempus-date-cell"
		) {
			return (cell as { data?: { kind?: string; date?: unknown } }).data?.date;
		}
		return null;
	}

	validateValue(
		value: unknown,
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

		if (
			value &&
			!(value instanceof Date) &&
			(typeof value !== "string" || Number.isNaN(Date.parse(String(value))))
		) {
			return { isValid: false, error: messages.validation.invalidDate() };
		}

		const date = value instanceof Date ? value : new Date(String(value));

		if (column.validationRules) {
			for (const rule of column.validationRules) {
				switch (rule.type) {
					case "min":
						if (rule.value !== undefined && rule.value !== null) {
							const rv = rule.value as unknown;
							const minDate =
								rv instanceof Date
									? rv
									: typeof rv === "string" || typeof rv === "number"
										? new Date(rv)
										: undefined;
							if (minDate && date < minDate) {
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
						if (rule.value !== undefined && rule.value !== null) {
							const rv = rule.value as unknown;
							const maxDate =
								rv instanceof Date
									? rv
									: typeof rv === "string" || typeof rv === "number"
										? new Date(rv)
										: undefined;
							if (maxDate && date > maxDate) {
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
						if (rule.validate && !rule.validate(date as unknown as string)) {
							return { isValid: false, error: rule.message || "Invalid date" };
						}
						break;
				}
			}
		}

		return { isValid: true };
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (!value) return "";

		const date = value instanceof Date ? value : new Date(String(value));
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

	parseValue(input: unknown, _column: IColumnDefinition): unknown {
		if (!input) return null;
		if (input instanceof Date) return input;

		const parsed = new Date(String(input));
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		if (column.defaultValue === "today") {
			return new Date();
		}
		return column.defaultValue &&
			(typeof column.defaultValue === "string" ||
				typeof column.defaultValue === "number" ||
				column.defaultValue instanceof Date)
			? new Date(column.defaultValue as string | number | Date)
			: null;
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
