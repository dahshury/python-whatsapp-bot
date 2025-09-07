import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import { FormattingService } from "../../services/FormattingService";
import type { TimekeeperCell } from "../../TimekeeperCell";
import { messages } from "../../utils/i18n";
import type { IColumnType, IRowContext } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class TimeColumnType implements IColumnType {
	id = "time";
	dataType = ColumnDataType.TIME;

	createCell(
		value: unknown,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		isDarkTheme: boolean,
		rowContext?: IRowContext,
	): GridCell {
		const time = this.parseValue(value, column);
		const displayTime = this.formatValue(time, column.formatting);

		// Get the date from the first available date column for time restrictions
		let selectedDate: Date | undefined;
		if (rowContext?.getRowCellData) {
			try {
				// Look for date columns in the row (typically index 3, but check multiple)
				for (const dateColIndex of [3, 0, 1, 2, 4, 5]) {
					const columnData = rowContext.getRowCellData(dateColIndex);
					if (columnData instanceof Date) {
						// Check if this looks like a date (not a time-only date)
						if (columnData.getFullYear() > 1970) {
							selectedDate = columnData;
							break;
						}
					}
				}
			} catch (error) {
				console.warn(
					"Error getting date column data for time restrictions:",
					error,
				);
			}
		}

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "timekeeper-cell",
				time: time,
				displayTime: displayTime,
				isDarkTheme: isDarkTheme,
				use24Hour: column.metadata?.use24Hour || false,
				selectedDate: selectedDate,
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
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || "Time",
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
		if (!value) return "";

		const date =
			value instanceof Date ? value : this.parseTimeString(String(value));
		if (!date || Number.isNaN(date.getTime())) return "";

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
		const minutesStr = minutes.toString().padStart(2, "0");

		if (use24Hour) {
			return `${hours.toString().padStart(2, "0")}:${minutesStr}`;
		}
		const isPM = hours >= 12;
		const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
		return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
	}

	parseValue(input: unknown, _column: IColumnDefinition): unknown {
		if (!input) return null;
		if (input instanceof Date) return input;

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
		_column: IColumnDefinition,
	): EditableGridCell {
		return cell as EditableGridCell;
	}

	private isValidTimeString(value: string): boolean {
		// Support both 24-hour and 12-hour formats
		const timeRegex24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
		const timeRegex12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i;
		return timeRegex24.test(value) || timeRegex12.test(value);
	}

	private parseTimeString(value: string): Date | null {
		const timeRegex24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
		const timeRegex12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i;

		const date = new Date(1970, 0, 1);

		// Try 24-hour format first
		const match24 = value.match(timeRegex24);
		if (match24?.[1] && match24[2]) {
			date.setHours(Number.parseInt(match24[1], 10));
			date.setMinutes(Number.parseInt(match24[2], 10));
			if (match24[4]) {
				date.setSeconds(Number.parseInt(match24[4], 10));
			}
			return date;
		}

		// Try 12-hour format
		const match12 = value.match(timeRegex12);
		if (match12?.[1] && match12[2] && match12[3]) {
			let hours = Number.parseInt(match12[1], 10);
			const minutes = Number.parseInt(match12[2], 10);
			const isPM = match12[3].toLowerCase() === "pm";

			if (hours === 12 && !isPM) {
				hours = 0; // 12am is 0 hours
			} else if (hours !== 12 && isPM) {
				hours += 12; // Convert PM hours
			}

			date.setHours(hours);
			date.setMinutes(minutes);
			return date;
		}

		return null;
	}
}
