export function ensureGlobalStyle(id: string, cssText: string): void {
	try {
		if (typeof document === "undefined") {
			return;
		}
		if (!document.getElementById(id)) {
			const style = document.createElement("style");
			style.id = id;
			style.textContent = cssText;
			document.head.appendChild(style);
		}
	} catch {
		// Silently ignore errors from DOM operations (e.g., in non-DOM environments or when appendChild fails)
	}
}
