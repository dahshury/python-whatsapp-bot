import { formatHijriDate } from "@shared/libs/date/hijri-utils";

// Milliseconds per hour: 60 minutes * 60 seconds * 1000 milliseconds
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MS_PER_HOUR =
	MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

type SelectedDateRange =
	| {
			start: string;
			end?: string | null;
	  }
	| null
	| undefined;

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
	hour: "numeric",
	minute: "2-digit",
	hour12: true,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "short",
	day: "numeric",
};

const DAY_OPTIONS: Intl.DateTimeFormatOptions = {
	weekday: "long",
};

const AR_LOCALE = "ar-SA";

function computeEndDate(
	startDate: Date,
	endDate: Date | null,
	hasTimeInfo: boolean,
	slotDurationHours: number
): Date | undefined {
	if (hasTimeInfo && (!endDate || endDate.getTime() === startDate.getTime())) {
		return new Date(startDate.getTime() + slotDurationHours * MS_PER_HOUR);
	}
	return endDate || undefined;
}

function isSameCalendarDay(start: Date, end: Date | undefined): boolean {
	if (!end) {
		return false;
	}
	return (
		start.getFullYear() === end.getFullYear() &&
		start.getMonth() === end.getMonth() &&
		start.getDate() === end.getDate()
	);
}

function formatLocalizedDateRange(
	startDate: Date,
	endDate: Date | undefined,
	slotDurationHours: number
): string {
	const dayName = startDate.toLocaleDateString(AR_LOCALE, DAY_OPTIONS);
	const computedEnd = computeEndDate(
		startDate,
		endDate || null,
		true,
		slotDurationHours
	);
	const isSameDay = isSameCalendarDay(startDate, computedEnd);

	if (computedEnd && isSameDay) {
		const dateStr = formatHijriDate(startDate);
		const startTimeStr = startDate.toLocaleTimeString(AR_LOCALE, TIME_OPTIONS);
		const endTimeStr = computedEnd.toLocaleTimeString(AR_LOCALE, TIME_OPTIONS);
		return `${dayName}, ${dateStr} ${startTimeStr} - ${endTimeStr}`;
	}

	if (!computedEnd || isSameDay) {
		return `${dayName}, ${formatHijriDate(startDate)}`;
	}

	const endDayName = computedEnd.toLocaleDateString(AR_LOCALE, DAY_OPTIONS);
	return `${dayName}, ${formatHijriDate(startDate)} - ${endDayName}, ${formatHijriDate(computedEnd)}`;
}

function formatEnglishDateRange(
	startDate: Date,
	endDate: Date | null,
	hasTimeInfo: boolean,
	slotDurationHours: number
): string {
	const startDayName = startDate.toLocaleDateString(undefined, DAY_OPTIONS);

	if (!hasTimeInfo) {
		if (endDate && startDate.toDateString() !== endDate.toDateString()) {
			const endDayName = endDate.toLocaleDateString(undefined, DAY_OPTIONS);
			return `${startDayName}, ${startDate.toLocaleDateString()} - ${endDayName}, ${endDate.toLocaleDateString()}`;
		}
		return `${startDayName}, ${startDate.toLocaleDateString()}`;
	}

	const startDateStr = startDate.toLocaleDateString(undefined, DATE_OPTIONS);
	const startTimeStr = startDate.toLocaleTimeString(undefined, TIME_OPTIONS);

	let computedEnd =
		endDate && endDate.getTime() !== startDate.getTime() ? endDate : null;
	if (!computedEnd) {
		computedEnd = new Date(
			startDate.getTime() + slotDurationHours * MS_PER_HOUR
		);
	}

	const endDateStr = computedEnd.toLocaleDateString(undefined, DATE_OPTIONS);
	const endTimeStr = computedEnd.toLocaleTimeString(undefined, TIME_OPTIONS);

	if (startDateStr !== endDateStr) {
		const endDayName = computedEnd.toLocaleDateString(undefined, DAY_OPTIONS);
		return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endDayName}, ${endDateStr} ${endTimeStr}`;
	}

	return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endTimeStr}`;
}

export function computeFormattedDateRange(
	selectedDateRange: SelectedDateRange,
	isLocalized: boolean,
	slotDurationHours: number
): string {
	if (!selectedDateRange) {
		return "";
	}

	const startDate = new Date(selectedDateRange.start);
	const endDate = selectedDateRange.end
		? new Date(selectedDateRange.end)
		: null;
	const hasTimeInfo = selectedDateRange.start.includes("T");

	if (isLocalized) {
		return formatLocalizedDateRange(
			startDate,
			endDate || undefined,
			slotDurationHours
		);
	}

	return formatEnglishDateRange(
		startDate,
		endDate,
		hasTimeInfo,
		slotDurationHours
	);
}
