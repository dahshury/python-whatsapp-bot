import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import { FormattingService } from "../../services/formatting-service";
import type { TimekeeperCell } from "../../timekeeper-cell";
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

// Constants for date column index checks
const PREFERRED_DATE_COLUMN_INDEX = 3;
const EPOCH_YEAR = 1970;
const FALLBACK_INDEX_0 = 0;
const FALLBACK_INDEX_1 = 1;
const FALLBACK_INDEX_2 = 2;
const FALLBACK_INDEX_4 = 4;
const FALLBACK_INDEX_5 = 5;
// Array of column indices to check for date data, ordered by preference
const DATE_COLUMN_INDICES = [
	PREFERRED_DATE_COLUMN_INDEX, // First choice: index 3
	FALLBACK_INDEX_0, // Fallback: index 0
	FALLBACK_INDEX_1, // Fallback: index 1
	FALLBACK_INDEX_2, // Fallback: index 2
	FALLBACK_INDEX_4, // Fallback: index 4
	FALLBACK_INDEX_5, // Fallback: index 5
] as const;

// Time format constants
const HOUR_THRESHOLD_12_24 = 12;
const HOUR_MIDNIGHT = 0;
const HOUR_PM_OFFSET = 12;
const PAD_WIDTH = 2;
const TIME_REGEX_24_HOUR = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
const TIME_REGEX_12_HOUR = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i;
// Time constants for parsing
const EPOCH_YEAR_MONTH = 1970;
const JANUARY = 0;
const FIRST_DAY = 1;

export class TimeColumnType implements IColumnType {
	id = "time";
	dataType = COLUMN_DATA_TYPE.TIME;

	createCell(options: CreateCellOptions): GridCell {
		const { value, column, rowContext } = options;
		const time = this.parseValue(value, column);
		const displayTime = this.formatValue(time, column.formatting);

		// Get the date from the first available date column for time restrictions
		let selectedDate: Date | undefined;
		if (rowContext?.getRowCellData) {
			try {
				// Look for date columns in the row (typically index 3, but check multiple)
				for (const dateColIndex of DATE_COLUMN_INDICES) {
					const columnData = rowContext.getRowCellData(dateColIndex);
					if (
						columnData instanceof Date &&
						columnData.getFullYear() > EPOCH_YEAR
					) {
						// Check if this looks like a date (not a time-only date)
						selectedDate = columnData;
						break;
					}
				}
			} catch {
				// Silently continue if row cell data cannot be retrieved
			}
		}

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "timekeeper-cell",
				time,
				displayTime,
				isDarkTheme: options.isDarkTheme,
				use24Hour: column.metadata?.use24Hour,
				selectedDate,
			},
			copyData: displayTime,
			allowOverlay: true,
		} as TimekeeperCell;

		// Validate and store error details
		const validation = this.validateValue(time, column);
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
			(cell as { data?: { kind?: string } }).data?.kind === "timekeeper-cell"
		) {
			return (cell as { data?: { time?: unknown } }).data?.time;
		}
		return null;
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || "Time"
				),
			};
		}

		if (
			value &&
			!(value instanceof Date) &&
			!this.isValidTimeString(String(value))
		) {
			return { isValid: false, error: messages.validation.invalidTime() };
		}

		return { isValid: true };
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (!value) {
			return "";
		}

		const date =
			value instanceof Date ? value : this.parseTimeString(String(value));
		if (!date || Number.isNaN(date.getTime())) {
			return "";
		}

		if (formatting?.type) {
			return FormattingService.formatValue(date, "time", formatting.type);
		}

		if (formatting?.pattern) {
			return FormattingService.formatValue(date, "time", formatting.pattern);
		}

		// Default formatting based on use24Hour
		const use24Hour = formatting?.options?.hour12 === false;
		const hours = date.getHours();
		const minutes = date.getMinutes();
		const minutesStr = minutes.toString().padStart(PAD_WIDTH, "0");

		if (use24Hour) {
			return `${hours.toString().padStart(PAD_WIDTH, "0")}:${minutesStr}`;
		}

		const isPM = hours >= HOUR_THRESHOLD_12_24;
		let displayHours = hours;
		if (hours === HOUR_MIDNIGHT) {
			displayHours = HOUR_THRESHOLD_12_24;
		} else if (hours > HOUR_THRESHOLD_12_24) {
			displayHours = hours - HOUR_PM_OFFSET;
		}
		return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
	}

	parseValue(input: unknown, _column: IColumnDefinition): unknown {
		if (!input) {
			return null;
		}
		if (input instanceof Date) {
			return input;
		}

		return this.parseTimeString(String(input));
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		if (column.defaultValue === "now") {
			return new Date();
		}
		return column.defaultValue
			? this.parseTimeString(String(column.defaultValue))
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

	private isValidTimeString(value: string): boolean {
		// Support both 24-hour and 12-hour formats
		return TIME_REGEX_24_HOUR.test(value) || TIME_REGEX_12_HOUR.test(value);
	}

	private parseTimeString(value: string): Date | null {
		const date = new Date(EPOCH_YEAR_MONTH, JANUARY, FIRST_DAY);

		// Try 24-hour format first
		const match24 = value.match(TIME_REGEX_24_HOUR);
		if (match24?.[1] && match24[2]) {
			date.setHours(Number.parseInt(match24[1], 10));
			date.setMinutes(Number.parseInt(match24[2], 10));
			if (match24[4]) {
				date.setSeconds(Number.parseInt(match24[4], 10));
			}
			return date;
		}

		// Try 12-hour format
		const match12 = value.match(TIME_REGEX_12_HOUR);
		if (match12?.[1] && match12[2] && match12[3]) {
			let hours = Number.parseInt(match12[1], 10);
			const minutes = Number.parseInt(match12[2], 10);
			const isPM = match12[3].toLowerCase() === "pm";

			if (hours === HOUR_THRESHOLD_12_24 && !isPM) {
				hours = HOUR_MIDNIGHT; // 12am is 0 hours
			} else if (hours !== HOUR_THRESHOLD_12_24 && isPM) {
				hours += HOUR_PM_OFFSET; // Convert PM hours
			}

			date.setHours(hours);
			date.setMinutes(minutes);
			return date;
		}

		return null;
	}
}
