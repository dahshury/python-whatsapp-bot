import { BACKEND_CONNECTION, HTTP_STATUS } from "@/shared/config";
import {
  markBackendConnected,
  markBackendDisconnected,
} from "@/shared/libs/backend-connection-store";
import { unstableCache } from "@/shared/libs/cache/unstable-cache";

const BACKEND_FAILURE_REGEX = /Backend request failed|fetch failed/i;

function parseBackendEnvCandidates(raw?: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
}

function isLocalhostHostname(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  );
}

function dedupeCandidates(candidates: string[]): string[] {
  return Array.from(new Set(candidates.filter(Boolean)));
}

function resolveBackendBaseUrlCandidates(): string[] {
  // Server-side (Next.js API): try Docker service first, then localhost
  const isServer = typeof window === "undefined";
  const envCandidates = parseBackendEnvCandidates(
    isServer
      ? process.env.BACKEND_URL || process.env.INTERNAL_BACKEND_URL
      : process.env.NEXT_PUBLIC_BACKEND_URL
  );
  if (isServer) {
    return dedupeCandidates([
      ...envCandidates,
      "http://backend:8000",
      "http://localhost:8000",
    ]);
  }

  // Browser: For development, try direct backend connection first (faster, bypasses Next.js proxy)
  // Fall back to Next.js API proxy if direct connection fails [[memory:8680273]]
  const candidates: string[] = [...envCandidates];

  try {
    const hostname = window.location.hostname;
    if (isLocalhostHostname(hostname)) {
      // On localhost, try direct connection to backend
      candidates.push("http://localhost:8000");
    } else {
      // On network (e.g., 192.168.x.x), construct backend URL using same hostname
      // This allows mobile/other devices on same network to access backend
      candidates.push(`http://${hostname}:8000`);
    }
  } catch {
    // Accessing window location failed - ignore and continue with defaults
  }

  candidates.push("/api");

  return dedupeCandidates(candidates);
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

type CallPythonBackendOptions = {
  cache?: RequestCache;
  timeoutMs?: number;
};

/**
 * Create a fetch request with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export async function callPythonBackend<T = unknown>(
  path: string,
  init?: RequestInit,
  options?: CallPythonBackendOptions
): Promise<T> {
  const bases = resolveBackendBaseUrlCandidates();
  const timeoutMs = options?.timeoutMs ?? BACKEND_CONNECTION.TIMEOUT.DEFAULT_MS;
  let lastError: unknown;
  let capturedFailure: {
    data: unknown;
    url: string;
    status: number;
    reason?: string;
    message?: string;
    responseBody?: string;
  } | null = null;

  for (const baseUrl of bases) {
    const url = joinUrl(baseUrl, path);
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: init?.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...(init?.headers as Record<string, string>),
          },
          body: (init?.body ?? null) as BodyInit | null,
          cache: options?.cache ?? "no-store",
        },
        timeoutMs
      );

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      let responseBody: string | undefined;
      let payload: unknown;

      if (isJson) {
        payload = await res.json().catch(() => ({}));
      } else {
        responseBody = await res.text();
        payload = {
          success: res.ok,
          status: res.status,
          message: responseBody,
        };
      }

      const message = (() => {
        if (
          isJson &&
          payload &&
          typeof (payload as { message?: unknown }).message === "string"
        ) {
          return String((payload as { message: string }).message);
        }
        return responseBody;
      })();

      const proxyNotFound =
        baseUrl === "/api" && res.status === HTTP_STATUS.NOT_FOUND;
      const backendLikelyDown =
        (!res.ok &&
          res.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR &&
          typeof message === "string" &&
          BACKEND_FAILURE_REGEX.test(message)) ||
        proxyNotFound;

      if (backendLikelyDown) {
        const failure: {
          data: unknown;
          url: string;
          status: number;
          reason?: string;
          message?: string;
          responseBody?: string;
        } = {
          data: payload,
          url,
          status: res.status,
        };
        if (proxyNotFound) {
          failure.reason =
            "Proxy route returned 404; backend unreachable or route missing";
        }
        if (typeof message === "string" && message.trim().length > 0) {
          failure.message = message;
        }
        const serializedBody = isJson ? JSON.stringify(payload) : responseBody;
        if (serializedBody && serializedBody.length > 0) {
          failure.responseBody = serializedBody;
        }
        capturedFailure = failure;
        lastError =
          message && typeof message === "string"
            ? new Error(message)
            : new Error("Backend request failed for all candidates");
        continue;
      }

      markBackendConnected();
      return payload as T;
    } catch (error) {
      lastError = error;
      // Try the next candidate host
    }
  }

  if (capturedFailure) {
    markBackendDisconnected({
      url: capturedFailure.url,
      status: capturedFailure.status,
      ...(capturedFailure.reason ? { reason: capturedFailure.reason } : {}),
      ...(capturedFailure.message ? { message: capturedFailure.message } : {}),
      ...(capturedFailure.responseBody
        ? { responseBody: capturedFailure.responseBody }
        : {}),
    });
    return capturedFailure.data as T;
  }

  markBackendDisconnected({
    reason: "All backend candidates failed",
    message:
      lastError instanceof Error
        ? lastError.message
        : "Backend request failed for all candidates",
  });
  throw lastError instanceof Error
    ? lastError
    : new Error("Backend request failed for all candidates");
}

type CallPythonBackendCachedOptions = {
  revalidate?: number;
  keyParts?: string[];
  tags?: string[];
};

function serializeHeaders(headers?: HeadersInit): string {
  if (!headers) {
    return "";
  }
  if (headers instanceof Headers) {
    return JSON.stringify(Array.from(headers.entries()).sort());
  }
  if (Array.isArray(headers)) {
    return JSON.stringify(headers.slice().sort());
  }
  return JSON.stringify(Object.entries(headers).sort());
}

function buildBackendCacheKey(path: string, init?: RequestInit): string[] {
  const method = init?.method ?? "GET";
  const body = (() => {
    if (!init?.body) {
      return "";
    }
    if (typeof init.body === "string") {
      return init.body;
    }
    if (init.body instanceof URLSearchParams) {
      return init.body.toString();
    }
    try {
      return JSON.stringify(init.body);
    } catch {
      return String(init.body);
    }
  })();
  const headersKey = serializeHeaders(init?.headers);
  return ["python-backend", method, path, body, headersKey];
}

export function callPythonBackendCached<T = unknown>(
  path: string,
  init?: RequestInit,
  options?: CallPythonBackendCachedOptions
): Promise<T> {
  const revalidate = options?.revalidate ?? 60;
  const keyParts = options?.keyParts ?? buildBackendCacheKey(path, init);
  const cached = unstableCache(
    async () =>
      callPythonBackend<T>(path, init, {
        cache: "force-cache",
      }),
    keyParts,
    { revalidate, ...(options?.tags ? { tags: options.tags } : {}) }
  );
  return cached();
}
