import type { GridCell, GridColumn } from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import { validateFullName } from "@shared/validation/name";
import { FormattingService } from "./formatting-service";

// Constants for time formatting to avoid magic numbers
const NOON_HOUR = 12;

export function ensureNumberDisplayData(
	storedCell: GridCell,
	col: number,
	columns?: GridColumn[],
	columnFormats?: Record<string, string>
): void {
	if (storedCell.kind !== GridCellKind.Number) {
		return;
	}
	const raw = (storedCell as GridCell & { data?: unknown }).data;
	const columnId = columns?.[col]?.id;
	const key = (columnId ?? "number") as string;
	const format = String(
		columnFormats?.[key] || columnFormats?.number || "number"
	);
	const formatted =
		raw !== undefined && raw !== null
			? FormattingService.formatValue(Number(raw), "number", format)
			: "";
	(storedCell as { displayData?: string }).displayData = formatted;
}

function getFormatAndType(
	fmt: string | undefined,
	columnId: string | undefined,
	columnFormats?: Record<string, string>
): { format: string | undefined; columnType: "date" | "time" | "datetime" } {
	const formatMap: Record<
		string,
		{ type: "date" | "time" | "datetime"; key: string }
	> = {
		date: { type: "date", key: "date" },
		time: { type: "time", key: "time" },
	};

	const spec = formatMap[fmt || "datetime"] || {
		type: "datetime" as const,
		key: "datetime",
	};

	return {
		format: columnFormats?.[columnId || spec.key] || columnFormats?.[spec.key],
		columnType: spec.type,
	};
}

function getDefaultFormatAndType(fmt: string | undefined): {
	format: string;
	type: "time" | "date" | "datetime";
} {
	if (fmt === "date") {
		return { format: "localized", type: "date" };
	}
	if (fmt === "time") {
		return { format: "automatic", type: "time" };
	}
	return { format: "localized", type: "datetime" };
}

function updateCellFormatting(
	cellData: unknown,
	storedCell: GridCell,
	formatted: string
): void {
	(cellData as { displayDate?: string }).displayDate = formatted;
	(storedCell as GridCell & { copyData?: string }).copyData = formatted;
}

export function updateTempusDateCellFormatting(
	storedCell: GridCell,
	col: number,
	columns?: GridColumn[],
	columnFormats?: Record<string, string>
): void {
	const cellWithDateData = storedCell as GridCell & {
		data?: {
			kind?: string;
			date?: Date;
			format?: string;
			displayDate?: string;
		};
	};
	if (storedCell.kind !== GridCellKind.Custom) {
		return;
	}
	if (cellWithDateData.data?.kind !== "tempus-date-cell") {
		return;
	}
	const cellData = cellWithDateData.data;
	const date = cellData.date;
	if (!(date instanceof Date)) {
		return;
	}

	const columnId = columns?.[col]?.id;
	const fmt = (cellData as { format?: string }).format;
	const { format, columnType } = getFormatAndType(fmt, columnId, columnFormats);

	if (format) {
		const formattedValue = FormattingService.formatValue(
			date,
			columnType,
			format
		);
		updateCellFormatting(cellData, storedCell, formattedValue);
	} else {
		const { format: defaultFormat, type: fallbackType } =
			getDefaultFormatAndType(fmt);
		const fallback = FormattingService.formatValue(
			date,
			fallbackType,
			defaultFormat
		);
		updateCellFormatting(cellData, storedCell, fallback);
	}
}

function formatTime12Hour(time: Date): string {
	const hours = time.getHours();
	const minutes = time.getMinutes();
	const minutesStr = minutes.toString().padStart(2, "0");

	const isPM = hours >= NOON_HOUR;
	let displayHours: number;
	if (hours === 0) {
		displayHours = NOON_HOUR;
	} else if (hours > NOON_HOUR) {
		displayHours = hours - NOON_HOUR;
	} else {
		displayHours = hours;
	}
	return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
}

function formatTime24Hour(time: Date): string {
	const hours = time.getHours();
	const minutes = time.getMinutes();
	const minutesStr = minutes.toString().padStart(2, "0");
	return `${hours.toString().padStart(2, "0")}:${minutesStr}`;
}

export function updateTimekeeperCellFormatting(
	storedCell: GridCell,
	col: number,
	columns?: GridColumn[],
	columnFormats?: Record<string, string>
): void {
	const cellWithTimekeeperData = storedCell as GridCell & {
		data?: {
			kind?: string;
			time?: Date;
			displayTime?: string;
			use24Hour?: boolean;
		};
	};
	if (storedCell.kind !== GridCellKind.Custom) {
		return;
	}
	if (cellWithTimekeeperData.data?.kind !== "timekeeper-cell") {
		return;
	}
	const cellData = cellWithTimekeeperData.data;
	const time = cellData.time;
	if (!(time instanceof Date)) {
		return;
	}

	const columnId = columns?.[col]?.id;
	const format = columnFormats?.[columnId || "time"] || columnFormats?.time;
	let formattedValue: string;
	if (format) {
		formattedValue = FormattingService.formatValue(time, "time", format);
	} else {
		const use24Hour = (cellData as { use24Hour?: boolean }).use24Hour;
		formattedValue = use24Hour
			? formatTime24Hour(time)
			: formatTime12Hour(time);
	}

	(cellData as { displayTime?: string }).displayTime = formattedValue;
	(storedCell as GridCell & { copyData?: string }).copyData = formattedValue;
}

export function applyNameValidationToCell(
	storedCell: GridCell,
	col: number
): void {
	if (col !== 0 || storedCell.kind !== GridCellKind.Text) {
		return;
	}
	const cellWithValidation = storedCell as GridCell & {
		data?: string;
		displayData?: string;
		isMissingValue?: boolean;
		validationError?: string;
	};
	const data = cellWithValidation.data || "";
	const validation = validateFullName(data);
	if (validation.isValid) {
		cellWithValidation.isMissingValue = false;
		if (validation.correctedValue && validation.correctedValue !== data) {
			cellWithValidation.data = validation.correctedValue;
			cellWithValidation.displayData = validation.correctedValue;
		}
	} else {
		cellWithValidation.isMissingValue = true;
		cellWithValidation.validationError =
			validation.errorMessage || "Validation error";
	}
}
