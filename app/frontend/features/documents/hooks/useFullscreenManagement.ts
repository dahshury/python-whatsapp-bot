'use client'

import { useCallback, useEffect, useState } from 'react'
import { logger } from '@/shared/libs/logger'

const logFullscreenWarning = (context: string, error: unknown) => {
	logger.warn(`[useFullscreenManagement] ${context}`, error)
}

export type UseFullscreenManagementParams = {
	fsContainerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Hook for managing fullscreen state and handlers.
 * Handles fullscreen state tracking and entry/exit operations.
 *
 * @param params - Hook parameters
 * @returns Fullscreen state and handlers
 */
export function useFullscreenManagement(
	params: UseFullscreenManagementParams
): {
	isFullscreen: boolean
	enterFullscreen: () => void
	exitFullscreen: () => void
} {
	const { fsContainerRef } = params
	const [isFullscreen, setIsFullscreen] = useState(false)

	// Fullscreen handling for the whole work area (grid + both canvases)
	useEffect(() => {
		const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
		document.addEventListener('fullscreenchange', onFs)
		return () => document.removeEventListener('fullscreenchange', onFs)
	}, [])

	const enterFullscreen = useCallback(() => {
		try {
			const el = fsContainerRef.current
			if (!el) {
				return
			}
			if (document.fullscreenElement) {
				return
			}
			const requestFullscreen = el.requestFullscreen?.bind(el)
			if (!requestFullscreen) {
				return
			}
			requestFullscreen().catch((error) => {
				logFullscreenWarning('Requesting fullscreen failed', error)
			})
		} catch (error) {
			logFullscreenWarning('Unexpected error while entering fullscreen', error)
		}
	}, [fsContainerRef])

	const exitFullscreen = useCallback(() => {
		try {
			if (!document.fullscreenElement) {
				return
			}
			const exitFullscreenFn = document.exitFullscreen?.bind(document)
			if (!exitFullscreenFn) {
				return
			}
			exitFullscreenFn().catch((error) => {
				logFullscreenWarning('Exiting fullscreen failed', error)
			})
		} catch (error) {
			logFullscreenWarning('Unexpected error while exiting fullscreen', error)
		}
	}, [])

	return {
		isFullscreen,
		enterFullscreen,
		exitFullscreen,
	}
}
