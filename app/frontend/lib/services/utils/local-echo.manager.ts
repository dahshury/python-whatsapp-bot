class LocalEchoManager {
	/**
	 * Mark an operation as local to suppress WebSocket echo notifications
	 */
	markLocalEcho(key: string, ttlMs = 15000): void {
		try {
			const globalScope = globalThis as GlobalThis;
			globalScope.__localOps = globalScope.__localOps || new Set<string>();
			globalScope.__localOps.add(key);

			setTimeout(() => {
				try {
					globalScope.__localOps?.delete(key);
				} catch {}
			}, ttlMs);
		} catch {}
	}

	/**
	 * Store modification context for toast notifications
	 */
	storeModificationContext(
		eventId: string,
		context: Record<string, unknown>,
	): void {
		try {
			const globalScope = globalThis as GlobalThis;
			globalScope.__calendarLastModifyContext =
				globalScope.__calendarLastModifyContext ||
				new Map<string, Record<string, unknown>>();
			globalScope.__calendarLastModifyContext.set(eventId, context);
		} catch {}
	}

	/**
	 * Manage event change suppression depth
	 */
	withSuppressedEventChange<T>(callback: () => T): T {
		try {
			const globalScope = globalThis as GlobalThis;
			globalScope.__suppressEventChangeDepth =
				(globalScope.__suppressEventChangeDepth || 0) + 1;

			const result = callback();

			globalScope.__suppressEventChangeDepth =
				(globalScope.__suppressEventChangeDepth || 0) - 1;

			return result;
		} catch (error) {
			// Ensure we decrement even if callback throws
			try {
				const globalScope = globalThis as GlobalThis;
				globalScope.__suppressEventChangeDepth =
					(globalScope.__suppressEventChangeDepth || 0) - 1;
			} catch {}
			throw error;
		}
	}
}

export { LocalEchoManager };
