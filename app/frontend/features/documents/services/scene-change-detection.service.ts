import { CameraState, SceneSignature } from '@/entities/document'

/**
 * Result of scene change detection analysis.
 * Contains flags for different types of changes and the computed signature.
 */
export type SceneChangeResult = {
	hasContentChanges: boolean
	hasViewerCameraChanges: boolean
	hasEditorCameraChanges: boolean
	hasAnyChanges: boolean
	signature: SceneSignature
	viewerCamera?: CameraState | undefined
	editorCamera?: CameraState | undefined
}

/**
 * Options for scene change detection.
 */
export type SceneChangeDetectionOptions = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	lastSavedSignature: SceneSignature | null
	lastSavedViewerCamera: CameraState | null
	lastSavedEditorCamera: CameraState | null
	viewerAppState?: Record<string, unknown> | undefined
	editorAppState?: Record<string, unknown> | undefined
}

/**
 * Service for detecting changes in document scenes.
 * Compares current scene state with last saved state to determine what changed.
 *
 * @example
 * ```typescript
 * const result = SceneChangeDetectionService.detectChanges({
 *   elements,
 *   appState,
 *   files,
 *   lastSavedSignature,
 *   lastSavedViewerCamera,
 *   lastSavedEditorCamera
 * })
 * if (result.hasAnyChanges) {
 *   // Trigger save
 * }
 * ```
 */
export const SceneChangeDetectionService = {
	/**
	 * Detects all types of changes in a scene.
	 * Compares content signature and camera positions against last saved state.
	 *
	 * @param options - Detection options
	 * @returns Detailed change detection result
	 */
	detectChanges(options: SceneChangeDetectionOptions): SceneChangeResult {
		const {
			elements,
			appState,
			files,
			lastSavedSignature,
			lastSavedViewerCamera,
			lastSavedEditorCamera,
			viewerAppState,
			editorAppState,
		} = options
		// Compute current content signature
		const signature = SceneSignature.compute(elements, appState, files)
		const hasContentChanges = !signature.equalsSignature(lastSavedSignature)

		// Detect viewer camera changes
		let viewerCamera: CameraState | undefined
		let hasViewerCameraChanges = false
		if (viewerAppState) {
			viewerCamera = CameraState.fromViewerState(viewerAppState)
			const savedCamera = lastSavedViewerCamera || CameraState.createDefault()
			hasViewerCameraChanges = !viewerCamera.equalsCamera(savedCamera)
		}

		// Detect editor camera changes
		let editorCamera: CameraState | undefined
		let hasEditorCameraChanges = false
		if (editorAppState) {
			editorCamera = CameraState.fromViewerState(editorAppState)
			const savedCamera = lastSavedEditorCamera || CameraState.createDefault()
			hasEditorCameraChanges = !editorCamera.equalsCamera(savedCamera)
		}

		// Aggregate change detection
		const hasAnyChanges =
			hasContentChanges || hasViewerCameraChanges || hasEditorCameraChanges

		return {
			hasContentChanges,
			hasViewerCameraChanges,
			hasEditorCameraChanges,
			hasAnyChanges,
			signature,
			viewerCamera,
			editorCamera,
		}
	},
}
