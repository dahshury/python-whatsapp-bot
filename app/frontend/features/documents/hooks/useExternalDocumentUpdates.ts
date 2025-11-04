'use client'

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useEffect } from 'react'
import { DEFAULT_DOCUMENT_WA_ID, toSceneFromDoc } from '@/shared/libs/documents'
import { computeSceneSignature } from '@/shared/libs/documents/scene-utils'
import { logger } from '@/shared/libs/logger'

const logExternalUpdateWarning = (context: string, error: unknown) => {
	logger.warn(`[useExternalDocumentUpdates] ${context}`, error)
}

export type UseExternalDocumentUpdatesParams = {
	waId: string
	setScene: (
		scene: {
			elements?: unknown[]
			appState?: Record<string, unknown>
			files?: Record<string, unknown>
		} | null
	) => void
	pendingInitialLoadWaIdRef: React.MutableRefObject<string | null>
	editorSigRef: React.MutableRefObject<string | null>
	viewerSigRef: React.MutableRefObject<string | null>
	viewerApiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>
	pendingViewerInitRef: React.MutableRefObject<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>
	initializeCamera: (viewerCamera: Record<string, unknown>) => void
}

/**
 * Hook for listening to external document updates.
 * ONLY applies to editor during initial load.
 * After initial load, editor becomes write-only to prevent remounting during edits/auto-save.
 * Top viewer always mirrors bottom editor via handleCanvasChange.
 *
 * @param params - Hook parameters
 */
export function useExternalDocumentUpdates(
	params: UseExternalDocumentUpdatesParams
): void {
	const {
		waId,
		setScene,
		pendingInitialLoadWaIdRef,
		editorSigRef,
		viewerSigRef,
		viewerApiRef,
		pendingViewerInitRef,
		initializeCamera,
	} = params

	useEffect(() => {
		const onExternal = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string
					document?: Record<string, unknown> | null
				}
				if (String(detail?.wa_id || '') !== String(waId)) {
					return
				}

				const s = toSceneFromDoc(detail?.document || null)
				const sig = computeSceneSignature(
					(s?.elements as unknown[]) || [],
					(s?.appState as Record<string, unknown>) || {},
					(s?.files as Record<string, unknown>) || {}
				)

				// Only update editor during initial load for this specific waId
				const isPendingInitialLoad = pendingInitialLoadWaIdRef.current === waId
				const hasElements = Array.isArray(s.elements) && s.elements.length > 0

				// Only mark as loaded if we received actual content, not an empty document
				if (
					isPendingInitialLoad &&
					sig &&
					sig !== editorSigRef.current &&
					(hasElements || waId === DEFAULT_DOCUMENT_WA_ID)
				) {
					editorSigRef.current = sig
					setScene(s)
					viewerSigRef.current = sig
					// Load viewer's saved camera or use empty state
					const viewerCamera = s.viewerAppState || {}
					initializeCamera(viewerCamera)

					// Initialize viewer via API (preserve its independent camera afterwards)
					try {
						const initScene = {
							elements: s.elements || [],
							appState: viewerCamera,
							files: s.files || {},
						} as Record<string, unknown>
						const api = viewerApiRef.current as unknown as {
							updateScene?: (s: Record<string, unknown>) => void
						} | null
						if (api?.updateScene) {
							api.updateScene(initScene)
						} else {
							pendingViewerInitRef.current = initScene as unknown as {
								elements?: unknown[]
								appState?: Record<string, unknown>
								files?: Record<string, unknown>
							}
						}
					} catch (error) {
						logExternalUpdateWarning(
							'Failed to initialize viewer via API during external update',
							error
						)
					}
					// Mark this specific waId as loaded only if we got content
					pendingInitialLoadWaIdRef.current = null
				}
			} catch (error) {
				logExternalUpdateWarning(
					'Error handling external document update',
					error
				)
			}
		}
		const onApplied = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string
					scene?: Record<string, unknown> | null
				}
				if (String(detail?.wa_id || '') !== String(waId)) {
					return
				}
				const s = (detail?.scene || null) as {
					elements?: unknown[]
					appState?: Record<string, unknown>
					files?: Record<string, unknown>
					viewerAppState?: Record<string, unknown>
				} | null
				if (s) {
					const sig = computeSceneSignature(
						(s?.elements as unknown[]) || [],
						(s?.appState as Record<string, unknown>) || {},
						(s?.files as Record<string, unknown>) || {}
					)

					// Only update editor during initial load for this specific waId
					const isPendingInitialLoad =
						pendingInitialLoadWaIdRef.current === waId
					const hasElements = Array.isArray(s.elements) && s.elements.length > 0

					// Only mark as loaded if we received actual content, not an empty document
					if (
						isPendingInitialLoad &&
						sig &&
						sig !== editorSigRef.current &&
						(hasElements || waId === DEFAULT_DOCUMENT_WA_ID)
					) {
						editorSigRef.current = sig
						setScene(s)
						viewerSigRef.current = sig
						// Load viewer's saved camera or use empty state
						const viewerCamera = s.viewerAppState || {}
						initializeCamera(viewerCamera)

						// Initialize viewer via API (preserve its independent camera afterwards)
						try {
							const initScene = {
								elements: s.elements || [],
								appState: viewerCamera,
								files: s.files || {},
							} as Record<string, unknown>
							const api = viewerApiRef.current as unknown as {
								updateScene?: (s: Record<string, unknown>) => void
							} | null
							if (api?.updateScene) {
								api.updateScene(initScene)
							} else {
								pendingViewerInitRef.current = initScene as unknown as {
									elements?: unknown[]
									appState?: Record<string, unknown>
									files?: Record<string, unknown>
								}
							}
						} catch (error) {
							logExternalUpdateWarning(
								'Failed to initialize viewer via API during scene applied',
								error
							)
						}
						// Mark this specific waId as loaded only if we got content
						pendingInitialLoadWaIdRef.current = null
					}
				}
			} catch (error) {
				logExternalUpdateWarning('Error handling scene applied event', error)
			}
		}
		window.addEventListener(
			'documents:external-update',
			onExternal as unknown as EventListener
		)
		window.addEventListener(
			'documents:sceneApplied',
			onApplied as unknown as EventListener
		)
		return () => {
			try {
				window.removeEventListener(
					'documents:external-update',
					onExternal as unknown as EventListener
				)
			} catch (error) {
				logExternalUpdateWarning(
					'Failed to remove external update event listener',
					error
				)
			}
			try {
				window.removeEventListener(
					'documents:sceneApplied',
					onApplied as unknown as EventListener
				)
			} catch (error) {
				logExternalUpdateWarning(
					'Failed to remove scene applied event listener',
					error
				)
			}
		}
	}, [
		waId,
		setScene,
		pendingInitialLoadWaIdRef,
		editorSigRef,
		viewerSigRef,
		viewerApiRef,
		pendingViewerInitRef,
		initializeCamera,
	])
}
