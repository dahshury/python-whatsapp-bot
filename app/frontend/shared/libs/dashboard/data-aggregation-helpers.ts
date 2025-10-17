/**
 * Shared helper functions for dashboard data aggregation
 * Extracted to shared/libs following DDD architecture
 */

import type {
	ConversationMessage,
	Reservation,
} from "@features/dashboard/compute";

// Constants
export const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

export const WORD_SPACE_REGEX = /\s+/;
export const DIGIT_REGEX = /[\d]+/g;
export const NON_WORD_ARABIC_REGEX = /[^\w\s\u0600-\u06FF]/g;
export const CANCELLATION_RATE_PERCENTAGE = 100;

// Date/Time helpers
export const getWeekdayName = (date: Date): string | null => {
	const dayIndex = date.getDay();
	if (dayIndex < 0 || dayIndex >= WEEKDAYS.length) {
		return null;
	}
	return WEEKDAYS[dayIndex as number] ?? null;
};

export const getMonthKey = (date: Date): string =>
	`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

export const parseMonthFromKey = (key: string): Date | null => {
	const [y, m] = key.split("-").map(Number);
	if (!(y && m) || Number.isNaN(y) || Number.isNaN(m)) {
		return null;
	}
	return new Date(y, m - 1, 1);
};

export const getMonthDisplayName = (date: Date): string => {
	const isLocalizedFlag = (() => {
		if (typeof window === "undefined") {
			return false;
		}
		try {
			return localStorage.getItem("isLocalized") === "true";
		} catch {
			return false;
		}
	})();
	return date.toLocaleString(isLocalizedFlag ? "ar" : "en", {
		month: "short",
	});
};

// Role detection
export const extractRole = (message: ConversationMessage): string => {
	const m = message as ConversationMessage & {
		role?: string;
		sender?: string;
		author?: string;
	};
	return m.role || m.sender || m.author || "user";
};

// Reservation type detection
export const getReservationType = (
	reservation: Reservation
): "followup" | "checkup" => {
	if (
		typeof (reservation as Reservation & { type?: number }).type === "number" &&
		(reservation as Reservation & { type?: number }).type === 1
	) {
		return "followup";
	}
	const title = ((reservation as Reservation & { title?: string }).title || "")
		.toString()
		.toLowerCase();
	return title.includes("follow") ? "followup" : "checkup";
};

// Modification date parsing
export const parseModificationDate = (r: Reservation): Date | null => {
	const mayParse = (v?: string) => {
		if (!v) {
			return null;
		}
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? null : d;
	};
	return (
		mayParse((r as Reservation).updated_at) ||
		mayParse((r as Reservation).modified_at) ||
		mayParse((r as Reservation).last_modified) ||
		mayParse((r as Reservation).modified_on) ||
		mayParse((r as Reservation).update_ts)
	);
};
