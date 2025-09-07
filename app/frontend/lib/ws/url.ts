function resolveWebSocketUrl(): string {
	// 1) Explicit public override
	const explicit = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
	if (explicit) {
		return explicit;
	}

	// 2) Map backend HTTP URL to WS
	const httpUrl =
		process.env.PYTHON_BACKEND_URL ||
		process.env.BACKEND_URL ||
		"http://localhost:8000";
	try {
		const url = new URL(httpUrl);
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		url.pathname = "/ws";
		const mapped = url.toString();
		return mapped;
	} catch {}

	// 3) Final fallback
	const fallback = "ws://localhost:8000/ws";
	return fallback;
}

export { resolveWebSocketUrl };
