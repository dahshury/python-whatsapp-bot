import { useRef } from "react";

export type UpdateType =
	| "reservation_created"
	| "reservation_updated"
	| "reservation_cancelled"
	| "reservation_reinstated"
	| "conversation_new_message"
	| "vacation_period_updated"
	| "customer_updated"
	| "metrics_updated"
	| "snapshot"
	| "modify_reservation_ack"
	| "modify_reservation_nack";

export function normalizeTime12To24(
	time12?: string | null,
	fallback?: string,
): string {
	try {
		const t = (time12 || "").trim();
		if (!t) return fallback || "";
		const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t);
		if (!m) return t;
		let h = parseInt(m[1], 10);
		const mm = m[2];
		const ap = m[3].toUpperCase();
		if (ap === "PM" && h < 12) h += 12;
		if (ap === "AM" && h === 12) h = 0;
		return `${String(h).padStart(2, "0")}:${mm}`;
	} catch {
		return fallback || "";
	}
}

export function buildLocalOpCandidates(type: string, data: any): string[] {
	const idPart = String(data?.id ?? "");
	const waPart = String(data?.wa_id ?? "");
	const datePart = String(data?.date ?? "");
	const time12 = String(data?.time_slot ?? "");
	const time24 = normalizeTime12To24(time12, String(data?.time ?? ""));
	const cands = new Set<string>();
	cands.add(`${type}:${idPart}:${datePart}:${time12}`);
	cands.add(`${type}:${idPart}:${datePart}:${time24}`);
	cands.add(`${type}:${waPart}:${datePart}:${time12}`);
	cands.add(`${type}:${waPart}:${datePart}:${time24}`);
	return Array.from(cands);
}

export function isLocalOperation(type: string, data: any): boolean {
	try {
		const candidates = buildLocalOpCandidates(type, data);
		(globalThis as any).__localOps =
			(globalThis as any).__localOps || new Set<string>();
		for (const k of candidates) {
			if ((globalThis as any).__localOps.has(k)) return true;
		}
	} catch {}
	// Fallback: detect very recent local DnD moves tracked by calendar
	try {
		const moves: Map<string, number> | undefined = (globalThis as any)
			.__calendarLocalMoves;
		const ts1 = moves?.get(String(data?.id ?? ""));
		const ts2 = moves?.get(String(data?.wa_id ?? ""));
		const now = Date.now();
		if ((ts1 && now - ts1 < 4000) || (ts2 && now - ts2 < 4000)) return true;
	} catch {}
	return false;
}

export function useDedupeKeyRef() {
	const ref = useRef<string>("");
	const isDuplicate = (type: string, data: any): boolean => {
		const candidates = buildLocalOpCandidates(type, data);
		const key =
			candidates[0] ||
			`${type}:${String(data?.id ?? "")}:${String(data?.date ?? "")}:${String(data?.time_slot ?? "")}`;
		if (key && ref.current === key) return true;
		ref.current = key;
		return false;
	};
	return { isDuplicate };
}
