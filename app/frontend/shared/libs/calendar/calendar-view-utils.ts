import { useCallback } from 'react'

export function calculateCalendarHeight(currentView: string): number | 'auto' {
	// Views that should naturally expand and let the page scroll
	if (currentView === 'multiMonthYear' || currentView === 'listMonth') {
		return 'auto'
	}

	// Viewport-based heights for grid views
	try {
		const DEFAULT_VIEWPORT_HEIGHT = 900
		const HEADER_HEIGHT = 64 // top header
		const CONTAINER_PADDING = 32 // p-4 top+bottom in page wrapper
		const MIN_CALENDAR_HEIGHT = 600
		const viewportHeight =
			typeof window !== 'undefined'
				? window.innerHeight
				: DEFAULT_VIEWPORT_HEIGHT
		const available = Math.max(
			viewportHeight - HEADER_HEIGHT - CONTAINER_PADDING,
			MIN_CALENDAR_HEIGHT
		)

		if (currentView?.includes('timeGrid')) {
			return available // week/day time grid
		}
		if (currentView?.includes('dayGrid')) {
			return available // month grid
		}
	} catch {
		// SSR or no window - fall back to sane defaults
		const FALLBACK_TIME_GRID_HEIGHT = 720
		const FALLBACK_DAY_GRID_HEIGHT = 650
		if (currentView?.includes('timeGrid')) {
			return FALLBACK_TIME_GRID_HEIGHT
		}
		if (currentView?.includes('dayGrid')) {
			return FALLBACK_DAY_GRID_HEIGHT
		}
	}

	const DEFAULT_CALENDAR_HEIGHT = 640
	return DEFAULT_CALENDAR_HEIGHT
}

export function useCalendarResize(
	currentView: string,
	onHeightChange?: () => void
) {
	const calculateHeight = useCallback(() => {
		if (onHeightChange) {
			onHeightChange()
		}
		return calculateCalendarHeight(currentView)
	}, [currentView, onHeightChange])

	return { calculateHeight }
}
