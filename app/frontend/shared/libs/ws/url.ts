function getOrCreateTabId(): string {
	try {
		if (typeof window === "undefined") return "server";
		const KEY = "ws_tab_id_v1";
		let id = window.sessionStorage.getItem(KEY);
		if (!id) {
			id = `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
			window.sessionStorage.setItem(KEY, id);
		}
		return id;
	} catch {
		return `${Date.now()}`;
	}
}

function resolveWebSocketUrl(): string {
	// Resolve based on current page host; no IPs hardcoded
	console.log("🔧 [DEBUG] resolveWebSocketUrl called");
	try {
		if (typeof window !== "undefined") {
			const isHttps = window.location.protocol === "https:";
			const host = window.location.hostname || "localhost";
			const wsProto = isHttps ? "wss" : "ws";
			const tab = getOrCreateTabId();
			const wsUrl = `${wsProto}://${host}:8000/ws?tab=${encodeURIComponent(tab)}`;
			console.log(
				`🔧 [DEBUG] Resolved WebSocket URL: ${wsUrl} (hostname: ${host}, protocol: ${window.location.protocol})`
			);
			return wsUrl;
		}
	} catch (e) {
		console.error("🔧 [DEBUG] Error resolving WebSocket URL:", e);
	}

	// Fallback - should not reach here in normal operation
	console.warn("🔧 [DEBUG] Using fallback WebSocket URL - window not available");
	return "ws://localhost:8000/ws";
}

export { resolveWebSocketUrl, getOrCreateTabId };
