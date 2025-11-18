'use client'

import { useEffect } from 'react'
import {
	DEFAULT_DOCUMENT_WA_ID,
	TEMPLATE_USER_WA_ID,
	toSceneFromDoc,
} from '@/shared/libs/documents'
import { computeSceneSignature } from '@/shared/libs/documents/scene-utils'
import { logger } from '@/shared/libs/logger'
import type {
	DocumentSceneLoader,
	DocumentSceneSnapshot,
} from '../lib/scene-loader'
import type { ViewerSyncAdapter } from '../lib/viewer-sync'

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
	setViewerScene?: (
		scene: {
			elements?: unknown[]
			appState?: Record<string, unknown>
			files?: Record<string, unknown>
		} | null
	) => void
	pendingInitialLoadWaIdRef: React.MutableRefObject<string | null>
	editorSigRef: React.MutableRefObject<string | null>
	viewerSigRef: React.MutableRefObject<string | null>
	initializeCamera: (viewerCamera: Record<string, unknown>) => void
	currentWaIdRef?: React.MutableRefObject<string | null>
	onSceneLoaded?: () => void
	sceneLoader?: DocumentSceneLoader
	viewerSyncAdapter?: ViewerSyncAdapter
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
		setViewerScene,
		pendingInitialLoadWaIdRef,
		editorSigRef,
		viewerSigRef,
		initializeCamera,
		currentWaIdRef,
		onSceneLoaded,
		sceneLoader,
		viewerSyncAdapter,
	} = params

	useEffect(() => {
		const buildSnapshotFromDoc = (
			doc: Record<string, unknown> | null | undefined
		): DocumentSceneSnapshot => {
			if (sceneLoader) {
				return sceneLoader.resolveScene(waId, doc || null)
			}
			const raw = toSceneFromDoc(doc || null)
			const signature = computeSceneSignature(
				(raw.elements as unknown[]) || [],
				(raw.appState as Record<string, unknown>) || {},
				(raw.files as Record<string, unknown>) || {}
			)
			return {
				...raw,
				signature,
			} as DocumentSceneSnapshot
		}

		const augmentSceneWithSignature = (
			scene: {
				elements?: unknown[]
				appState?: Record<string, unknown>
				files?: Record<string, unknown>
				viewerAppState?: Record<string, unknown>
			} | null
		): DocumentSceneSnapshot | null => {
			if (!scene) {
				return null
			}
			const signature = computeSceneSignature(
				(scene.elements as unknown[]) || [],
				(scene.appState as Record<string, unknown>) || {},
				(scene.files as Record<string, unknown>) || {}
			)
			return {
				...scene,
				signature,
			} as DocumentSceneSnapshot
		}

		const onExternal = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string
					document?: Record<string, unknown> | null
				}
				if (String(detail?.wa_id || '') !== String(waId)) {
					return
				}

				const s = buildSnapshotFromDoc(detail?.document || null)
				const sig = s.signature

				// Only update editor during initial load for this specific waId
				const isPendingInitialLoad = pendingInitialLoadWaIdRef.current === waId
				const hasElements = Array.isArray(s.elements) && s.elements.length > 0

				// Only update viewer when switching documents (waId changed), not on every data update
				const isDocumentSwitch =
					currentWaIdRef && currentWaIdRef.current !== waId
				if (currentWaIdRef) {
					currentWaIdRef.current = waId
				}

				// Only update viewer scene state prop on initial load or document switch
				// Use API updates for all other cases to avoid re-renders
				const shouldUpdateViewerSceneProp =
					isPendingInitialLoad || isDocumentSwitch

				// Always initialize viewer when we receive data, not just during initial load
				// This ensures viewer gets data even if editor is already loaded
				// Template documents are allowed to be empty
				const shouldUpdateViewer =
					isPendingInitialLoad ||
					(sig &&
						sig !== viewerSigRef.current &&
						(hasElements ||
							waId === DEFAULT_DOCUMENT_WA_ID ||
							waId === TEMPLATE_USER_WA_ID))

				// Only mark as loaded if we received actual content, not an empty document
				// Template documents are allowed to be empty
				if (
					isPendingInitialLoad &&
					sig &&
					sig !== editorSigRef.current &&
					(hasElements ||
						waId === DEFAULT_DOCUMENT_WA_ID ||
						waId === TEMPLATE_USER_WA_ID)
				) {
					editorSigRef.current = sig
					setScene(s)
					viewerSigRef.current = sig
					// Load viewer's saved camera or use empty state
					const viewerCamera = s.viewerAppState || {}
					initializeCamera(viewerCamera)

					// Update viewer scene state ONLY during initial load or document switch
					// After initial load, rely on API updates to avoid re-renders
					const viewerSceneData = {
						elements: s.elements || [],
						appState: viewerCamera,
						files: s.files || {},
					}
					if (shouldUpdateViewerSceneProp) {
						setViewerScene?.(viewerSceneData)
					}

					// Initialize viewer via API (preserve its independent camera afterwards)
					viewerSyncAdapter?.applyScene(
						viewerSceneData,
						'external-update.initial'
					)
					// Mark this specific waId as loaded only if we got content
					pendingInitialLoadWaIdRef.current = null
					onSceneLoaded?.()
				} else if (shouldUpdateViewer && sig && sig !== viewerSigRef.current) {
					// Update viewer when switching documents (waId changed)
					// Use API updates for viewer, only update scene prop if document switch
					viewerSigRef.current = sig
					const viewerCamera = s.viewerAppState || {}
					initializeCamera(viewerCamera)

					const viewerSceneData = {
						elements: s.elements || [],
						appState: viewerCamera,
						files: s.files || {},
					}
					// Only update viewer scene state prop on document switch, not on every data update
					if (shouldUpdateViewerSceneProp) {
						setViewerScene?.(viewerSceneData)
					}

					// Initialize viewer via API
					viewerSyncAdapter?.applyScene(viewerSceneData, 'external-update')
					onSceneLoaded?.()
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
				const scene = augmentSceneWithSignature(
					(detail?.scene || null) as {
						elements?: unknown[]
						appState?: Record<string, unknown>
						files?: Record<string, unknown>
						viewerAppState?: Record<string, unknown>
					} | null
				)
				if (scene) {
					const sig = scene.signature

					// Only update editor during initial load for this specific waId
					const isPendingInitialLoad =
						pendingInitialLoadWaIdRef.current === waId
					const hasElements =
						Array.isArray(scene.elements) && scene.elements.length > 0

					// Only update viewer when switching documents (waId changed), not on every data update
					const isDocumentSwitch =
						currentWaIdRef && currentWaIdRef.current !== waId
					if (currentWaIdRef) {
						currentWaIdRef.current = waId
					}

					// Only update viewer scene state prop on initial load or document switch
					const shouldUpdateViewerSceneProp =
						isPendingInitialLoad || isDocumentSwitch

					// Always initialize viewer when we receive data, not just during initial load
					// This ensures viewer gets data even if editor is already loaded
					const shouldUpdateViewer =
						isPendingInitialLoad ||
						(sig &&
							sig !== viewerSigRef.current &&
							(hasElements || waId === DEFAULT_DOCUMENT_WA_ID))

					// Only mark as loaded if we received actual content, not an empty document
					if (
						isPendingInitialLoad &&
						sig &&
						sig !== editorSigRef.current &&
						(hasElements || waId === DEFAULT_DOCUMENT_WA_ID)
					) {
						editorSigRef.current = sig
						setScene(scene)
						viewerSigRef.current = sig
						// Load viewer's saved camera or use empty state
						const viewerCamera = scene.viewerAppState || {}
						initializeCamera(viewerCamera)

						// Update viewer scene state
						const viewerSceneData = {
							elements: scene.elements || [],
							appState: viewerCamera,
							files: scene.files || {},
						}
						setViewerScene?.(viewerSceneData)

						// Initialize viewer via API (preserve its independent camera afterwards)
						viewerSyncAdapter?.applyScene(
							viewerSceneData,
							'scene-applied.initial'
						)
						// Mark this specific waId as loaded only if we got content
						pendingInitialLoadWaIdRef.current = null
						onSceneLoaded?.()
					} else if (
						shouldUpdateViewer &&
						sig &&
						sig !== viewerSigRef.current
					) {
						// Update viewer when switching documents - use API only to avoid flicker
						viewerSigRef.current = sig
						const viewerCamera = scene.viewerAppState || {}
						initializeCamera(viewerCamera)

						// Update viewer scene state only on document switch
						const viewerSceneData = {
							elements: scene.elements || [],
							appState: viewerCamera,
							files: scene.files || {},
						}
						if (shouldUpdateViewerSceneProp) {
							setViewerScene?.(viewerSceneData)
						}

						// Initialize viewer via API
						viewerSyncAdapter?.applyScene(viewerSceneData, 'scene-applied')
						onSceneLoaded?.()
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
		setViewerScene,
		pendingInitialLoadWaIdRef,
		editorSigRef,
		viewerSigRef,
		initializeCamera,
		currentWaIdRef,
		sceneLoader,
		viewerSyncAdapter,
		onSceneLoaded,
	])
}
