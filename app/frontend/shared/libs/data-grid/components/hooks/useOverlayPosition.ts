import React from 'react'

export type OverlayPosition = {
	top: number
	left: number
}

type UseOverlayPositionOptions = {
	reanchorKey?: unknown
}

export function useOverlayPosition<T extends HTMLElement = HTMLDivElement>(
	ref: React.RefObject<T | null>,
	options: UseOverlayPositionOptions = {}
): OverlayPosition | null {
	const [position, setPosition] = React.useState<OverlayPosition | null>(null)
	const { reanchorKey } = options
	const element = ref.current

	const compute = React.useCallback(() => {
		try {
			const el = ref.current
			if (!el) {
				return
			}
			const rect = el.getBoundingClientRect()
			setPosition({ top: rect.top, left: rect.right })
		} catch {
			/* noop */
		}
	}, [ref])

	React.useEffect(() => {
		compute()

		const onScroll = () => compute()
		const onResize = () => compute()
		const shouldWatchFullscreenTargets = Boolean(reanchorKey)

		const scrollTargets: Array<EventTarget | null | undefined> = [
			typeof window !== 'undefined' ? window : undefined,
			typeof document !== 'undefined' ? document : undefined,
			element,
			shouldWatchFullscreenTargets && typeof document !== 'undefined'
				? document.getElementById('grid-fullscreen-portal')
				: undefined,
			shouldWatchFullscreenTargets && typeof document !== 'undefined'
				? (document.querySelector(
						'.glide-grid-fullscreen-container'
					) as HTMLElement | null)
				: undefined,
		]

		for (const target of scrollTargets) {
			try {
				if (target && 'addEventListener' in target) {
					;(target as unknown as Window).addEventListener('scroll', onScroll, {
						capture: true,
						passive: true,
					} as unknown as boolean)
				}
			} catch {
				/* noop */
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('resize', onResize)
		}

		// Use requestAnimationFrame to prevent ResizeObserver loop errors
		const ro = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				compute()
			})
		})
		try {
			if (element) {
				ro.observe(element)
			}
		} catch {
			/* noop */
		}

		return () => {
			for (const target of scrollTargets) {
				try {
					if (target && 'removeEventListener' in target) {
						;(target as unknown as Window).removeEventListener(
							'scroll',
							onScroll,
							true
						)
					}
				} catch {
					/* noop */
				}
			}
			if (typeof window !== 'undefined') {
				window.removeEventListener('resize', onResize)
			}
			try {
				ro.disconnect()
			} catch {
				/* noop */
			}
		}
	}, [compute, element, reanchorKey])

	return position
}
