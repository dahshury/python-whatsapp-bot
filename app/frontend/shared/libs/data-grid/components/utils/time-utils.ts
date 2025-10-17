// Time validation constants
const MIN_HOURS = 0;
const MAX_HOURS = 23;
const MAX_MINUTES = 59;
const MAX_SECONDS = 59;
const MAX_MILLISECONDS = 999;
const NOON_HOURS = 12;
const MIDNIGHT_HOURS = 0;
const PM_THRESHOLD = 12;
const BASE_DATE_YEAR = 2000;

// Time parsing regex patterns (24-hour and 12-hour formats)
const TIME_REGEX_24_H = /^(\d{1,2}):(\d{2})$/;
const TIME_REGEX_12_H = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;

// Enhanced validation with complete NaN prevention
export const isValidDate = (date: unknown): date is Date => {
	if (!(date && date instanceof Date)) {
		return false;
	}
	const time = date.getTime();
	if (Number.isNaN(time)) {
		return false;
	}
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	const milliseconds = date.getMilliseconds();

	// Comprehensive NaN checks
	if (
		Number.isNaN(hours) ||
		Number.isNaN(minutes) ||
		Number.isNaN(seconds) ||
		Number.isNaN(milliseconds)
	) {
		return false;
	}
	if (hours < MIN_HOURS || hours > MAX_HOURS) {
		return false;
	}
	if (minutes < MIN_HOURS || minutes > MAX_MINUTES) {
		return false;
	}
	if (seconds < MIN_HOURS || seconds > MAX_SECONDS) {
		return false;
	}
	if (milliseconds < MIN_HOURS || milliseconds > MAX_MILLISECONDS) {
		return false;
	}

	return true;
};

// Create a guaranteed valid time value for TimeKeeper
export const getSafeTimeValue = (time?: Date): Date => {
	const now = new Date();
	const safeDate = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		NOON_HOURS,
		0,
		0,
		0
	);

	if (time && isValidDate(time)) {
		const hours = time.getHours();
		const minutes = time.getMinutes();

		if (
			!(Number.isNaN(hours) || Number.isNaN(minutes)) &&
			hours >= MIN_HOURS &&
			hours <= MAX_HOURS &&
			minutes >= MIN_HOURS &&
			minutes <= MAX_MINUTES
		) {
			safeDate.setHours(hours, minutes, 0, 0);
			return safeDate;
		}
	}

	return safeDate;
};

/**
 * Convert hours from 24-hour to 12-hour format
 */
function convertTo12HourFormat(hours: number): number {
	if (hours === MIDNIGHT_HOURS) {
		return NOON_HOURS;
	}
	if (hours > NOON_HOURS) {
		return hours - NOON_HOURS;
	}
	return hours;
}

// Enhanced time formatting with complete NaN prevention
export const formatTimeForPicker = (date: Date, use24Hour = false): string => {
	try {
		if (!isValidDate(date)) {
			throw new Error("Invalid date provided to formatTimeForPicker");
		}

		const hours = date.getHours();
		const minutes = date.getMinutes();

		// Triple check for NaN values
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			throw new Error("NaN values detected in date formatting");
		}

		const safeHours = Math.max(
			MIN_HOURS,
			Math.min(MAX_HOURS, Math.floor(hours))
		);
		const safeMinutes = Math.max(
			MIN_HOURS,
			Math.min(MAX_MINUTES, Math.floor(minutes))
		);
		const minutesStr = safeMinutes.toString().padStart(2, "0");

		if (use24Hour) {
			return `${safeHours.toString().padStart(2, "0")}:${minutesStr}`;
		}
		const isPM = safeHours >= PM_THRESHOLD;
		const displayHours = convertTo12HourFormat(safeHours);
		return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
	} catch (_error) {
		// Return a guaranteed safe default
		return use24Hour ? "12:00" : "12:00pm";
	}
};

// Format time for display
export const formatTimeForDisplay = (
	date: Date | undefined,
	use24Hour = false
): string => {
	if (!(date && isValidDate(date))) {
		return "";
	}

	try {
		const hours = date.getHours();
		const minutes = date.getMinutes();

		// Check for NaN values
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return "";
		}

		const minutesStr = minutes.toString().padStart(2, "0");

		if (use24Hour) {
			return `${hours.toString().padStart(2, "0")}:${minutesStr}`;
		}
		const isPM = hours >= PM_THRESHOLD;
		const displayHours = convertTo12HourFormat(hours);
		return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
	} catch (_error) {
		return "";
	}
};

/**
 * Parse 24-hour format time (HH:MM or H:MM)
 */
function parse24HourFormat(match: RegExpMatchArray): Date | undefined {
	const hours = match[1] ? Number.parseInt(match[1], 10) : MIN_HOURS;
	const minutes = match[2] ? Number.parseInt(match[2], 10) : MIN_HOURS;

	if (
		hours >= MIN_HOURS &&
		hours <= MAX_HOURS &&
		minutes >= MIN_HOURS &&
		minutes <= MAX_MINUTES
	) {
		const newDate = new Date(BASE_DATE_YEAR, 0, 1);
		newDate.setHours(hours, minutes, 0, 0);
		return newDate;
	}
	return;
}

/**
 * Parse 12-hour format time (H:MM am/pm or HH:MM am/pm)
 */
function parse12HourFormat(match: RegExpMatchArray): Date | undefined {
	let hours = match[1] ? Number.parseInt(match[1], 10) : MIN_HOURS;
	const minutes = match[2] ? Number.parseInt(match[2], 10) : MIN_HOURS;
	const isPM = match[3] ? match[3].toLowerCase() === "pm" : false;

	if (
		hours >= 1 &&
		hours <= NOON_HOURS &&
		minutes >= MIN_HOURS &&
		minutes <= MAX_MINUTES
	) {
		if (isPM && hours !== NOON_HOURS) {
			hours += NOON_HOURS;
		}
		if (!isPM && hours === NOON_HOURS) {
			hours = MIDNIGHT_HOURS;
		}

		const newDate = new Date(BASE_DATE_YEAR, 0, 1);
		newDate.setHours(hours, minutes, 0, 0);
		return newDate;
	}
	return;
}

// Parse time from picker with enhanced validation
// Creates a Date object with a fixed date (2000-01-01) to avoid timezone issues
export const parseTimeFromPicker = (timeString: string): Date => {
	try {
		const match24 = timeString.match(TIME_REGEX_24_H);
		if (match24) {
			const result = parse24HourFormat(match24);
			if (result) {
				return result;
			}
		}

		const match12 = timeString.match(TIME_REGEX_12_H);
		if (match12) {
			const result = parse12HourFormat(match12);
			if (result) {
				return result;
			}
		}

		throw new Error(`Invalid time format: ${timeString}`);
	} catch (_error) {
		const fallbackDate = new Date(BASE_DATE_YEAR, 0, 1);
		fallbackDate.setHours(NOON_HOURS, 0, 0, 0); // Default to noon
		return fallbackDate;
	}
};

// Regular expressions for time validation
export const TIME_REGEX_24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
export const TIME_REGEX_12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i;
