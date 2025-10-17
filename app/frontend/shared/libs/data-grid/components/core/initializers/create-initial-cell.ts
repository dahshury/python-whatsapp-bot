import {
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import { generateGridSampleData } from "@shared/libs/data-grid/utils/sample-data";
import { FormattingService } from "../../services/formatting-service";
import type { TempusDateCell } from "../../tempus-dominus-date-cell";
import type { TimekeeperCell } from "../../timekeeper-cell";

// Constants for column indices
const COLUMN_INDEX_TEXT = 0;
const COLUMN_INDEX_DROPDOWN = 1;
const COLUMN_INDEX_NUMBER = 2;
const COLUMN_INDEX_DATE = 3;
const COLUMN_INDEX_TIME = 4;

export type CreateInitialCellContext = {
	col: number;
	row: number;
	theme: Partial<Theme>;
	darkTheme: Partial<Theme>;
	columnFormats?: Record<string, string>;
	columnId?: string;
};

type DateCellOptions = {
	data: unknown;
	columnFormats?: Record<string, string>;
	columnId?: string;
	isDarkTheme?: boolean;
};

type TimeCellOptions = {
	data: unknown;
	columnFormats?: Record<string, string>;
	columnId?: string;
	isDarkTheme?: boolean;
};

function createTextCell(data: unknown): GridCell {
	return {
		kind: GridCellKind.Text,
		data: String(data ?? ""),
		displayData: String(data ?? ""),
		allowOverlay: true,
	};
}

function createDropdownCell(data: unknown): GridCell {
	return {
		kind: GridCellKind.Custom,
		data: {
			kind: "dropdown-cell",
			allowedValues: ["Option A", "Option B", "Option C"],
			value: String(data ?? ""),
		},
		copyData: String(data ?? ""),
		allowOverlay: true,
	} as GridCell;
}

function createNumberCell(
	data: unknown,
	columnFormats?: Record<string, string>,
	columnId?: string
): GridCell {
	const format =
		columnFormats?.[columnId || "number"] || columnFormats?.number || "number";
	return {
		kind: GridCellKind.Number,
		data: Number(data ?? 0),
		displayData: FormattingService.formatValue(
			Number(data ?? 0),
			"number",
			String(format)
		),
		allowOverlay: true,
	};
}

function createDateCell(options: DateCellOptions): TempusDateCell {
	const { data, columnFormats, columnId, isDarkTheme } = options;
	const dateFormat = columnFormats?.[columnId || "date"] || columnFormats?.date;
	const formattedDate = formatDateForDisplay(data, dateFormat);
	return {
		kind: GridCellKind.Custom,
		data: {
			kind: "tempus-date-cell",
			format: "date",
			date: data instanceof Date ? data : new Date(),
			displayDate: formattedDate,
			isDarkTheme: isDarkTheme ?? false,
		},
		copyData: formattedDate,
		allowOverlay: true,
	} as TempusDateCell;
}

function createTimeCell(options: TimeCellOptions): TimekeeperCell {
	const { data, columnFormats, columnId, isDarkTheme } = options;
	const timeFormat = columnFormats?.[columnId || "time"] || columnFormats?.time;
	const use24Hour = Boolean(
		(columnFormats as { use24Hour?: boolean })?.use24Hour
	);
	const formattedTime = formatTimeForDisplay(data, timeFormat);
	return {
		kind: GridCellKind.Custom,
		data: {
			kind: "timekeeper-cell",
			time: data instanceof Date ? data : new Date(),
			displayTime: formattedTime,
			isDarkTheme: isDarkTheme ?? false,
			use24Hour,
		},
		copyData: formattedTime,
		allowOverlay: true,
	} as TimekeeperCell;
}

function formatDateForDisplay(data: unknown, dateFormat?: string): string {
	if (!(data instanceof Date)) {
		return "";
	}
	if (dateFormat) {
		return FormattingService.formatValue(data, "date", dateFormat);
	}
	return data.toLocaleDateString("en-GB");
}

function formatTimeForDisplay(data: unknown, timeFormat?: string): string {
	if (!(data instanceof Date)) {
		return "";
	}
	if (timeFormat) {
		return FormattingService.formatValue(data, "time", timeFormat);
	}
	return data.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function createInitialCell(context: CreateInitialCellContext): GridCell {
	const { col, row, theme, darkTheme, columnFormats, columnId } = context;
	const data = generateGridSampleData(row, col);
	const isDarkTheme = theme === darkTheme;

	switch (col) {
		case COLUMN_INDEX_TEXT:
			return createTextCell(data);

		case COLUMN_INDEX_DROPDOWN:
			return createDropdownCell(data);

		case COLUMN_INDEX_NUMBER:
			return createNumberCell(data, columnFormats, columnId);

		case COLUMN_INDEX_DATE:
			return createDateCell({
				data,
				...(columnFormats !== undefined && { columnFormats }),
				...(columnId !== undefined && { columnId }),
				isDarkTheme,
			});

		case COLUMN_INDEX_TIME:
			return createTimeCell({
				data,
				...(columnFormats !== undefined && { columnFormats }),
				...(columnId !== undefined && { columnId }),
				isDarkTheme,
			});

		default:
			return createTextCell(data);
	}
}
