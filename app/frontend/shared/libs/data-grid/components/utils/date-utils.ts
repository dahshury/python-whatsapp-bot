import { useCallback } from "react";
import type { TempusFormat } from "../services/tempus-dominus.types";

// Date parsing regex patterns
const DATE_REGEX = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;
const TIME_REGEX = /^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/;
const DATETIME_REGEX =
	/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/;
const YEAR_THRESHOLD = 100;
const CENTURY_OFFSET = 2000;
const HOURS_THRESHOLD = 12;
const TIME_STRING_SLICE_END = 5;

// DD/MM/YYYY (en-GB)
export const toLocalDateInputValue = (date: Date): string =>
	date.toLocaleDateString("en-GB");

// YYYY-MM-DDTHH:mm (native datetime-local)
export const toLocalDateTimeInputValue = (date: Date): string => {
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
		date.getMinutes()
	)}`;
};

export const formatDisplayDate = (
	date: Date,
	format?: TempusFormat
): string => {
	if (!date) {
		return "";
	}
	switch (format) {
		case "time":
			return date.toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
		case "datetime":
			return date.toLocaleString("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
		default:
			return date.toLocaleDateString("en-GB");
	}
};

/**
 * Parse date in dd/MM/yyyy format
 */
function parseDateFormat(s: string): Date | undefined {
	const m = s.match(DATE_REGEX);
	if (!(m?.[1] && m[2] && m[3])) {
		return;
	}
	const day = Number.parseInt(m[1], 10);
	const month = Number.parseInt(m[2], 10) - 1;
	let year = Number.parseInt(m[3], 10);
	if (year < YEAR_THRESHOLD) {
		year += CENTURY_OFFSET;
	}
	const d = new Date(year, month, day);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Parse time in HH:mm or hh:mm AM/PM format
 */
function parseTimeFormat(s: string): Date | undefined {
	const m = s.match(TIME_REGEX);
	if (!(m?.[1] && m[2])) {
		return;
	}
	let hours = Number.parseInt(m[1], 10);
	const minutes = Number.parseInt(m[2], 10);
	const ampm = m[3]?.toLowerCase();
	if (ampm) {
		if (ampm === "pm" && hours < HOURS_THRESHOLD) {
			hours += HOURS_THRESHOLD;
		}
		if (ampm === "am" && hours === HOURS_THRESHOLD) {
			hours = 0;
		}
	}
	const today = new Date();
	const d = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
		hours,
		minutes
	);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Parse datetime in dd/MM/yyyy hh:mm AM/PM format
 */
function parseDateTimeFormat(s: string): Date | undefined {
	const m = s.match(DATETIME_REGEX);
	if (!(m?.[1] && m[2] && m[3] && m[4] && m[5] && m[6])) {
		return;
	}
	const day = Number.parseInt(m[1], 10);
	const month = Number.parseInt(m[2], 10) - 1;
	let year = Number.parseInt(m[3], 10);
	if (year < YEAR_THRESHOLD) {
		year += CENTURY_OFFSET;
	}
	let hours = Number.parseInt(m[4], 10);
	const minutes = Number.parseInt(m[5], 10);
	const ampm = m[6].toLowerCase();
	if (ampm === "pm" && hours < HOURS_THRESHOLD) {
		hours += HOURS_THRESHOLD;
	}
	if (ampm === "am" && hours === HOURS_THRESHOLD) {
		hours = 0;
	}
	const d = new Date(year, month, day, hours, minutes);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

export const parseDisplayToDate = (
	display?: string,
	format?: TempusFormat
): Date | undefined => {
	if (!display || typeof display !== "string") {
		return;
	}
	const s = display.trim();
	if (!s) {
		return;
	}
	try {
		if (format === "date") {
			return parseDateFormat(s);
		}
		if (format === "time") {
			return parseTimeFormat(s);
		}
		return parseDateTimeFormat(s);
	} catch {
		return;
	}
};

export const getInputType = (
	format?: TempusFormat
): "text" | "time" | "datetime-local" => {
	switch (format) {
		case "time":
			return "time";
		case "datetime":
			return "datetime-local";
		default:
			return "text";
	}
};

export const getInputValue = (
	date?: Date,
	format?: TempusFormat,
	displayDate?: string
): string => {
	let baseDate = date;
	if (!baseDate && displayDate) {
		baseDate = parseDisplayToDate(displayDate, format);
	}
	if (!baseDate) {
		return "";
	}
	switch (format) {
		case "time":
			return baseDate.toTimeString().slice(0, TIME_STRING_SLICE_END);
		case "datetime":
			return toLocalDateTimeInputValue(baseDate);
		default:
			return toLocalDateInputValue(baseDate);
	}
};

export const setInputFromDate = (
	input: HTMLInputElement | null | undefined,
	date: Date,
	format?: TempusFormat
): void => {
	if (!input) {
		return;
	}
	let nextVal = "";
	switch (format) {
		case "time":
			nextVal = date.toTimeString().slice(0, TIME_STRING_SLICE_END);
			break;
		case "datetime":
			nextVal = toLocalDateTimeInputValue(date);
			break;
		default:
			nextVal = toLocalDateInputValue(date);
	}
	input.value = nextVal;
};

// Convenience hook: stable callback for setting input value from date with a ref
export const useSetInputFromDate = (
	ref: React.RefObject<HTMLInputElement>,
	format?: TempusFormat
) =>
	useCallback(
		(date: Date) => setInputFromDate(ref.current, date, format),
		[ref, format]
	);
