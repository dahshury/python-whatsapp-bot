function resolveWebSocketUrl(): string {
	// Single env drives both HTTP and WS
	const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
	try {
		const url = new URL(base);
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		url.pathname = "/ws";
		return url.toString();
	} catch {}

	return "ws://localhost:8000/ws";
}

export { resolveWebSocketUrl };
