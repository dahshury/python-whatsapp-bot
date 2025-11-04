'use client'

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useCallback, useRef } from 'react'
import { logger } from '@/shared/libs/logger'
import { CanvasSyncService } from '../services/canvas-sync.service'

const logCanvasSyncWarning = (context: string, error: unknown) => {
	logger.warn(`[useCanvasSynchronization] ${context}`, error)
}

export type SceneChangePayload = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown>
	editorAppState?: Record<string, unknown>
}

export type UseCanvasSynchronizationParams = {
	isUnlocked: boolean
	originalHandleCanvasChange: (payload: SceneChangePayload) => void
	sceneRef: React.MutableRefObject<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>
	viewerApiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>
}

/**
 * Hook for synchronizing canvas changes between editor and viewer.
 * Handles viewer camera tracking and editor-to-viewer mirroring with rAF coalescing.
 *
 * @param params - Hook parameters
 * @returns Canvas change handlers
 */
export function useCanvasSynchronization(
	params: UseCanvasSynchronizationParams
): {
	handleViewerCanvasChange: (
		_elements: unknown[],
		appState: Record<string, unknown>,
		_files: Record<string, unknown>
	) => void
	handleCanvasChange: (
		elements: unknown[],
		appState: Record<string, unknown>,
		files: Record<string, unknown>
	) => void
	viewerCameraRef: React.MutableRefObject<Record<string, unknown>>
	lastViewerCameraSigRef: React.MutableRefObject<string>
	initializeCamera: (viewerCamera: Record<string, unknown>) => void
} {
	const { isUnlocked, originalHandleCanvasChange, sceneRef, viewerApiRef } =
		params

	// Ref to track viewer's current camera state for saving
	const viewerCameraRef = useRef<Record<string, unknown>>({})
	// Ref to track last viewer camera signature to avoid redundant saves
	const lastViewerCameraSigRef = useRef<string>('')

	// Viewer canvas API and coalesced update state (imperative mirroring)
	const viewerRafRef = useRef<number | null>(null)
	const pendingViewerRef = useRef<{
		elements?: unknown[]
		files?: Record<string, unknown> | null
	} | null>(null)

	// Callback for viewer canvas changes (to track viewer camera)
	const handleViewerCanvasChange = useCallback(
		(
			_elements: unknown[],
			appState: Record<string, unknown>,
			_files: Record<string, unknown>
		) => {
			// Compute stable signature for viewer camera (only zoom/scroll values)
			const { signature: newSig } =
				CanvasSyncService.computeCameraSignature(appState)

			// Only trigger autosave if camera signature actually changed
			if (
				!CanvasSyncService.hasCameraChanged(
					newSig,
					lastViewerCameraSigRef.current
				)
			) {
				return // No change, skip
			}

			// Update refs
			viewerCameraRef.current = appState
			lastViewerCameraSigRef.current = newSig

			// Trigger autosave with current editor state + new viewer camera
			// This ensures viewer camera changes are persisted per-user
			try {
				const currentScene = sceneRef.current
				if (currentScene?.elements && isUnlocked) {
					// Extract editor's camera from current scene
					const editorCamera = CanvasSyncService.extractEditorCamera(
						currentScene.appState
					)

					// Pass current editor state with updated viewer camera to trigger autosave
					originalHandleCanvasChange({
						elements: currentScene.elements as unknown[],
						appState: currentScene.appState || {},
						files: currentScene.files || {},
						viewerAppState: viewerCameraRef.current,
						...(editorCamera !== undefined && { editorAppState: editorCamera }),
					})
				}
			} catch (error) {
				logCanvasSyncWarning(
					'Failed to propagate viewer camera updates to autosave handler',
					error
				)
			}
		},
		[originalHandleCanvasChange, isUnlocked, sceneRef]
	)

	// Wrap handleCanvasChange to mirror editor → viewer imperatively (rAF-coalesced)
	// Only mirror elements and files, not viewport/panning (appState)
	// DO NOT update viewerScene state prop - only use API updates to avoid re-renders
	const handleCanvasChange = useCallback(
		(
			elements: unknown[],
			appState: Record<string, unknown>,
			files: Record<string, unknown>
		) => {
			try {
				// Coalesce viewer updates to next animation frame
				pendingViewerRef.current = { elements, files }
				if (viewerRafRef.current == null) {
					viewerRafRef.current = requestAnimationFrame(() => {
						viewerRafRef.current = null
						const pending = pendingViewerRef.current
						pendingViewerRef.current = null
						const api = viewerApiRef.current as unknown as {
							updateScene?: (s: Record<string, unknown>) => void
						} | null
						if (api?.updateScene && pending?.elements) {
							// Do not override viewer camera; update elements/files only
							// Do NOT update viewerScene state - only use API to avoid re-renders
							api.updateScene({
								elements: pending.elements as unknown[],
								files: (pending.files || {}) as Record<string, unknown>,
							})
						}
					})
				}
			} catch (error) {
				logCanvasSyncWarning('Failed to coalesce viewer scene update', error)
			}

			// Extract editor's camera state for explicit tracking
			const editorCamera = CanvasSyncService.extractEditorCamera(appState)

			// Call original handler for autosave logic with both cameras
			// Pass viewerCameraRef.current as the viewer's independent camera
			// Pass editorCamera as the editor's camera for explicit persistence
			originalHandleCanvasChange({
				elements,
				appState,
				files,
				viewerAppState: viewerCameraRef.current,
				...(editorCamera !== undefined && { editorAppState: editorCamera }),
			})
		},
		[originalHandleCanvasChange, viewerApiRef]
	)

	const initializeCamera = useCallback(
		(viewerCamera: Record<string, unknown>) => {
			viewerCameraRef.current = viewerCamera
			const { signature } =
				CanvasSyncService.computeCameraSignature(viewerCamera)
			lastViewerCameraSigRef.current = signature
		},
		[]
	)

	return {
		handleViewerCanvasChange,
		handleCanvasChange,
		viewerCameraRef,
		lastViewerCameraSigRef,
		initializeCamera,
	}
}
