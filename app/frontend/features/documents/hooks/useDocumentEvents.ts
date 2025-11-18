import { useCallback, useEffect } from 'react'
import type { CameraState, SceneSignature } from '@/entities/document'
import { DocumentEventsAdapter } from '@/entities/document'

export type UseDocumentEventsOptions = {
	waId: string
	onExternalUpdate: (event: {
		signature: SceneSignature
		viewerCamera?: CameraState | undefined
		editorCamera?: CameraState | undefined
	}) => void
	onSceneApplied: () => void
}

/**
 * Hook for handling document-related browser events.
 * Manages external updates and scene applied events.
 *
 * @param options - Event handlers and configuration
 *
 * @example
 * ```typescript
 * useDocumentEvents({
 *   waId,
 *   onExternalUpdate: (event) => {
 *     // Handle external document update
 *   },
 *   onSceneApplied: () => {
 *     // Handle scene applied
 *   }
 * })
 * ```
 */
export const useDocumentEvents = (options: UseDocumentEventsOptions) => {
	const { waId, onExternalUpdate, onSceneApplied } = options

	// Wrap handlers in useCallback to prevent unnecessary re-renders
	const handleExternalUpdate = useCallback(
		(event: {
			signature: SceneSignature
			viewerCamera?: CameraState | undefined
			editorCamera?: CameraState | undefined
		}) => {
			onExternalUpdate(event)
		},
		[onExternalUpdate]
	)

	const handleSceneApplied = useCallback(() => {
		onSceneApplied()
	}, [onSceneApplied])

	// External update events
	useEffect(() => {
		if (!waId) {
			return () => {
				// No cleanup needed
			}
		}

		return DocumentEventsAdapter.onExternalUpdate(waId, (event) => {
			handleExternalUpdate({
				signature: event.signature,
				viewerCamera: event.viewerCamera,
				editorCamera: event.editorCamera,
			})
		})
	}, [waId, handleExternalUpdate])

	// Scene applied events
	useEffect(() => {
		if (!waId) {
			return () => {
				// No cleanup needed
			}
		}

		return DocumentEventsAdapter.onSceneApplied(waId, () => {
			handleSceneApplied()
		})
	}, [waId, handleSceneApplied])
}
