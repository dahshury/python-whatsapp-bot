'use client'

export const WRAPPER_BOTTOM_INSET_PX = 12
export const WRAPPER_TOP_PADDING_PX = 4
export const CARD_PADDING_VERTICAL_PX = 16
export const CARD_BORDER_VERTICAL_PX = 2
export const CARD_CHROME_VERTICAL_PX =
	CARD_PADDING_VERTICAL_PX + CARD_BORDER_VERTICAL_PX
export const DEFAULT_MIN_CALENDAR_HEIGHT = 600

export function calculateAvailableCalendarHeight(
	wrapper: HTMLElement | null
): number {
	if (typeof window === 'undefined') {
		return DEFAULT_MIN_CALENDAR_HEIGHT
	}
	const viewport =
		window.visualViewport?.height ??
		window.innerHeight ??
		DEFAULT_MIN_CALENDAR_HEIGHT
	const wrapperTop = wrapper?.getBoundingClientRect()?.top ?? 0
	const available =
		viewport -
		wrapperTop -
		WRAPPER_TOP_PADDING_PX -
		CARD_CHROME_VERTICAL_PX -
		WRAPPER_BOTTOM_INSET_PX
	const fallback = DEFAULT_MIN_CALENDAR_HEIGHT
	const numericAvailable = Number.isFinite(available)
		? (available as number)
		: fallback
	return Math.max(fallback, Math.floor(numericAvailable))
}

export function updateCalendarViewportHeightVar(varName = '--calendar-dvh'): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return
	}
	try {
		const rawViewportHeight =
			window.visualViewport?.height ?? window.innerHeight ?? DEFAULT_MIN_CALENDAR_HEIGHT
		const viewportHeight = Math.max(0, Math.floor(rawViewportHeight))
		document.documentElement.style.setProperty(varName, `${viewportHeight}px`)
	} catch {
		// Silently ignore failures when setting CSS variables
	}
}

