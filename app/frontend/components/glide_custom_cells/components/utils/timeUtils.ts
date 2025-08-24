// Enhanced validation with complete NaN prevention
export const isValidDate = (date: any): date is Date => {
	if (!date || !(date instanceof Date)) return false;
	const time = date.getTime();
	if (Number.isNaN(time)) return false;
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
	)
		return false;
	if (hours < 0 || hours > 23) return false;
	if (minutes < 0 || minutes > 59) return false;
	if (seconds < 0 || seconds > 59) return false;
	if (milliseconds < 0 || milliseconds > 999) return false;

	return true;
};

// Create a guaranteed valid time value for TimeKeeper
export const getSafeTimeValue = (time?: Date): Date => {
	const now = new Date();
	const safeDate = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		12,
		0,
		0,
		0,
	);

	if (time && isValidDate(time)) {
		const hours = time.getHours();
		const minutes = time.getMinutes();

		if (
			!Number.isNaN(hours) &&
			!Number.isNaN(minutes) &&
			hours >= 0 &&
			hours <= 23 &&
			minutes >= 0 &&
			minutes <= 59
		) {
			safeDate.setHours(hours, minutes, 0, 0);
			return safeDate;
		}
	}

	return safeDate;
};

// Enhanced time formatting with complete NaN prevention
export const formatTimeForPicker = (
	date: Date,
	use24Hour: boolean = false,
): string => {
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

		const safeHours = Math.max(0, Math.min(23, Math.floor(hours)));
		const safeMinutes = Math.max(0, Math.min(59, Math.floor(minutes)));
		const minutesStr = safeMinutes.toString().padStart(2, "0");

		if (use24Hour) {
			return `${safeHours.toString().padStart(2, "0")}:${minutesStr}`;
		} else {
			const isPM = safeHours >= 12;
			const displayHours =
				safeHours === 0 ? 12 : safeHours > 12 ? safeHours - 12 : safeHours;
			return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
		}
	} catch (error) {
		console.warn("Error formatting time for picker:", error);
		// Return a guaranteed safe default
		return use24Hour ? "12:00" : "12:00pm";
	}
};

// Format time for display
export const formatTimeForDisplay = (
	date: Date | undefined,
	use24Hour: boolean = false,
): string => {
	if (!date || !isValidDate(date)) return "";

	try {
		const hours = date.getHours();
		const minutes = date.getMinutes();

		// Check for NaN values
		if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";

		const minutesStr = minutes.toString().padStart(2, "0");

		if (use24Hour) {
			return `${hours.toString().padStart(2, "0")}:${minutesStr}`;
		} else {
			const isPM = hours >= 12;
			const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
			return `${displayHours}:${minutesStr}${isPM ? "pm" : "am"}`;
		}
	} catch (error) {
		console.warn("Error formatting time for display:", error);
		return "";
	}
};

// Parse time from picker with enhanced validation
export const parseTimeFromPicker = (timeString: string): Date => {
	try {
		const today = new Date();

		// Handle 24-hour format (HH:MM or H:MM)
		const timeRegex24 = /^(\d{1,2}):(\d{2})$/;
		// Handle 12-hour format (H:MM am/pm or HH:MM am/pm)
		const timeRegex12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;

		const match24 = timeString.match(timeRegex24);
		const match12 = timeString.match(timeRegex12);

		if (match24) {
			const hours = parseInt(match24[1], 10);
			const minutes = parseInt(match24[2], 10);

			if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
				const newDate = new Date(today);
				newDate.setHours(hours, minutes, 0, 0);
				return newDate;
			}
		} else if (match12) {
			let hours = parseInt(match12[1], 10);
			const minutes = parseInt(match12[2], 10);
			const isPM = match12[3].toLowerCase() === "pm";

			if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
				if (isPM && hours !== 12) hours += 12;
				if (!isPM && hours === 12) hours = 0;

				const newDate = new Date(today);
				newDate.setHours(hours, minutes, 0, 0);
				return newDate;
			}
		}

		throw new Error(`Invalid time format: ${timeString}`);
	} catch (error) {
		console.warn("Error parsing time string:", timeString, error);
		const fallbackDate = new Date();
		fallbackDate.setHours(12, 0, 0, 0); // Default to noon
		return fallbackDate;
	}
};

// Regular expressions for time validation
export const TIME_REGEX_24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
export const TIME_REGEX_12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i;
