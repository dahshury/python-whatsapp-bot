function resolveWebSocketUrl(): string {
	// Browser: always use localhost:8000 for WebSocket (works everywhere)
	try {
		const url = new URL("http://localhost:8000");
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		url.pathname = "/ws";
		return url.toString();
	} catch {}

	return "ws://localhost:8000/ws";
}

export { resolveWebSocketUrl };
