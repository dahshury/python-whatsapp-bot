import type { BrowserCapabilities } from "../core/types";

// Cache for browser capabilities to avoid repeated detection
let capabilitiesCache: BrowserCapabilities | null = null;

/**
 * Get browser capabilities with caching
 */
export function getBrowserCapabilities(): BrowserCapabilities {
	if (capabilitiesCache) {
		return capabilitiesCache;
	}

	const isTouchDevice = detectTouchDevice();
	const hasCustomScrollbars = detectCustomScrollbars();
	const supportsFileSystemAPI = detectFileSystemAPI();
	const supportsResizeObserver = detectResizeObserver();

	capabilitiesCache = {
		isTouchDevice,
		hasCustomScrollbars,
		supportsFileSystemAPI,
		supportsResizeObserver,
	};

	return capabilitiesCache;
}

// Backwards-compatible namespace-style export expected as { BrowserUtils }
export const BrowserUtils = {
	getBrowserCapabilities,
	isFromMac,
	isFromWindows,
	canAccessIFrame,
	generateUID,
	timeout,
	setCookie,
	getCookie,
};

/**
 * Detect if the device supports touch
 */
function detectTouchDevice(): boolean {
	return window.matchMedia?.("(pointer: coarse)").matches;
}

/**
 * Detect if the browser has custom scrollbars
 */
function detectCustomScrollbars(): boolean {
	return (
		(window.navigator.userAgent.includes("Mac OS") &&
			window.navigator.userAgent.includes("Safari")) ||
		window.navigator.userAgent.includes("Chrome")
	);
}

/**
 * Detect if the browser supports the File System API
 */
function detectFileSystemAPI(): boolean {
	return "showSaveFilePicker" in window;
}

/**
 * Detect if the browser supports ResizeObserver
 */
function detectResizeObserver(): boolean {
	return typeof ResizeObserver !== "undefined";
}

/**
 * Check if the user is on macOS
 */
export function isFromMac(): boolean {
	return window.navigator.platform.toLowerCase().includes("mac");
}

/**
 * Check if the user is on Windows
 */
export function isFromWindows(): boolean {
	return window.navigator.platform.toLowerCase().includes("win");
}

/**
 * Check if we can access an iframe's content
 */
export function canAccessIFrame(iframe: HTMLIFrameElement): boolean {
	try {
		return iframe.contentDocument !== null;
	} catch {
		return false;
	}
}

/**
 * Generate a unique identifier
 */
export function generateUID(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create a promise that resolves after a specified timeout
 */
export function timeout(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Set a cookie with optional expiration
 */
export function setCookie(
	name: string,
	value?: string,
	expiration?: Date,
): void {
	let cookieString = `${name}=${value || ""}`;

	if (expiration) {
		cookieString += `; expires=${expiration.toUTCString()}`;
	}

	cookieString += "; path=/";

	// Try using Cookie Store API if available, fallback to document.cookie
	const w = window as unknown as {
		cookieStore?: {
			set: (opts: {
				name: string;
				value: string;
				expires?: number;
				path?: string;
			}) => Promise<void>;
		};
	};
	if (w.cookieStore) {
		try {
			w.cookieStore.set({
				name,
				value: value || "",
				...(expiration ? { expires: expiration.getTime() } : {}),
				path: "/",
			});
		} catch {
			// Fallback to document.cookie
			// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API may not be available in all browsers; safe fallback required
			document.cookie = cookieString;
		}
	} else {
		// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is unavailable; using standards-compliant fallback
		document.cookie = cookieString;
	}
}

/**
 * Get a cookie value by name
 */
export async function getCookie(name: string): Promise<string | null> {
	// Try using Cookie Store API if available, fallback to document.cookie
	const w = window as unknown as {
		cookieStore?: {
			get: (name: string) => Promise<{ value?: string } | undefined>;
		};
	};
	if (w.cookieStore) {
		try {
			const cookie = await w.cookieStore.get(name);
			return cookie?.value || null;
		} catch {
			// Fallback to document.cookie
		}
	}

	// Fallback method using document.cookie
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) {
		return parts.pop()?.split(";").shift() || null;
	}
	return null;
}
