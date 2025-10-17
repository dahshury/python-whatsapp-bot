const RANDOM_STRING_RADIX = 36;
const RADIX_SLICE_START = 2;
const SESSION_STORAGE_KEY = "ws_tab_id_v1";

function getOrCreateTabId(): string {
	try {
		if (typeof window === "undefined") {
			return "server";
		}
		let id = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (!id) {
			id = `${Math.random().toString(RANDOM_STRING_RADIX).slice(RADIX_SLICE_START)}-${Date.now().toString(
				RANDOM_STRING_RADIX
			)}`;
			window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
		}
		return id;
	} catch {
		// Session storage access failed; generate fallback ID
		return `${Date.now()}`;
	}
}

function resolveWebSocketUrl(): string {
	try {
		if (typeof window !== "undefined") {
			const isHttps = window.location.protocol === "https:";
			const host = window.location.hostname || "localhost";
			const wsProto = isHttps ? "wss" : "ws";
			const tab = getOrCreateTabId();
			const wsUrl = `${wsProto}://${host}:8000/ws?tab=${encodeURIComponent(tab)}`;
			return wsUrl;
		}
	} catch {
		// URL resolution failed; use localhost fallback
	}
	return "ws://localhost:8000/ws";
}

export { getOrCreateTabId, resolveWebSocketUrl };
