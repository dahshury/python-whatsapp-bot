function resolveBackendBaseUrlCandidates(): string[] {
	// Server-side (Next.js API): try Docker service first, then localhost
	const isServer = typeof window === "undefined";
	if (isServer) {
		return ["http://backend:8000", "http://localhost:8000"];
	}

	// Browser: For development, try direct backend connection first (faster, bypasses Next.js proxy)
	// Fall back to Next.js API proxy if direct connection fails [[memory:8680273]]
	return ["http://localhost:8000", "/api"];
}

function joinUrl(base: string, path: string): string {
	const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizedBase}${normalizedPath}`;
}

export async function callPythonBackend<T = unknown>(
	path: string,
	init?: RequestInit
): Promise<T> {
	const bases = resolveBackendBaseUrlCandidates();
	let lastError: unknown;

	for (const baseUrl of bases) {
		const url = joinUrl(baseUrl, path);
		try {
			const res = await fetch(url, {
				method: init?.method || "GET",
				headers: {
					"Content-Type": "application/json",
					...(init?.headers as Record<string, string>),
				},
				body: (init?.body ?? null) as BodyInit | null,
				cache: "no-store",
			});

			const contentType = res.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				return {
					success: res.ok,
					status: res.status,
					message: await res.text(),
				} as unknown as T;
			}

			const data = (await res.json().catch(() => ({}))) as T;
			return data;
		} catch (error) {
			lastError = error;
			// Try the next candidate host
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("Backend request failed for all candidates");
}
