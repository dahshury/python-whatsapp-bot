'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
	type CameraState,
	DocumentEventsAdapter,
	type SceneSignature,
} from '@/entities/document'
import {
	AutosaveOrchestrationService,
	type AutosaveState,
} from '../services/autosave-orchestration.service'
import { useAutosaveControllers } from './useAutosaveControllers'
import { useDocumentEvents } from './useDocumentEvents'
import { useDocumentLoad } from './useDocumentLoad'
import { useExcalidrawAPI } from './useExcalidrawAPI'
import {
	type SceneChangePayload,
	useSceneChangeHandler,
} from './useSceneChangeHandler'

const EXTERNAL_UPDATE_IGNORE_CHANGES_DURATION_MS = 800
const SCENE_APPLIED_IGNORE_CHANGES_DURATION_MS = 400

type SaveStatus =
	| { status: 'idle' }
	| { status: 'dirty' }
	| { status: 'saving' }
	| { status: 'saved'; at: number }
	| { status: 'error'; message?: string }

type UseDocumentSceneOptions = {
	enabled?: boolean
	isUnlocked?: boolean
	autoLoadOnMount?: boolean
}

/**
 * Main hook for managing Excalidraw document scenes.
 * Orchestrates loading, autosave, change detection, and event handling.
 *
 * This hook is now a thin orchestrator that delegates to focused sub-hooks,
 * each handling a specific concern.
 *
 * @param waId - WhatsApp ID of the document
 * @param options - Configuration options
 * @returns Document scene utilities and state
 *
 * @example
 * ```typescript
 * const { loading, handleCanvasChange, onExcalidrawAPI, saveStatus } =
 *   useDocumentScene(waId, {
 *     enabled: true,
 *     isUnlocked: true,
 *     autoLoadOnMount: true
 *   })
 * ```
 */
export default function useDocumentScene(
	waId: string,
	options?: UseDocumentSceneOptions
) {
	const {
		enabled = true,
		isUnlocked = true,
		autoLoadOnMount = true,
	} = options || {}

	// State management
	const [saveState, setSaveState] = useState<SaveStatus>({ status: 'idle' })

	// Refs for tracking scene state
	const initialSceneAppliedRef = useRef<boolean>(false)
	const ignoreChangesUntilRef = useRef<number>(0)
	const autosaveStateRef = useRef<AutosaveState>(
		AutosaveOrchestrationService.createState()
	)
	const lastSavedSignatureRef = useRef<SceneSignature | null>(null)
	const lastSavedViewerCameraRef = useRef<CameraState | null>(null)
	const lastSavedEditorCameraRef = useRef<CameraState | null>(null)

	// Excalidraw API management
	const { apiRef, onExcalidrawAPI } = useExcalidrawAPI()

	// Document loading
	const { loading, setLoading, lastLoadedWaIdRef, startTransition } =
		useDocumentLoad(waId, {
			enabled,
			autoLoadOnMount,
		})

	// Autosave callbacks
	const autosaveCallbacks = useMemo(
		() => ({
			onSaving: () => {
				setSaveState({ status: 'saving' })
			},
			onSaved: (_signature: SceneSignature) => {
				// Check if there are pending changes after save completes
				// The markSavingComplete method already updated hasLocalEditsDuringSave
				if (autosaveStateRef.current.hasLocalEditsDuringSave) {
					setSaveState({ status: 'dirty' })
				} else {
					setSaveState({ status: 'saved', at: Date.now() })
				}
			},
			onError: (message?: string) => {
				if (message !== undefined) {
					setSaveState({ status: 'error', message })
				} else {
					setSaveState({ status: 'error' })
				}
			},
		}),
		[]
	)

	// Autosave controllers management
	const { idleControllerRef } = useAutosaveControllers({
		waId,
		enabled,
		isUnlocked,
		initialSceneApplied: initialSceneAppliedRef.current,
		apiRef,
		autosaveStateRef,
		lastSavedSignatureRef,
		lastSavedViewerCameraRef,
		lastSavedEditorCameraRef,
		ignoreChangesUntilRef,
		callbacks: autosaveCallbacks,
	})

	// Scene change handler
	const { handleCanvasChange, viewerAppStateRef, editorAppStateRef } =
		useSceneChangeHandler({
			enabled,
			waId,
			isUnlocked,
			initialSceneApplied: initialSceneAppliedRef.current,
			ignoreChangesUntil: ignoreChangesUntilRef.current,
			autosaveStateRef,
			lastSavedSignatureRef,
			lastSavedViewerCameraRef,
			lastSavedEditorCameraRef,
			idleControllerRef: idleControllerRef as React.RefObject<{
				schedule: (payload: SceneChangePayload) => void
			} | null>,
			onStateChange: (status) => {
				setSaveState({ status })
			},
		})

	// External update event handler
	const handleExternalUpdate = useCallback(
		(event: {
			signature: SceneSignature
			viewerCamera?: CameraState | undefined
			editorCamera?: CameraState | undefined
		}) => {
			try {
				lastLoadedWaIdRef.current = waId
				lastSavedSignatureRef.current = event.signature

				// Update camera states
				if (event.viewerCamera) {
					lastSavedViewerCameraRef.current = event.viewerCamera
					viewerAppStateRef.current = {
						zoom: { value: event.viewerCamera.zoom },
						scrollX: event.viewerCamera.scrollX,
						scrollY: event.viewerCamera.scrollY,
					}
				} else {
					lastSavedViewerCameraRef.current = null
				}

				if (event.editorCamera) {
					lastSavedEditorCameraRef.current = event.editorCamera
					editorAppStateRef.current = {
						zoom: { value: event.editorCamera.zoom },
						scrollX: event.editorCamera.scrollX,
						scrollY: event.editorCamera.scrollY,
					}
				} else {
					lastSavedEditorCameraRef.current = null
				}

				// Reset autosave state
				autosaveStateRef.current.isSaving = false
				autosaveStateRef.current.hasLocalEditsDuringSave = false
				autosaveStateRef.current.lastScheduledSignature = null
				AutosaveOrchestrationService.setGlobalSavingFlag(false)
				AutosaveOrchestrationService.setGlobalLocalEditsFlag(false)

				// Update UI state
				setSaveState({ status: 'saved', at: Date.now() })
				startTransition(() => setLoading(false))
				ignoreChangesUntilRef.current =
					Date.now() + EXTERNAL_UPDATE_IGNORE_CHANGES_DURATION_MS
				initialSceneAppliedRef.current = true

				// Dispatch scene applied event
				try {
					DocumentEventsAdapter.dispatchSceneApplied(waId, {})
				} catch {
					// Silently ignore errors
				}
			} catch {
				// Silently ignore errors
			}
		},
		[
			waId,
			lastLoadedWaIdRef,
			viewerAppStateRef,
			editorAppStateRef,
			setLoading,
			startTransition,
		]
	)

	// Scene applied event handler
	const handleSceneApplied = useCallback(() => {
		try {
			initialSceneAppliedRef.current = true
			ignoreChangesUntilRef.current =
				Date.now() + SCENE_APPLIED_IGNORE_CHANGES_DURATION_MS
		} catch {
			// Silently ignore errors
		}
	}, [])

	// Document events (external updates, scene applied)
	useDocumentEvents({
		waId,
		onExternalUpdate: handleExternalUpdate,
		onSceneApplied: handleSceneApplied,
	})

	// Memoize save status
	const saveStatus = useMemo(() => saveState, [saveState])

	return { loading, handleCanvasChange, onExcalidrawAPI, saveStatus } as const
}
