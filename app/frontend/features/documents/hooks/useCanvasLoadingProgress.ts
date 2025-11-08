import { useEffect, useRef, useState } from 'react'
import type { TldrawStoreState } from '@/features/documents/hooks/useTldrawStore'

type LoadingProgressState = {
	isLoading: boolean
	isFetching: boolean
	hasData: boolean
	storeStatus: TldrawStoreState['status']
}

// Progress milestone constants
const PROGRESS_INITIAL = 0
const PROGRESS_API_STARTED = 20
const PROGRESS_API_RECEIVED = 40
const PROGRESS_STORE_LOADING = 80
const PROGRESS_STORE_READY = 100
const EASING_EXPONENT = 3

/**
 * Hook to calculate loading progress based on actual milestones
 * Progress milestones:
 * - 0%: Initial state (no waId or not started)
 * - 20%: API call started (isLoading or isFetching)
 * - 40%: API response received (hasData but store not ready)
 * - 60%: Snapshot extracted and normalized
 * - 80%: Store created and snapshot loading started
 * - 100%: Store ready
 */
export function useCanvasLoadingProgress({
	isLoading,
	isFetching,
	hasData,
	storeStatus,
}: LoadingProgressState): number {
	const [progress, setProgress] = useState(0)
	const animationFrameRef = useRef<number | null>(null)
	const currentProgressRef = useRef(0)

	useEffect(() => {
		// Cancel any ongoing animation
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current)
			animationFrameRef.current = null
		}

		let targetProgress = PROGRESS_INITIAL

		// 100%: Store ready
		if (storeStatus === 'ready') {
			targetProgress = PROGRESS_STORE_READY
		}
		// 80%: Store created and loading snapshot (hasData and store loading)
		else if (hasData && storeStatus === 'loading') {
			targetProgress = PROGRESS_STORE_LOADING
		}
		// 40%: API response received (hasData but store not yet loading)
		else if (hasData && storeStatus !== 'loading') {
			targetProgress = PROGRESS_API_RECEIVED
		}
		// 20%: API call started
		else if (isLoading || isFetching) {
			targetProgress = PROGRESS_API_STARTED
		}
		// 0%: Initial state or error
		else {
			targetProgress = PROGRESS_INITIAL
		}

		// Only animate if target is different from current progress
		// Use ref to avoid stale closure issues
		const startProgress = currentProgressRef.current
		if (targetProgress !== startProgress) {
			const duration = 300 // Animation duration in ms
			const difference = targetProgress - startProgress
			const startTime = Date.now()

			const animate = () => {
				const elapsed = Date.now() - startTime
				const progressRatio = Math.min(elapsed / duration, 1)
				// Ease-out animation
				const eased = 1 - (1 - progressRatio) ** EASING_EXPONENT
				const currentProgress = startProgress + difference * eased

				currentProgressRef.current = currentProgress
				setProgress(currentProgress)

				if (progressRatio < 1) {
					animationFrameRef.current = requestAnimationFrame(animate)
				} else {
					currentProgressRef.current = targetProgress
					setProgress(targetProgress)
					animationFrameRef.current = null
				}
			}

			animationFrameRef.current = requestAnimationFrame(animate)
		}

		// Cleanup function to cancel animation on unmount or dependency change
		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current)
				animationFrameRef.current = null
			}
		}
	}, [isLoading, isFetching, hasData, storeStatus])

	return Math.round(progress)
}
