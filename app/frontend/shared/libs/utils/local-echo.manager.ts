class LocalEchoManager {
	/**
	 * Mark an operation as local to suppress WebSocket echo notifications
	 */
	markLocalEcho(key: string, ttlMs = 15_000): void {
		try {
			const globalScope = globalThis as typeof globalThis
			globalScope.__localOps =
				(globalScope.__localOps as Set<string> | undefined) || new Set<string>()
			;(globalScope.__localOps as Set<string>).add(key)

			setTimeout(() => {
				try {
					;(globalScope.__localOps as Set<string> | undefined)?.delete(key)
				} catch {
					// Cleanup failed - key may remain in set
				}
			}, ttlMs)
		} catch {
			// Local echo marking failed - operation may trigger echo notification
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
			const globalScope = globalThis as typeof globalThis
			globalScope.__calendarLastModifyContext =
				(globalScope.__calendarLastModifyContext as
					| Map<string, Record<string, unknown>>
					| undefined) || new Map<string, Record<string, unknown>>()
			;(
				globalScope.__calendarLastModifyContext as Map<
					string,
					Record<string, unknown>
				>
			).set(eventId, context)
		} catch {
			// Context storage failed - modification context may be lost
		}
	}

	/**
	 * Manage event change suppression depth
	 */
	withSuppressedEventChange<T>(callback: () => T): T {
		try {
			const globalScope = globalThis as typeof globalThis
			globalScope.__suppressEventChangeDepth =
				((globalScope.__suppressEventChangeDepth as number | undefined) || 0) +
				1

			const result = callback()

			globalScope.__suppressEventChangeDepth =
				((globalScope.__suppressEventChangeDepth as number | undefined) || 0) -
				1

			return result
		} catch (error) {
			// Ensure we decrement even if callback throws
			try {
				const globalScope = globalThis as typeof globalThis
				globalScope.__suppressEventChangeDepth =
					((globalScope.__suppressEventChangeDepth as number | undefined) ||
						0) - 1
			} catch {
				// Depth decrement failed - suppression state may be inconsistent
			}
			throw error
		}
	}
}

export { LocalEchoManager }
