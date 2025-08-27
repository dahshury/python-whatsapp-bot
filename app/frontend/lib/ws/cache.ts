import type { WebSocketDataState } from "@/lib/ws/types";

export const STORAGE_KEY = "ws_snapshot_v1";

export function loadCachedState(ttlMs: number): WebSocketDataState {
	try {
		const raw =
			typeof window !== "undefined"
				? sessionStorage.getItem(STORAGE_KEY)
				: null;
		if (raw) {
			const parsed = JSON.parse(raw);
			const ts: number = parsed?.__ts || 0;
			if (Date.now() - ts < ttlMs) {
				return {
					reservations: parsed?.reservations || {},
					conversations: parsed?.conversations || {},
					// Keep vacation caching for instant load on refresh
					vacations: parsed?.vacations || [],
					isConnected: false,
					lastUpdate: parsed?.lastUpdate || null,
				};
			}
		}
	} catch {}
	return {
		reservations: {},
		conversations: {},
		vacations: [],
		isConnected: false,
		lastUpdate: null,
	};
}

export function persistState(state: WebSocketDataState): void {
	try {
		if (typeof window !== "undefined") {
			sessionStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					reservations: state.reservations,
					conversations: state.conversations,
					vacations: state.vacations,
					lastUpdate: state.lastUpdate,
					__ts: Date.now(),
				}),
			);
		}
	} catch {}
}
