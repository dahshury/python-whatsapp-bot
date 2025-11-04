'use client'

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useCallback } from 'react'
import { logger } from '@/shared/libs/logger'

const logViewerApiReadyWarning = (context: string, error: unknown) => {
	logger.warn(`[useViewerApiReady] ${context}`, error)
}

export type UseViewerApiReadyParams = {
	viewerApiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>
	pendingViewerInitRef: React.MutableRefObject<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>
	isMountedRef: React.MutableRefObject<boolean>
}

/**
 * Hook for handling viewer API ready event.
 * Captures ref and applies any pending initial scene.
 *
 * @param params - Hook parameters
 * @returns Viewer API ready handler
 */
export function useViewerApiReady(params: UseViewerApiReadyParams): {
	onViewerApiReady: (api: ExcalidrawImperativeAPI) => void
} {
	const { viewerApiRef, pendingViewerInitRef, isMountedRef } = params

	const onViewerApiReady = useCallback(
		(api: ExcalidrawImperativeAPI) => {
			try {
				// Skip if component has been unmounted
				if (!isMountedRef.current) {
					return
				}
				viewerApiRef.current = api
				if (pendingViewerInitRef.current) {
					const init = pendingViewerInitRef.current as unknown as Record<
						string,
						unknown
					>
					pendingViewerInitRef.current = null
					const apiLike = api as unknown as {
						updateScene?: (s: Record<string, unknown>) => void
					}
					apiLike?.updateScene?.(init)
				}
			} catch (error) {
				logViewerApiReadyWarning('Error handling viewer API ready event', error)
			}
		},
		[viewerApiRef, pendingViewerInitRef, isMountedRef]
	)

	return {
		onViewerApiReady,
	}
}
