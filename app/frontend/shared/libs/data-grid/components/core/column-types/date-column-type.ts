import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import { formatHijriDate } from "@shared/libs/date/hijri-utils";
import { FormattingService } from "../../services/formatting-service";
import type { TempusDateCell } from "../../tempus-dominus-date-cell";
import { messages } from "../../utils/i18n";
import type {
	CreateCellOptions,
	IColumnType,
} from "../interfaces/i-column-type";
import {
	COLUMN_DATA_TYPE,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/i-data-source";

export class DateColumnType implements IColumnType {
	id = "date";
	dataType = COLUMN_DATA_TYPE.DATE;

	createCell(options: CreateCellOptions): GridCell {
		const { value, column, isDarkTheme } = options;
		const date = this.parseValue(value, column);
		const displayDate = this.formatValue(date, column.formatting);

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "tempus-date-cell",
				format: "date",
				date,
				displayDate,
				isDarkTheme,
				freeRoam: column.metadata?.freeRoam,
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
			).validationError = validation.error || "";
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

	private parseDateValue(value: unknown): Date | undefined {
		if (value === undefined || value === null) {
			return;
		}
		if (value instanceof Date) {
			return value;
		}
		if (typeof value === "string" || typeof value === "number") {
			return new Date(value);
		}
		return;
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || "Date"
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
			const rulesError = this.validateDateRules(date, column.validationRules);
			if (rulesError) {
				return rulesError;
			}
		}

		return { isValid: true };
	}

	private validateDateRules(
		date: Date,
		rules: IColumnDefinition["validationRules"]
	): { isValid: boolean; error?: string } | null {
		if (!rules) {
			return null;
		}

		for (const rule of rules) {
			switch (rule.type) {
				case "min": {
					const error = this.validateDateMin(date, rule);
					if (error) {
						return error;
					}
					break;
				}
				case "max": {
					const error = this.validateDateMax(date, rule);
					if (error) {
						return error;
					}
					break;
				}
				case "custom":
					if (rule.validate && !rule.validate(date as unknown as string)) {
						return { isValid: false, error: rule.message || "Invalid date" };
					}
					break;
				default:
					// Other rule types are not applicable for dates
					break;
			}
		}

		return null;
	}

	private validateDateMin(
		date: Date,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		if (!rule || typeof rule !== "object") {
			return null;
		}

		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value === undefined || ruleObj.value === null) {
			return null;
		}

		const minDate = this.parseDateValue(ruleObj.value);
		if (minDate && date < minDate) {
			return {
				isValid: false,
				error:
					ruleObj.message ||
					`Date must be after ${minDate.toLocaleDateString()}`,
			};
		}

		return null;
	}

	private validateDateMax(
		date: Date,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		if (!rule || typeof rule !== "object") {
			return null;
		}

		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value === undefined || ruleObj.value === null) {
			return null;
		}

		const maxDate = this.parseDateValue(ruleObj.value);
		if (maxDate && date > maxDate) {
			return {
				isValid: false,
				error:
					ruleObj.message ||
					`Date must be before ${maxDate.toLocaleDateString()}`,
			};
		}

		return null;
	}

	formatValue(
		value: unknown,
		formatting?: IColumnFormatting,
		isLocalized?: boolean
	): string {
		if (!value) {
			return "";
		}

		const date = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(date.getTime())) {
			return "";
		}

		// Check if we should show Hijri date based on locale/language
		const isLocalizedFlag =
			isLocalized === true ||
			(typeof window !== "undefined" &&
				localStorage.getItem("isLocalized") === "true");

		if (isLocalizedFlag && !formatting?.pattern) {
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
		if (!input) {
			return null;
		}
		if (input instanceof Date) {
			return input;
		}

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
		_column: IColumnDefinition
	): EditableGridCell {
		return cell as EditableGridCell;
	}
}
