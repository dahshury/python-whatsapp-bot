export function beginRestGuard(key: string): void {
	try {
		(globalThis as unknown as Record<string, unknown>)[key] = true;
	} catch {
		// Silently ignore errors when setting guard flag on globalThis
	}
}

export function endRestGuard(key: string): void {
	try {
		delete (globalThis as unknown as Record<string, unknown>)[key];
	} catch {
		// Silently ignore errors when deleting guard flag from globalThis
	}
}
