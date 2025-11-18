import { useStableResizeObserver } from '@shared/libs/hooks/useStableResizeObserver'
import { useEffect } from 'react'

type CalendarApiLike = { updateSize?: () => void }

export function useCalendarResize(
	getApi: () => CalendarApiLike | undefined,
	getContainer: () => HTMLElement | null | undefined
) {
	// Initial sizing
	useEffect(() => {
		const api = getApi()
		if (api?.updateSize) {
			requestAnimationFrame(() => {
				api.updateSize?.()
			})
		}
	}, [getApi])

	// Container resize observer
	useStableResizeObserver(getContainer, () => {
		const api = getApi()
		api?.updateSize?.()
	})

	// Window/visibility/focus events
	useEffect(() => {
		const schedule = () => {
			requestAnimationFrame(() => {
				const api = getApi()
				api?.updateSize?.()
			})
		}
		const handleWindowResize = () => schedule()
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				schedule()
				requestAnimationFrame(schedule)
			}
		}
		const handleFocus = () => schedule()
		window.addEventListener('resize', handleWindowResize)
		document.addEventListener('visibilitychange', handleVisibility)
		window.addEventListener('focus', handleFocus)
		return () => {
			window.removeEventListener('resize', handleWindowResize)
			document.removeEventListener('visibilitychange', handleVisibility)
			window.removeEventListener('focus', handleFocus)
		}
	}, [getApi])
}
