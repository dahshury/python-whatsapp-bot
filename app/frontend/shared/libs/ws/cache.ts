import { safeParseJson } from "@shared/validation/json";
import { zWsCachedState } from "@shared/validation/ws/cache.schema";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type {
	VacationSnapshot,
	WebSocketDataState,
} from "@/shared/libs/ws/types";

export const STORAGE_KEY = "ws_snapshot_v1";

export function loadCachedState(ttlMs: number): WebSocketDataState {
	try {
		const raw =
			typeof window !== "undefined"
				? sessionStorage.getItem(STORAGE_KEY)
				: null;
		if (raw) {
			const result = safeParseJson(zWsCachedState, raw);
			if (!result.success) {
				return {
					reservations: {},
					conversations: {},
					vacations: [],
					isConnected: false,
					lastUpdate: null,
				};
			}
			const parsed = result.data;
			const ts = parsed.__ts ?? 0;
			if (Date.now() - ts < ttlMs) {
				// Transform parsed data to match WebSocketDataState types exactly
				const reservations = Object.entries(parsed.reservations).reduce(
					(acc, [key, items]) => {
						acc[key] = items.map((item) => ({
							...item,
							id: item.id ?? undefined,
							customer_id: item.customer_id ?? undefined,
							customer_name: item.customer_name ?? undefined,
							cancelled: item.cancelled ?? undefined,
						})) as Reservation[];
						return acc;
					},
					{} as Record<string, Reservation[]>
				);

				const conversations = Object.entries(parsed.conversations).reduce(
					(acc, [key, items]) => {
						acc[key] = items.map((item) => ({
							...item,
							message: item.message ?? undefined,
							tool_name: item.tool_name ?? undefined,
							tool_args: item.tool_args ?? undefined,
						})) as ConversationMessage[];
						return acc;
					},
					{} as Record<string, ConversationMessage[]>
				);

				const vacations = parsed.vacations.map((v) => ({
					start: v.start,
					end: v.end,
					...(v.title !== undefined ? { title: v.title } : {}),
				})) as VacationSnapshot[];

				return {
					reservations,
					conversations,
					vacations,
					isConnected: false,
					lastUpdate: (parsed.lastUpdate as string | null | undefined) ?? null,
				};
			}
		}
	} catch {
		// Parsing or storage access failed; return default empty state
	}
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
				})
			);
		}
	} catch {
		// Storage write failed; silently ignore to prevent app crashes
	}
}
