export function normalizeTimeToHHmm(t?: string | null): string {
	try {
		if (!t) return "";
		const s = String(t);
		return s.length >= 5 ? s.slice(0, 5) : s;
	} catch {
		return String(t || "");
	}
}

export function formatMessageTimestamp(dateStr: string, timeStr: string): string {
	try {
		const date = new Date(`${dateStr} ${timeStr}`);
		const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
		const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
		return `${dayName}, ${formattedDate} • ${formattedTime}`;
	} catch {
		return `${dateStr} • ${timeStr}`;
	}
}


