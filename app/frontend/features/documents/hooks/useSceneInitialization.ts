'use client'

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useCallback } from 'react'
import { logger } from '@/shared/libs/logger'

const logSceneInitializationWarning = (context: string, error: unknown) => {
	logger.warn(`[useSceneInitialization] ${context}`, error)
}

export type UseSceneInitializationParams = {
	onExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void
	sceneRef: React.MutableRefObject<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>
	resolvedTheme: string | undefined
	isMountedRef: React.MutableRefObject<boolean>
}

/**
 * Hook for applying current scene when API becomes ready.
 * Avoids a blank first render before external update.
 * Uses microtask + rAF to avoid flushSync during render.
 *
 * @param params - Hook parameters
 * @returns API ready handler
 */
export function useSceneInitialization(params: UseSceneInitializationParams): {
	onApiReadyWithApply: (api: ExcalidrawImperativeAPI) => void
} {
	const { onExcalidrawAPI, sceneRef, resolvedTheme, isMountedRef } = params

	const onApiReadyWithApply = useCallback(
		(api: ExcalidrawImperativeAPI) => {
			try {
				onExcalidrawAPI(api)
				// Skip if component has been unmounted
				if (!isMountedRef.current) {
					return
				}
				const current = sceneRef.current
				if (current) {
					// Defer to microtask + rAF to avoid flushSync during render
					Promise.resolve().then(() => {
						try {
							// Check mounted status before scheduling rAF work
							if (!isMountedRef.current) {
								return
							}
							requestAnimationFrame(() => {
								try {
									// Final mounted check before updating
									if (!isMountedRef.current) {
										return
									}
									;(
										api as unknown as {
											updateScene?: (s: Record<string, unknown>) => void
										}
									)?.updateScene?.({
										...current,
										appState: {
											...(current.appState || {}),
											viewModeEnabled: false,
											zenModeEnabled: false,
											theme: resolvedTheme === 'dark' ? 'dark' : 'light',
										},
									})
								} catch (error) {
									logSceneInitializationWarning(
										'Failed to update scene in requestAnimationFrame',
										error
									)
								}
							})
						} catch (error) {
							logSceneInitializationWarning(
								'Failed to schedule scene update in requestAnimationFrame',
								error
							)
						}
					})
				}
			} catch (error) {
				logSceneInitializationWarning(
					'Error during scene initialization',
					error
				)
			}
		},
		[onExcalidrawAPI, resolvedTheme, sceneRef, isMountedRef]
	)

	return {
		onApiReadyWithApply,
	}
}
