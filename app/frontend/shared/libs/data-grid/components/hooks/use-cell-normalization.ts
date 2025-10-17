import type {
	EditableGridCell,
	GridCell,
	GridColumn,
} from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import { validateFullName } from "@shared/validation/name";
import React from "react";
import { FormattingService } from "../services/formatting-service";
import { messages } from "../utils/i18n";

// Time format constants
const PM_HOUR_THRESHOLD = 12;
const MIDNIGHT_HOUR_12_FORMAT = 12; // Midnight is displayed as 12 in 12-hour format

type NormalizationContext = {
	columnFormats?: Record<string, string>;
	columns?: GridColumn[];
	col?: number;
};

type TemporalFormatOptions = {
	date: Date;
	cellFormat: string | undefined;
	columnFormats: Record<string, string> | undefined;
	columnId: string | undefined;
	columnType: "date" | "time" | "datetime";
};

type TempusDateCellData = {
	kind?: string;
	date?: Date;
	format?: string;
	displayDate?: string;
};

type TimekeeperCellData = {
	kind?: string;
	time?: Date;
	displayTime?: string;
	use24Hour?: boolean;
};

function normalizeTextCell(cell: EditableGridCell, col?: number): GridCell {
	let text = (cell as GridCell & { data?: string }).data ?? "";
	let hasError = false;
	let errorMessage = "";

	if (col === 0) {
		const validation = validateFullName(text);
		if (!validation.isValid) {
			hasError = true;
			errorMessage =
				validation.errorMessage || messages.validation.invalidName();
		} else if (validation.correctedValue) {
			text = validation.correctedValue;
		}
	}

	return {
		kind: GridCellKind.Text,
		data: text,
		displayData: text,
		allowOverlay: true,
		...(hasError && { hoverEffect: false }),
		...(col === 0 &&
			hasError && {
				isMissingValue: true,
				validationError: errorMessage,
			}),
	} as GridCell;
}

function normalizeNumberCell(
	cell: EditableGridCell,
	context: NormalizationContext
): GridCell {
	const { columnFormats, columns, col } = context;
	const num = (cell as GridCell & { data?: unknown }).data ?? 0;
	const columnId = columns?.[col || 0]?.id;
	const key = (columnId ?? "number") as string;
	const format = String(
		columnFormats?.[key] || columnFormats?.number || "number"
	);

	return {
		kind: GridCellKind.Number,
		data: num,
		displayData: FormattingService.formatValue(
			Number(num),
			"number",
			String(format)
		),
		allowOverlay: true,
	} as GridCell;
}

function formatTemporalValue(options: TemporalFormatOptions): string {
	const { date, columnFormats, columnId, columnType } = options;

	if (columnFormats?.[columnId || columnType] || columnFormats?.[columnType]) {
		const format =
			columnFormats?.[columnId || columnType] || columnFormats?.[columnType];
		return FormattingService.formatValue(date, columnType, String(format));
	}

	if (columnType === "date") {
		return date.toLocaleDateString("en-GB");
	}
	if (columnType === "time") {
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	return date.toLocaleString();
}

function getTemporalFormatType(
	cellFormat: string | undefined
): "date" | "time" | "datetime" {
	if (cellFormat === "date") {
		return "date";
	}
	if (cellFormat === "time") {
		return "time";
	}
	return "datetime";
}

function normalizeTempusDateCell(
	cell: EditableGridCell,
	context: NormalizationContext
): GridCell | null {
	const { columnFormats, columns, col } = context;
	const cellWithDateData = cell as GridCell & {
		data?: TempusDateCellData;
	};

	if (cellWithDateData.data?.kind !== "tempus-date-cell") {
		return null;
	}

	const cellData = cellWithDateData.data;
	const date = cellData.date;

	if (!(date instanceof Date)) {
		return null;
	}

	const columnId = columns?.[col || 0]?.id;
	const cellFormat = cellData.format;
	const columnType = getTemporalFormatType(cellFormat);

	const formattedValue = formatTemporalValue({
		date,
		cellFormat,
		columnFormats,
		columnId,
		columnType,
	});

	(cellData as { displayDate?: string }).displayDate = formattedValue;

	return {
		...cell,
		data: cellData,
		copyData: formattedValue,
	} as unknown as GridCell;
}

function formatTimeValue(
	time: Date,
	use24Hour: boolean,
	format?: string
): string {
	if (format) {
		return FormattingService.formatValue(time, "time", format);
	}

	const hours = time.getHours();
	const minutes = time.getMinutes();
	const minutesStr = minutes.toString().padStart(2, "0");

	if (use24Hour) {
		return `${hours.toString().padStart(2, "0")}:${minutesStr}`;
	}

	const isPM = hours >= PM_HOUR_THRESHOLD;
	let displayHours = hours;

	if (hours === 0) {
		displayHours = MIDNIGHT_HOUR_12_FORMAT;
	} else if (hours > PM_HOUR_THRESHOLD) {
		displayHours = hours - PM_HOUR_THRESHOLD;
	}

	return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
}

function normalizeTimekeeperCell(
	cell: EditableGridCell,
	context: NormalizationContext
): GridCell | null {
	const { columnFormats, columns, col } = context;
	const cellWithTimekeeperData = cell as GridCell & {
		data?: TimekeeperCellData;
	};

	if (cellWithTimekeeperData.data?.kind !== "timekeeper-cell") {
		return null;
	}

	const cellData = cellWithTimekeeperData.data;
	const time = cellData.time;

	if (!(time instanceof Date)) {
		return null;
	}

	const columnId = columns?.[col || 0]?.id;
	const format = columnFormats?.[columnId || "time"] || columnFormats?.time;

	const formattedValue = formatTimeValue(
		time,
		cellData.use24Hour ?? false,
		format
	);

	cellData.displayTime = formattedValue;

	return {
		...cell,
		data: cellData,
		copyData: formattedValue,
	} as unknown as GridCell;
}

function normalizeCustomCell(
	cell: EditableGridCell,
	context: NormalizationContext
): GridCell {
	const tempusResult = normalizeTempusDateCell(cell, context);
	if (tempusResult) {
		return tempusResult;
	}

	const timekeeperResult = normalizeTimekeeperCell(cell, context);
	if (timekeeperResult) {
		return timekeeperResult;
	}

	return cell as unknown as GridCell;
}

export function useCellNormalization(
	columnFormats?: Record<string, string>,
	columns?: GridColumn[]
) {
	return React.useCallback(
		(cell: EditableGridCell, col?: number): GridCell => {
			const context: NormalizationContext = {
				...(columnFormats !== undefined && { columnFormats }),
				...(columns !== undefined && { columns }),
				...(col !== undefined && { col }),
			};

			switch (cell.kind) {
				case GridCellKind.Text:
					return normalizeTextCell(cell, col);
				case GridCellKind.Number:
					return normalizeNumberCell(cell, context);
				case GridCellKind.Custom:
					return normalizeCustomCell(cell, context);
				default:
					return cell as unknown as GridCell;
			}
		},
		[columnFormats, columns]
	);
}
