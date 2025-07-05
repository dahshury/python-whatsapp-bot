import type { BrowserCapabilities } from "../core/types";

export class BrowserUtils {
	private static capabilities: BrowserCapabilities | null = null;

	static getBrowserCapabilities(): BrowserCapabilities {
		if (BrowserUtils.capabilities) {
			return BrowserUtils.capabilities;
		}

		const isTouchDevice = BrowserUtils.detectTouchDevice();
		const hasCustomScrollbars = BrowserUtils.detectCustomScrollbars();
		const supportsFileSystemAPI = BrowserUtils.detectFileSystemAPI();
		const supportsResizeObserver = BrowserUtils.detectResizeObserver();

		BrowserUtils.capabilities = {
			isTouchDevice,
			hasCustomScrollbars,
			supportsFileSystemAPI,
			supportsResizeObserver,
		};

		return BrowserUtils.capabilities;
	}

	private static detectTouchDevice(): boolean {
		return window.matchMedia?.("(pointer: coarse)").matches;
	}

	private static detectCustomScrollbars(): boolean {
		return (
			(window.navigator.userAgent.includes("Mac OS") &&
				window.navigator.userAgent.includes("Safari")) ||
			window.navigator.userAgent.includes("Chrome")
		);
	}

	private static detectFileSystemAPI(): boolean {
		return "showSaveFilePicker" in window;
	}

	private static detectResizeObserver(): boolean {
		return typeof ResizeObserver !== "undefined";
	}

	static isFromMac(): boolean {
		return window.navigator.platform.toLowerCase().includes("mac");
	}

	static isFromWindows(): boolean {
		return window.navigator.platform.toLowerCase().includes("win");
	}

	static canAccessIFrame(iframe: HTMLIFrameElement): boolean {
		try {
			return iframe.contentDocument !== null;
		} catch {
			return false;
		}
	}

	static generateUID(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
	}

	static timeout(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	static setCookie(name: string, value?: string, expiration?: Date): void {
		let cookieString = `${name}=${value || ""}`;

		if (expiration) {
			cookieString += `; expires=${expiration.toUTCString()}`;
		}

		cookieString += "; path=/";
		document.cookie = cookieString;
	}

	static getCookie(name: string): string | null {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) {
			return parts.pop()?.split(";").shift() || null;
		}
		return null;
	}
}
