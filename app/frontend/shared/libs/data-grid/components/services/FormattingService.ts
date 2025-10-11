/**
 * Format a value based on its column type and format specification
 */
export function formatValue(value: unknown, columnType: string, format: string): string {
	if (value === null || value === undefined || value === "") {
		return "";
	}

	switch (columnType) {
		case "number":
		case "progress":
			return formatNumber(
				typeof value === "number" || typeof value === "string" ? (value as number | string) : String(value),
				format
			);
		case "date":
			return formatDate(
				value instanceof Date || typeof value === "string" ? (value as string | Date) : String(value),
				format
			);
		case "time":
			return formatTime(
				value instanceof Date || typeof value === "string" ? (value as string | Date) : String(value),
				format
			);
		case "datetime":
			return formatDateTime(
				value instanceof Date || typeof value === "string" ? (value as string | Date) : String(value),
				format
			);
		default:
			return String(value);
	}
}

// Provide a service-style named export for modules that import { FormattingService }
export const FormattingService = {
	formatValue,
};

function formatNumber(value: number | string, format: string): string {
	const num = typeof value === "string" ? Number.parseFloat(value) : value;
	if (Number.isNaN(num)) return String(value);

	switch (format) {
		case "automatic":
			return num.toLocaleString();
		case "localized":
			return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
		case "plain":
			return String(num);
		case "compact":
			return new Intl.NumberFormat(undefined, {
				notation: "compact",
				compactDisplay: "short",
			}).format(num);
		case "dollar":
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
			}).format(num);
		case "euro":
			return new Intl.NumberFormat("en-EU", {
				style: "currency",
				currency: "EUR",
			}).format(num);
		case "yen":
			return new Intl.NumberFormat("ja-JP", {
				style: "currency",
				currency: "JPY",
			}).format(num);
		case "percent":
			return new Intl.NumberFormat(undefined, {
				style: "percent",
				minimumFractionDigits: 0,
				maximumFractionDigits: 2,
			}).format(num);
		case "scientific":
			return num.toExponential(2);
		case "accounting":
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: "USD",
				currencySign: "accounting",
			}).format(num);
		default:
			return num.toLocaleString();
	}
}

function formatDate(value: string | Date, format: string): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	switch (format) {
		case "localized":
			// Jun 23, 2025
			return date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		case "automatic":
			// ISO format: 2025-06-23
			return date.toISOString().split("T")[0] || date.toLocaleDateString("en-GB");
		case "distance":
			return formatRelativeTime(date);
		default:
			return date.toLocaleDateString("en-GB");
	}
}

function formatTime(value: string | Date, format: string): string {
	const date = value instanceof Date ? value : new Date(`2000-01-01T${value}`);
	if (Number.isNaN(date.getTime())) {
		// Try parsing with enhanced format handling
		return parseAndFormatTimeString(String(value), format);
	}

	switch (format) {
		case "localized":
			// 3:45 PM
			return date.toLocaleTimeString(undefined, {
				hour: "numeric",
				minute: "2-digit",
			});
		case "automatic":
			// 24-hour format: 15:45
			return date.toLocaleTimeString("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
			});
		default:
			return date.toLocaleTimeString();
	}
}

/**
 * Enhanced time string parsing and formatting
 * Handles various input formats including AM/PM, 24h, ISO strings
 */
function parseAndFormatTimeString(time: string, format?: string): string {
	if (!time) return "";

	// Handle ISO date strings
	if (time.includes("T")) {
		const date = new Date(time);
		if (!Number.isNaN(date.getTime())) {
			const hours = date.getHours();
			const minutes = date.getMinutes();

			if (format === "automatic") {
				return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
			}
			const ampm = hours >= 12 ? "PM" : "AM";
			const hour12 = hours % 12 || 12;
			return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
		}
	}

	// Normalize the time string
	const normalizedTime = time.trim().replace(/\s+/g, " ");

	// Handle AM/PM format
	if (normalizedTime.includes("AM") || normalizedTime.includes("PM")) {
		const match = normalizedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
		if (match?.[1] && match[2] && match[3]) {
			const [, hourStr, minutes, ampm] = match;
			const hour = Number.parseInt(hourStr, 10);

			if (format === "automatic") {
				let hour24 = hour;
				if (ampm.toUpperCase() === "PM" && hour !== 12) hour24 += 12;
				if (ampm.toUpperCase() === "AM" && hour === 12) hour24 = 0;
				return `${hour24.toString().padStart(2, "0")}:${minutes}`;
			}
			return `${hour}:${minutes} ${ampm.toUpperCase()}`;
		}
	}

	// Handle 24h format
	const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
	if (timeMatch?.[1] && timeMatch[2]) {
		const [, hourStr, minutes] = timeMatch;
		const hour = Number.parseInt(hourStr, 10);

		if (format === "automatic") {
			return `${hour.toString().padStart(2, "0")}:${minutes}`;
		}
		const ampm = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 || 12;
		return `${hour12}:${minutes} ${ampm}`;
	}

	return time;
}

/**
 * Parse formatted time string to hours and minutes
 */
export function parseFormattedTime(formattedTime: string): {
	hours: number;
	minutes: number;
} {
	let hours = 0;
	let minutes = 0;

	if (formattedTime) {
		const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
		if (timeMatch?.[1] && timeMatch[2]) {
			hours = Number.parseInt(timeMatch[1], 10);
			minutes = Number.parseInt(timeMatch[2], 10);

			if (timeMatch[3]) {
				const isPM = timeMatch[3].toUpperCase() === "PM";
				if (isPM && hours !== 12) hours += 12;
				if (!isPM && hours === 12) hours = 0;
			}
		}
	}

	return { hours, minutes };
}

function formatDateTime(value: string | Date, format: string): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	switch (format) {
		case "localized":
			// Jun 23, 2025 3:45 PM
			return date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
			});
		case "automatic":
			// ISO format
			return date.toISOString();
		case "distance":
			return formatRelativeTime(date);
		case "calendar":
			return formatCalendarTime(date);
		default:
			return date.toLocaleString();
	}
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.round(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.round(diffMs / (1000 * 60));

	if (Math.abs(diffMinutes) < 1) return "just now";
	if (Math.abs(diffMinutes) < 60) {
		return diffMinutes > 0 ? `in ${diffMinutes} minutes` : `${-diffMinutes} minutes ago`;
	}
	if (Math.abs(diffHours) < 24) {
		return diffHours > 0 ? `in ${diffHours} hours` : `${-diffHours} hours ago`;
	}
	if (Math.abs(diffDays) < 30) {
		return diffDays > 0 ? `in ${diffDays} days` : `${-diffDays} days ago`;
	}

	const diffMonths = Math.round(diffDays / 30);
	if (Math.abs(diffMonths) < 12) {
		return diffMonths > 0 ? `in ${diffMonths} months` : `${-diffMonths} months ago`;
	}

	const diffYears = Math.round(diffDays / 365);
	return diffYears > 0 ? `in ${diffYears} years` : `${-diffYears} years ago`;
}

function formatCalendarTime(date: Date): string {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.round((dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	const timeStr = date.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});

	if (diffDays === 0) return `Today at ${timeStr}`;
	if (diffDays === 1) return `Tomorrow at ${timeStr}`;
	if (diffDays === -1) return `Yesterday at ${timeStr}`;
	if (diffDays > 1 && diffDays < 7) {
		const dayName = date.toLocaleDateString(undefined, { weekday: "long" });
		return `${dayName} at ${timeStr}`;
	}

	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}
