import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

// Normalize various time formats to 24h HH:MM
export function to24h(time: string): string {
	try {
		if (!time) return "00:00";
		const trimmed = time
			.trim()
			.toUpperCase()
			.replace("ص", "AM")
			.replace("م", "PM");
		// If already HH:MM
		if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
		// If H:MM AM/PM
		const ampm = /(AM|PM)$/.test(trimmed);
		const [hPart, mPartRaw] = trimmed.replace(/\s*(AM|PM)$/, "").split(":");
		const minute = mPartRaw ? Number.parseInt(mPartRaw, 10) : 0;
		let hour = Number.parseInt(hPart || "0", 10);
		if (ampm) {
			const isPM = /PM$/.test(trimmed);
			if (isPM && hour < 12) hour += 12;
			if (!isPM && hour === 12) hour = 0;
		}
		const hh = String(Math.max(0, Math.min(23, hour))).padStart(2, "0");
		const mm = String(Math.max(0, Math.min(59, minute))).padStart(2, "0");
		return `${hh}:${mm}`;
	} catch {
		return "00:00";
	}
}
