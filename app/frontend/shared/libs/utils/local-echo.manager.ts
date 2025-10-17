class LocalEchoManager {
	/**
	 * Mark an operation as local to suppress WebSocket echo notifications
	 */
	markLocalEcho(key: string, ttlMs = 15_000): void {
		try {
			const globalScope = globalThis as GlobalThis;
			globalScope.__localOps = globalScope.__localOps || new Set<string>();
			globalScope.__localOps.add(key);

			setTimeout(() => {
				try {
					globalScope.__localOps?.delete(key);
				} catch {
					// Silently ignore cleanup errors in timer callback
				}
			}, ttlMs);
		} catch {
			// Silently ignore initialization errors
		}
	}

	/**
	 * Store modification context for toast notifications
	 */
	storeModificationContext(
		eventId: string,
		context: Record<string, unknown>
	): void {
		try {
			const globalScope = globalThis as GlobalThis;
			globalScope.__calendarLastModifyContext =
				globalScope.__calendarLastModifyContext ||
				new Map<string, Record<string, unknown>>();
			globalScope.__calendarLastModifyContext.set(eventId, context);
		} catch {
			// Silently ignore context storage errors
		}
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
			} catch {
				// Silently ignore cleanup errors during exception handling
			}
			throw error;
		}
	}
}

export { LocalEchoManager };
