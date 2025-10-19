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

export type SchemaLike<T> = {
	safeParse: (input: unknown) => {
		success: boolean;
		data?: T;
		error?: { message: string };
	};
};

function isJsonResponse(res: Response): boolean {
	const contentType = res.headers.get("content-type") || "";
	return contentType.includes("application/json");
}

async function decodeTextResponse<T>(res: Response): Promise<T> {
	return {
		success: res.ok,
		status: res.status,
		message: await res.text(),
	} as unknown as T;
}

function validateWithSchema<T>(
	schema: SchemaLike<T> | undefined,
	parsed: unknown
): T | { success: false; message: string } | null {
	if (!schema || typeof schema.safeParse !== "function") {
		return null;
	}
	const result = schema.safeParse(parsed) as unknown as {
		success: boolean;
		data?: T;
		error?: { message: string };
	};
	if (result.success) {
		return result.data as T;
	}
	return {
		success: false,
		message: result.error?.message || "Invalid response",
	} as const;
}

async function parseJsonSafely(res: Response): Promise<unknown> {
	try {
		const raw = await res.text();
		try {
			return JSON.parse(raw);
		} catch {
			return {};
		}
	} catch {
		return {};
	}
}

export function callPythonBackend<T>(
	path: string,
	init: RequestInit | undefined,
	schema: SchemaLike<T>
): Promise<T>;
export function callPythonBackend<T = unknown>(
	path: string,
	init?: RequestInit
): Promise<T>;
// Network fallback + schema validation is multi-branch, split into helpers to reduce complexity
export async function callPythonBackend<T = unknown>(
	path: string,
	init?: RequestInit,
	schema?: SchemaLike<T>
): Promise<T> {
	const bases = resolveBackendBaseUrlCandidates();
	let lastError: unknown;

	const logFetchStart = async (url: string) => {
		if (process.env.NODE_ENV !== "production") {
			try {
				const { devLog } = await import("@shared/libs/utils/dev-logger");
				devLog("HTTP fetch", { url, method: init?.method || "GET" });
			} catch {
				// ignore
			}
		}
	};

	const logFetchEnd = async (url: string, res: Response) => {
		if (process.env.NODE_ENV !== "production") {
			try {
				const { devLog } = await import("@shared/libs/utils/dev-logger");
				devLog("HTTP response", { url, ok: res.ok, status: res.status });
			} catch {
				// ignore
			}
		}
	};

	const parseAndValidate = async (res: Response, url: string): Promise<T> => {
		if (!isJsonResponse(res)) {
			return await decodeTextResponse<T>(res);
		}
		const parsed = await parseJsonSafely(res);
		const validated = validateWithSchema(schema, parsed);
		if (validated !== null) {
			const maybeLogSchemaFailure = async () => {
				if (
					process.env.NODE_ENV !== "production" &&
					typeof (validated as { success?: unknown })?.success === "boolean" &&
					(validated as { success?: boolean }).success === false
				) {
					try {
						const { devGroup, devLog, devGroupEnd } = await import(
							"@shared/libs/utils/dev-logger"
						);
						devGroup("HTTP schema_failed");
						devLog("url", url);
						devLog("raw", parsed);
						devGroupEnd();
					} catch {
						// ignore logging errors
					}
				}
			};
			await maybeLogSchemaFailure();
			const v = validated as { success?: unknown };
			const r = parsed as { success?: unknown };
			if (
				typeof v?.success === "boolean" &&
				v.success === false &&
				typeof r?.success === "boolean" &&
				(r as { success: boolean }).success === true
			) {
				return parsed as T;
			}
			return validated as T;
		}
		return parsed as T;
	};

	const tryFetch = async (baseUrl: string) => {
		const url = joinUrl(baseUrl, path);
		try {
			await logFetchStart(url);
			const res = await fetch(url, {
				method: init?.method || "GET",
				headers: {
					"Content-Type": "application/json",
					...(init?.headers as Record<string, string>),
				},
				body: (init?.body ?? null) as BodyInit | null,
				cache: "no-store",
				// Forward abort/cancellation when provided by React Query
				signal: (init?.signal ?? null) as AbortSignal | null,
			});

			await logFetchEnd(url, res);
			return await parseAndValidate(res, url);
		} catch (error) {
			lastError = error;
			throw error;
		}
	};

	for (const baseUrl of bases) {
		try {
			return await tryFetch(baseUrl);
		} catch {
			// try next
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("Backend request failed for all candidates");
}
