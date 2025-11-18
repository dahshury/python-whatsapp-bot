/**
 * Performance Cache Markers
 *
 * Utilities for tracking cache hit/miss performance in cached components.
 * These markers can be analyzed using Chrome DevTools Performance tab
 * or React DevTools Profiler.
 */

/**
 * Mark a cache hit for a component
 *
 * @param componentName - Name of the cached component
 */
export function markCacheHit(componentName: string): void {
	if (performance?.mark) {
		try {
			performance.mark(`cache-hit-${componentName}`)
		} catch {
			// Silently fail if performance API is unavailable
		}
	}
}

/**
 * Mark a cache miss for a component
 *
 * @param componentName - Name of the cached component
 */
export function markCacheMiss(componentName: string): void {
	if (performance?.mark) {
		try {
			performance.mark(`cache-miss-${componentName}`)
		} catch {
			// Silently fail if performance API is unavailable
		}
	}
}

/**
 * Measure cache performance between two marks
 *
 * @param measureName - Name for the measurement
 * @param startMark - Start performance mark
 * @param endMark - End performance mark
 */
export function measureCachePerformance(
	measureName: string,
	startMark: string,
	endMark: string
): void {
	if (performance?.measure) {
		try {
			performance.measure(measureName, startMark, endMark)
		} catch {
			// Silently fail
		}
	}
}

/**
 * Get all cache-related performance marks
 */
export function getCacheMarks(): PerformanceEntry[] {
	if (performance?.getEntriesByType) {
		try {
			const marks = performance.getEntriesByType('mark')
			return marks.filter(
				(mark) =>
					mark.name.startsWith('cache-hit-') ||
					mark.name.startsWith('cache-miss-')
			)
		} catch {
			return []
		}
	}
	return []
}

/**
 * Clear all cache-related performance marks
 */
export function clearCacheMarks(): void {
	if (typeof performance !== 'undefined') {
		try {
			const marks = getCacheMarks()
			for (const mark of marks) {
				performance.clearMarks(mark.name)
			}
		} catch {
			// Silently fail
		}
	}
}

/**
 * Log cache statistics to console (dev only)
 */
export function logCacheStats(): void {
	if (process.env.NODE_ENV !== 'development') {
		return
	}

	const marks = getCacheMarks()
	const hits = marks.filter((m) => m.name.startsWith('cache-hit-'))
	const misses = marks.filter((m) => m.name.startsWith('cache-miss-'))

	if (hits.length > 0) {
		const hitsByComponent: Record<string, number> = {}
		for (const hit of hits) {
			const componentName = hit.name.replace('cache-hit-', '')
			hitsByComponent[componentName] = (hitsByComponent[componentName] || 0) + 1
		}
	}

	if (misses.length > 0) {
		const missesByComponent: Record<string, number> = {}
		for (const miss of misses) {
			const componentName = miss.name.replace('cache-miss-', '')
			missesByComponent[componentName] =
				(missesByComponent[componentName] || 0) + 1
		}
	}
}
