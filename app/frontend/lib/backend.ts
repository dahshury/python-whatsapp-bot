function resolveBackendBaseUrl(): string {
	// Server-side (Next.js API): use Docker network name
	const isServer = typeof window === "undefined";
	if (isServer) {
		return "http://backend:8000";
	}

	// Browser: use same-origin Next.js API proxy to hide backend URL
	return "/api";
}

function joinUrl(base: string, path: string): string {
	const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizedBase}${normalizedPath}`;
}

export async function callPythonBackend<T = unknown>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const baseUrl = resolveBackendBaseUrl();
	const url = joinUrl(baseUrl, path);

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
}
