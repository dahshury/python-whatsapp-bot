import { useEffect, useRef } from 'react'

export function useStableResizeObserver(
	getTarget: () => HTMLElement | null | undefined,
	onResize: () => void
) {
	const observerRef = useRef<ResizeObserver | null>(null)

	useEffect(() => {
		const target = getTarget()
		if (!target) {
			return
		}
		const schedule = () => {
			requestAnimationFrame(() => {
				onResize()
			})
		}
		const obs = new ResizeObserver(() => schedule())
		obs.observe(target)
		observerRef.current = obs
		return () => {
			obs.disconnect()
			observerRef.current = null
		}
	}, [getTarget, onResize])
}
