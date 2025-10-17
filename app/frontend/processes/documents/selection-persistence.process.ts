const STORAGE_KEY = "docs:selectedWaId";

export function persistSelectedWaId(waId: string | null): void {
	try {
		if (waId) {
			localStorage.setItem(STORAGE_KEY, String(waId));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch (_error) {
		// Silently ignore storage errors - not critical for operation
	}
}

export function restoreSelectedWaId(): string | null {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		return v ? String(v) : null;
	} catch {
		return null;
	}
}
