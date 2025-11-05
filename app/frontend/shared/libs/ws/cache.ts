import type { WebSocketDataState } from "@/shared/libs/ws/types";

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
          conversations: {}, // Conversations are no longer cached - loaded on-demand
          // Keep vacation caching for instant load on refresh
          vacations: parsed?.vacations || [],
          isConnected: false,
          lastUpdate: parsed?.lastUpdate || null,
        };
      }
    }
  } catch {
    // Cache load failed - return empty state
  }
  return {
    reservations: {},
    conversations: {}, // Conversations are no longer cached - loaded on-demand
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
          // Conversations are no longer cached - loaded on-demand
          conversations: {},
          vacations: state.vacations,
          lastUpdate: state.lastUpdate,
          __ts: Date.now(),
        })
      );
    }
  } catch {
    // Cache persist failed - state not cached
  }
}
