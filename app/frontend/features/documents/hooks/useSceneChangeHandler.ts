import { useCallback, useRef } from 'react'
import {
	CameraState,
	type SceneSignature,
	SceneSignature as SceneSignatureClass,
} from '@/entities/document'
import {
	AutosaveOrchestrationService,
	type AutosaveState,
} from '../services/autosave-orchestration.service'

export type SceneChangePayload = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown> | undefined
	editorAppState?: Record<string, unknown> | undefined
	sig?: string | undefined
}

export type UseSceneChangeHandlerOptions = {
	enabled: boolean
	waId: string
	isUnlocked: boolean
	initialSceneApplied: boolean
	ignoreChangesUntil: number
	autosaveStateRef: React.RefObject<AutosaveState>
	lastSavedSignatureRef: React.RefObject<SceneSignature | null>
	lastSavedViewerCameraRef: React.RefObject<CameraState | null>
	lastSavedEditorCameraRef: React.RefObject<CameraState | null>
	idleControllerRef: React.RefObject<{
		schedule: (payload: SceneChangePayload) => void
		cancel: () => void
	} | null>
	onStateChange: (status: 'dirty') => void
}

/**
 * Hook for handling canvas scene changes.
 * Detects changes, schedules autosave, and manages change state.
 *
 * @param options - Configuration and refs
 * @returns Canvas change handler
 *
 * @example
 * ```typescript
 * const { handleCanvasChange } = useSceneChangeHandler({
 *   enabled,
 *   waId,
 *   isUnlocked,
 *   initialSceneApplied,
 *   autosaveStateRef,
 *   lastSavedSignatureRef,
 *   onStateChange: (status) => setSaveState({ status })
 * })
 * ```
 */
export const useSceneChangeHandler = (
	options: UseSceneChangeHandlerOptions
) => {
	const {
		enabled,
		waId,
		isUnlocked,
		initialSceneApplied,
		ignoreChangesUntil,
		autosaveStateRef,
		lastSavedSignatureRef,
		lastSavedViewerCameraRef,
		lastSavedEditorCameraRef,
		idleControllerRef,
		onStateChange,
	} = options

	// Keep track of latest camera states
	const viewerAppStateRef = useRef<Record<string, unknown>>({})
	const editorAppStateRef = useRef<Record<string, unknown>>({})

	// ✅ PERFORMANCE: Track last schedule time for throttling camera-only schedules
	const lastCameraScheduleTimeRef = useRef<number>(0)

	// ✅ ULTRA PERFORMANCE: Track last signature computation to debounce expensive operations
	const lastSignatureComputeTimeRef = useRef<number>(0)
	const lastComputedSignatureRef = useRef<SceneSignature | null>(null)
	const lastElementCountRef = useRef<number>(0)

	// ✅ FRAME-LEVEL THROTTLE: Track pending camera timer to skip redundant processing
	const hasPendingCameraTimerRef = useRef<boolean>(false)

	// Performance constants
	const ZOOM_PRECISION = 1000
	const CAMERA_SCHEDULE_THROTTLE_MS = 100 // Throttle schedule calls to max 10/sec
	const SIGNATURE_COMPUTE_DEBOUNCE_MS = 200 // Only recompute signature every 200ms during typing

	const handleCanvasChange = useCallback(
		(payload: SceneChangePayload) => {
			const { elements, appState, files, viewerAppState, editorAppState, sig } =
				payload
			try {
				// Early exits for disabled states
				if (!(enabled && waId && isUnlocked)) {
					return
				}
				if (!initialSceneApplied) {
					return
				}
				if (Date.now() < ignoreChangesUntil) {
					return
				}

				// Update camera state refs
				if (viewerAppState) {
					viewerAppStateRef.current = viewerAppState as Record<string, unknown>
				}
				if (editorAppState) {
					editorAppStateRef.current = editorAppState as Record<string, unknown>
				}

				// ✅ ULTRA OPTIMIZATION: Skip ALL processing if we recently scheduled a camera-only save
				// Top canvas (view mode) fires fewer onChange events - smooth!
				// Bottom canvas (edit mode) fires onChange on EVERY interaction - we need aggressive throttling
				// If we have a pending camera timer AND scheduled recently, skip everything including detection
				const now = Date.now()
				const timeSinceLastCameraSchedule =
					now - lastCameraScheduleTimeRef.current

				if (
					hasPendingCameraTimerRef.current &&
					timeSinceLastCameraSchedule < CAMERA_SCHEDULE_THROTTLE_MS
				) {
					// Skip this entire frame - we scheduled a camera save < 100ms ago
					// The existing timer will fire after 3s of inactivity anyway
					// This eliminates redundant camera detection work
					return
				}

				// ✅ ULTRA PERFORMANCE: Use raw value comparison instead of creating objects
				// Creating CameraState objects and doing deep comparisons is expensive on every frame
				// For camera-only changes, we just need to know if values differ - we'll create proper
				// objects only when actually saving (in the schedule payload or during flush)
				let hasViewerCameraChanges = false
				let hasEditorCameraChanges = false
				let viewerCamera: CameraState | undefined
				let editorCamera: CameraState | undefined

				// Only detect camera changes if we're not currently saving
				if (!autosaveStateRef.current.isSaving) {
					// Fast path: raw value comparison without object creation
					if (viewerAppState !== undefined && viewerAppState !== null) {
						const viewerState = viewerAppState as Record<string, unknown>
						const viewerZoom =
							(viewerState.zoom as { value?: number } | undefined) ?? undefined
						const currentZoom =
							Math.round((viewerZoom?.value ?? 1) * ZOOM_PRECISION) /
							ZOOM_PRECISION
						const currentScrollX = Math.round(
							(viewerState.scrollX as number | undefined) ?? 0
						)
						const currentScrollY = Math.round(
							(viewerState.scrollY as number | undefined) ?? 0
						)

						const saved = lastSavedViewerCameraRef.current
						if (saved !== null && saved !== undefined) {
							const savedCamera = saved as CameraState
							hasViewerCameraChanges =
								savedCamera.zoom !== currentZoom ||
								savedCamera.scrollX !== currentScrollX ||
								savedCamera.scrollY !== currentScrollY
						} else {
							hasViewerCameraChanges =
								currentZoom !== 1 ||
								currentScrollX !== 0 ||
								currentScrollY !== 0
						}

						// Only create CameraState object if we'll need it for combined signature later
						// (when there are also content changes)
						if (hasViewerCameraChanges) {
							viewerCamera = new CameraState({
								zoom: currentZoom,
								scrollX: currentScrollX,
								scrollY: currentScrollY,
							})
						}
					}

					if (editorAppState !== undefined && editorAppState !== null) {
						const editorState = editorAppState as Record<string, unknown>
						const editorZoom =
							(editorState.zoom as { value?: number } | undefined) ?? undefined
						const currentZoom =
							Math.round((editorZoom?.value ?? 1) * ZOOM_PRECISION) /
							ZOOM_PRECISION
						const currentScrollX = Math.round(
							(editorState.scrollX as number | undefined) ?? 0
						)
						const currentScrollY = Math.round(
							(editorState.scrollY as number | undefined) ?? 0
						)

						const saved = lastSavedEditorCameraRef.current
						if (saved !== null && saved !== undefined) {
							const savedCamera = saved as CameraState
							hasEditorCameraChanges =
								savedCamera.zoom !== currentZoom ||
								savedCamera.scrollX !== currentScrollX ||
								savedCamera.scrollY !== currentScrollY
						} else {
							hasEditorCameraChanges =
								currentZoom !== 1 ||
								currentScrollX !== 0 ||
								currentScrollY !== 0
						}

						// Only create CameraState object if we'll need it for combined signature later
						if (hasEditorCameraChanges) {
							editorCamera = new CameraState({
								zoom: currentZoom,
								scrollX: currentScrollX,
								scrollY: currentScrollY,
							})
						}
					}
				}

				const hasCameraChanges =
					hasViewerCameraChanges || hasEditorCameraChanges

				// ✅ ULTRA PERFORMANCE: Defer expensive signature computation until actually needed
				// computeSceneSignature iterates through ALL elements (O(n)) - kills performance with many elements
				// Strategy: Assume any non-camera change is a content change (mark dirty immediately)
				// Only compute expensive signature when we actually need it for save scheduling
				let contentSignature: SceneSignature | null = null
				let hasContentChanges = false

				if (!hasCameraChanges) {
					// Potential content change
					// ✅ OPTIMIZATION: Quick element count check first (O(1) vs O(n))
					const currentElementCount = elements.length
					const elementCountChanged =
						currentElementCount !== lastElementCountRef.current

					if (elementCountChanged) {
						// Definite content change - element added/removed
						hasContentChanges = true
						lastElementCountRef.current = currentElementCount
						// Don't compute signature yet - defer until we need it for scheduling
					} else {
						// Element count same - might still have content changes (editing existing elements)
						// Mark as potentially changed - we'll compute signature lazily if needed
						hasContentChanges = true
					}
				} else if (autosaveStateRef.current.isSaving) {
					// Special case: if saving with camera changes, we need content signature for tracking
					const computedSignature = SceneSignatureClass.compute(
						elements,
						appState,
						files
					)
					contentSignature = computedSignature
					const lastSaved = lastSavedSignatureRef.current
					if (computedSignature && lastSaved) {
						hasContentChanges = !computedSignature.equalsSignature(lastSaved)
					} else {
						hasContentChanges = true
					}
				}

				const hasAnyChanges = hasContentChanges || hasCameraChanges

				// Early exit if no changes at all
				if (!hasAnyChanges) {
					return
				}

				// ✅ PERFORMANCE: Only update UI state once per user action, not on every frame
				// For camera-only changes, we update once and subsequent frames are ignored
				// This prevents excessive React re-renders during camera movement
				if (
					autosaveStateRef.current.lastActivityTimestamp === 0 &&
					!autosaveStateRef.current.isSaving
				) {
					onStateChange('dirty')
				}

				// Record activity for continuous activity tracking (cheap timestamp update)
				if (autosaveStateRef.current.isSaving && contentSignature !== null) {
					AutosaveOrchestrationService.recordLocalEdit(
						autosaveStateRef.current,
						contentSignature as SceneSignature
					)
				} else {
					AutosaveOrchestrationService.recordActivity(autosaveStateRef.current)
				}

				// ✅ PERFORMANCE: Check if we should schedule without computing signatures yet
				// For camera changes, we always schedule (cheap operation - just timer reset)
				// For content changes, we check based on activity
				// For camera-only changes, signature won't be checked (shouldScheduleSave returns true immediately)
				// So we can safely use lastSavedSignatureRef as fallback - it's never evaluated
				const lastSaved = lastSavedSignatureRef.current
				const signatureForCheck =
					contentSignature ?? lastSaved ?? SceneSignatureClass.fromString('')
				const shouldSchedule = AutosaveOrchestrationService.shouldScheduleSave({
					state: autosaveStateRef.current,
					newSignature: signatureForCheck,
					combinedSignature: null,
					hasContentChanges,
					hasCameraChanges,
					idleTimeoutMs: 3000,
				})

				const idleController = idleControllerRef.current
				if (shouldSchedule && idleController !== null) {
					// ✅ ULTRA PERFORMANCE: For camera-only changes, throttle schedule calls
					// During continuous camera movement, we're getting 60+ calls per second
					// Calling schedule() cancels and recreates the timer each time (expensive!)
					// We only need to schedule occasionally - throttle to every 100ms max
					if (hasCameraChanges && !hasContentChanges) {
						const scheduleTime = Date.now()
						const timeSinceSchedule =
							scheduleTime - lastCameraScheduleTimeRef.current

						// Skip if we scheduled a camera-only change less than throttle threshold
						// The existing timer will handle the save after 3s of inactivity
						if (timeSinceSchedule < CAMERA_SCHEDULE_THROTTLE_MS) {
							return
						}

						lastCameraScheduleTimeRef.current = scheduleTime
						hasPendingCameraTimerRef.current = true

						// Camera-only change: schedule without computing signature (saves ~95% of computations)
						if (idleController === null || idleController === undefined) {
							return
						}
						const controller = idleController as {
							schedule: (payload: SceneChangePayload) => void
							cancel: () => void
						}
						controller.schedule({
							elements,
							appState,
							files,
							viewerAppState: viewerAppStateRef.current,
							editorAppState: editorAppStateRef.current,
							// Don't pass sig - let flush compute it only when actually saving
						})
					} else {
						// Content change (with or without camera)
						hasPendingCameraTimerRef.current = false // Clear camera timer flag for content changes

						// ✅ LAZY COMPUTATION: Only compute signature NOW when actually scheduling
						// This defers the expensive O(n) iteration until we really need it

						// Compute content signature if we don't have it yet
						if (!contentSignature) {
							const computeTime = Date.now()
							const timeSinceLastCompute =
								computeTime - lastSignatureComputeTimeRef.current

							// Check if we can reuse cached signature (debounced)
							if (
								timeSinceLastCompute < SIGNATURE_COMPUTE_DEBOUNCE_MS &&
								lastComputedSignatureRef.current &&
								elements.length === lastElementCountRef.current
							) {
								contentSignature = lastComputedSignatureRef.current
							} else {
								contentSignature = SceneSignatureClass.compute(
									elements,
									appState,
									files
								)
								lastComputedSignatureRef.current = contentSignature
								lastSignatureComputeTimeRef.current = computeTime
								lastElementCountRef.current = elements.length
							}
						}

						// ✅ OPTIMIZATION: Only compute combined signature if we have camera objects
						// Otherwise use content signature only (avoid unnecessary camera signature computation)
						let combinedSignature: SceneSignature
						if (viewerCamera !== undefined || editorCamera !== undefined) {
							const cameraOptions: {
								elements: unknown[]
								appState: Record<string, unknown>
								files: Record<string, unknown>
								viewerCamera?: CameraState
								editorCamera?: CameraState
							} = {
								elements,
								appState,
								files,
							}
							if (viewerCamera !== undefined) {
								cameraOptions.viewerCamera = viewerCamera as CameraState
							}
							if (editorCamera !== undefined) {
								cameraOptions.editorCamera = editorCamera as CameraState
							}
							combinedSignature =
								SceneSignatureClass.computeWithCamera(cameraOptions)
						} else {
							if (contentSignature === null) {
								return
							}
							combinedSignature = contentSignature as SceneSignature
						}

						if (idleController === null || idleController === undefined) {
							return
						}
						const controller = idleController as {
							schedule: (payload: SceneChangePayload) => void
							cancel: () => void
						}
						controller.schedule({
							elements,
							appState,
							files,
							viewerAppState: viewerAppStateRef.current,
							editorAppState: editorAppStateRef.current,
							sig: sig || combinedSignature.toString(),
						})
					}
				} else if (
					hasContentChanges &&
					!shouldSchedule &&
					idleController !== null &&
					idleController !== undefined
				) {
					// ✅ FIX: Cancel pending idle save for content changes during continuous activity
					// The interval controller (15s) will handle saves during continuous editing
					// Note: We don't cancel for camera changes because shouldSchedule is always true for them
					hasPendingCameraTimerRef.current = false
					const controller = idleController as {
						schedule: (payload: SceneChangePayload) => void
						cancel: () => void
					}
					controller.cancel()
				}
			} catch {
				// Silently ignore errors
			}
		},
		[
			enabled,
			waId,
			isUnlocked,
			initialSceneApplied,
			ignoreChangesUntil,
			autosaveStateRef,
			lastSavedSignatureRef,
			lastSavedViewerCameraRef,
			lastSavedEditorCameraRef,
			idleControllerRef,
			onStateChange,
		]
	)

	return {
		handleCanvasChange,
		viewerAppStateRef,
		editorAppStateRef,
	} as const
}
