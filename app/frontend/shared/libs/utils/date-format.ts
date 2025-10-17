const TIME_FORMAT_LENGTH = 5;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

function parseValidDate(
	datePart: string,
	timePartRaw: string,
	locale: string
): string | null {
	let t = timePartRaw;
	if (t && TIME_PATTERN.test(t)) {
		if (t.length === TIME_FORMAT_LENGTH) {
			t = `${t}:00`;
		}
		const iso = `${datePart}T${t}`;
		const d = new Date(iso);
		if (!Number.isNaN(d.getTime())) {
			const dayName = d.toLocaleDateString(locale, { weekday: "short" });
			const formattedDate = d.toLocaleDateString(locale, {
				month: "short",
				day: "numeric",
			});
			const formattedTime = d.toLocaleTimeString(locale, {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			});
			return `${dayName}, ${formattedDate}${timePartRaw ? ` • ${formattedTime}` : ""}`;
		}
	}
	return null;
}

function parseDateOnly(datePart: string, locale: string): string | null {
	const d = new Date(`${datePart}T00:00:00`);
	if (!Number.isNaN(d.getTime())) {
		const dayName = d.toLocaleDateString(locale, { weekday: "short" });
		const formattedDate = d.toLocaleDateString(locale, {
			month: "short",
			day: "numeric",
		});
		return `${dayName}, ${formattedDate}`;
	}
	return null;
}

function buildFallbackLabel(datePart: string, timePartRaw: string): string {
	const dateLabel = datePart || "Unknown date";
	const timeLabel = timePartRaw || "";
	return timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;
}

export function normalizeTimeToHHmm(t?: string | null): string {
	try {
		if (!t) {
			return "";
		}
		const s = String(t);
		return s.length >= TIME_FORMAT_LENGTH ? s.slice(0, TIME_FORMAT_LENGTH) : s;
	} catch {
		return String(t || "");
	}
}

export function formatMessageTimestamp(
	dateStr?: string,
	timeStr?: string,
	locale = "en-US"
): string {
	try {
		const datePart = typeof dateStr === "string" ? dateStr.trim() : "";
		const timePartRaw = typeof timeStr === "string" ? timeStr.trim() : "";
		if (!(datePart || timePartRaw)) {
			return "";
		}

		// Build ISO-like string when possible
		if (datePart) {
			const validDateResult = parseValidDate(datePart, timePartRaw, locale);
			if (validDateResult !== null) {
				return validDateResult;
			}

			// If time is missing or invalid, try midnight for date-only
			const dateOnlyResult = parseDateOnly(datePart, locale);
			if (dateOnlyResult !== null) {
				return dateOnlyResult;
			}
		}

		// Fallback to raw values without producing "Invalid Date"
		return buildFallbackLabel(datePart, timePartRaw);
	} catch {
		return buildFallbackLabel(dateStr || "", timeStr || "");
	}
}
