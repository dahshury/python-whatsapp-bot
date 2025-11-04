// Extend global Window interface to include custom properties
declare global {
	interface Window {
		__prom_metrics__?: Record<string, unknown>
		__wsConnection?: unknown
	}
}

// Helper function to set window properties safely
export function setWindowProperty<T>(property: string, value: T): void {
	if (typeof window !== 'undefined') {
		;(window as unknown as Record<string, unknown>)[property] = value
	}
}
