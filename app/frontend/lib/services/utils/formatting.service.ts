import { getSlotTimes, SLOT_DURATION_HOURS } from "@/lib/calendar-config";

class FormattingService {
	/**
	 * Convert time to 24-hour format
	 */
	to24h(value: string): string {
		const v = (value || "").trim();
		if (/^\d{2}:\d{2}$/.test(v)) return v;

		try {
			const d = new Date(`1970-01-01T${v}`);
			const hh = String(d.getHours()).padStart(2, "0");
			const mm = String(d.getMinutes()).padStart(2, "0");
			return `${hh}:${mm}`;
		} catch {
			return v;
		}
	}

	/**
	 * Normalize an arbitrary HH:mm to the slot base time used by backend.
	 * Example: 11:21 -> 11:00, 13:44 -> 13:00
	 * Special-case Saturday (weekday 6 in JS) to use its own slot map if needed later.
	 */
	normalizeToSlotBase(dateStr: string, hhmm: string): string {
		try {
			const normalized = this.to24h(hhmm);
			const [hStr, _m] = normalized.split(":");
			const hour = Number.parseInt(hStr || "0", 10);
			if (!Number.isFinite(hour)) return normalized;

			// Build allowed slot starts based on business hours and SLOT_DURATION_HOURS
			const date = new Date(`${dateStr}T00:00:00`);
			const { slotMinTime, slotMaxTime } = getSlotTimes(date, false, "");
			const [minH] = String(slotMinTime || "00:00:00")
				.split(":")
				.map((v) => Number.parseInt(v, 10));
			const [maxH] = String(slotMaxTime || "24:00:00")
				.split(":")
				.map((v) => Number.parseInt(v, 10));
			const duration = Math.max(1, SLOT_DURATION_HOURS);
			const allowed: number[] = [];
			const startH = Math.max(0, Number.isFinite(minH) ? (minH as number) : 0);
			const endH = Math.min(24, Number.isFinite(maxH) ? (maxH as number) : 24);
			for (let h = startH; h < endH; h += duration) {
				allowed.push(h);
			}

			// Snap down to the nearest allowed slot start
			let snapped = allowed[0] ?? hour;
			for (const h of allowed) {
				if (hour >= h) snapped = h;
			}
			return `${String(snapped).padStart(2, "0")}:00`;
		} catch {
			return hhmm;
		}
	}

	/**
	 * Parse and normalize type value
	 */
	parseType(value: string | number | undefined): number {
		if (typeof value === "number") return value;
		const v = String(value || "").toLowerCase();
		if (v.includes("follow") || v.includes("مراجعة")) return 1;
		return 0;
	}

	/**
	 * Format date to YYYY-MM-DD format
	 */
	formatDateOnly(value: unknown): string | null {
		try {
			if (!value) return null;

			if (value instanceof Date) {
				const y = value.getFullYear();
				const m = String(value.getMonth() + 1).padStart(2, "0");
				const d = String(value.getDate()).padStart(2, "0");
				return `${y}-${m}-${d}`;
			}

			const str = String(value).trim();
			if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
			if (str.includes("T")) return str.split("T")[0] || str;

			const d = new Date(str);
			if (Number.isNaN(d.getTime())) return null;

			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${y}-${m}-${day}`;
		} catch {
			return null;
		}
	}

	/**
	 * Format time to HH:mm format
	 */
	formatHHmm(value: unknown): string | null {
		try {
			if (!value) return null;

			if (value instanceof Date) {
				const hh = String(value.getHours()).padStart(2, "0");
				const mm = String(value.getMinutes()).padStart(2, "0");
				return `${hh}:${mm}`;
			}

			const str = String(value).trim();

			// Handle ISO-like strings containing a 'T'
			if (str.includes("T")) {
				const dTry = new Date(str);
				if (!Number.isNaN(dTry.getTime())) {
					const hh = String(dTry.getHours()).padStart(2, "0");
					const mm = String(dTry.getMinutes()).padStart(2, "0");
					return `${hh}:${mm}`;
				}
			}

			// 24h HH:mm
			const m1 = str.match(
				/^([01]?\d|2\d):([0-5]\d)(?::[0-5]\d(?:\.\d{1,3}Z)?)?$/,
			);
			if (m1?.[1] && m1[2]) return `${m1[1].padStart(2, "0")}:${m1[2]}`;

			// 12h
			const m2 = str.match(/^(0?\d|1[0-2]):([0-5]\d)\s*(am|pm)$/i);
			if (m2?.[1] && m2[2] && m2[3]) {
				let hours = Number.parseInt(m2[1], 10);
				const minutes = m2[2];
				const isPM = m2[3].toLowerCase() === "pm";
				if (hours === 12 && !isPM) hours = 0;
				else if (hours !== 12 && isPM) hours += 12;
				return `${String(hours).padStart(2, "0")}:${minutes}`;
			}

			// Try Date parser fallback
			const d = new Date(`1970-01-01T${str}`);
			if (!Number.isNaN(d.getTime())) {
				const hh = String(d.getHours()).padStart(2, "0");
				const mm = String(d.getMinutes()).padStart(2, "0");
				return `${hh}:${mm}`;
			}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Format time in specific timezone
	 */
	formatHHmmInZone(value: unknown, timeZone = "Asia/Riyadh"): string | null {
		try {
			if (!value) return null;

			// If already HH:mm, return as-is
			const asStr = String(value).trim();
			const m = asStr.match(/^([01]?\d|2\d):([0-5]\d)$/);
			if (m?.[1] && m[2]) return `${m[1].padStart(2, "0")}:${m[2]}`;

			const d = value instanceof Date ? value : new Date(asStr);
			if (Number.isNaN(d.getTime())) return null;

			const fmt = new Intl.DateTimeFormat("en-GB", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				timeZone,
			});

			return fmt.format(d);
		} catch {
			return null;
		}
	}
}

export { FormattingService };
