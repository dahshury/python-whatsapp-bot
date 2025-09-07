const BACKEND_URL =
	process.env.PYTHON_BACKEND_URL ||
	process.env.BACKEND_URL ||
	"http://localhost:8000";

export async function callPythonBackend<T = unknown>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const url = `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
	const res = await fetch(url, {
		method: init?.method || "GET",
		headers: {
			"Content-Type": "application/json",
			...(init?.headers as Record<string, string>),
		},
		body: (init?.body ?? null) as BodyInit | null,
		cache: "no-store",
		// Important: Next.js edge/runtime can be strict; stick to defaults compatible with Node runtime
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
