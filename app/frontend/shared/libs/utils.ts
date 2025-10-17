import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

// Time format constants
const HOURS_IN_24H_FORMAT = 23;
const MINUTES_MAX = 59;
const HOUR_PM_THRESHOLD = 12;

// Time format regex patterns
const TIME_HH_MM_REGEX = /^\d{2}:\d{2}$/;
const AM_PM_SUFFIX_REGEX = /(AM|PM)$/;
const AM_PM_REPLACE_REGEX = /\s*(AM|PM)$/;
const PM_SUFFIX_REGEX = /PM$/;

// Normalize various time formats to 24h HH:MM
export function to24h(time: string): string {
	try {
		if (!time) {
			return "00:00";
		}
		const trimmed = time
			.trim()
			.toUpperCase()
			.replace("ص", "AM")
			.replace("م", "PM");
		// If already HH:MM
		if (TIME_HH_MM_REGEX.test(trimmed)) {
			return trimmed;
		}
		// If H:MM AM/PM
		const ampm = AM_PM_SUFFIX_REGEX.test(trimmed);
		const [hPart, mPartRaw] = trimmed
			.replace(AM_PM_REPLACE_REGEX, "")
			.split(":");
		const minute = mPartRaw ? Number.parseInt(mPartRaw, 10) : 0;
		let hour = Number.parseInt(hPart || "0", 10);
		if (ampm) {
			const isPM = PM_SUFFIX_REGEX.test(trimmed);
			if (isPM && hour < HOUR_PM_THRESHOLD) {
				hour += HOUR_PM_THRESHOLD;
			}
			if (!isPM && hour === HOUR_PM_THRESHOLD) {
				hour = 0;
			}
		}
		const hh = String(
			Math.max(0, Math.min(HOURS_IN_24H_FORMAT, hour))
		).padStart(2, "0");
		const mm = String(Math.max(0, Math.min(MINUTES_MAX, minute))).padStart(
			2,
			"0"
		);
		return `${hh}:${mm}`;
	} catch {
		return "00:00";
	}
}
