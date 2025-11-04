'use client'

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentCustomerRow, useDocumentScene } from '@/features/documents'
import type { IDataSource } from '@/shared/libs/data-grid'
import type { DataProvider } from '@/shared/libs/data-grid/components/core/services/DataProvider'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import {
	useCanvasSynchronization,
	useClearAction,
	useCustomerLoadedEvent,
	useCustomerRowPersistence,
	useCustomerSelection,
	useEnsureInitialized,
	useExternalDocumentUpdates,
	useFullscreenManagement,
	usePersistTrigger,
	useSceneInitialization,
	useUnlockValidation,
	useViewerApiReady,
} from './index'

// Delay to suppress persistence when switching customers (in milliseconds)
const IGNORE_PERSIST_DELAY_MS = 900

export type UseDocumentsSectionParams = {
	resolvedTheme: string | undefined
}

export type UseDocumentsSectionResult = {
	// State
	waId: string
	scene: {
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null
	viewerScene: {
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null
	isUnlocked: boolean
	isFullscreen: boolean
	customerColumns: unknown[]
	customerDataSource: IDataSource | null
	customerLoading: boolean
	validationErrors: unknown[]
	loading: boolean
	saveStatus:
		| { status: 'idle' }
		| { status: 'dirty' }
		| { status: 'saving' }
		| { status: 'saved'; at: number }
		| { status: 'error'; message?: string }
	// Refs
	fsContainerRef: React.RefObject<HTMLDivElement | null>
	viewerApiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>
	// Handlers
	handleClear: () => Promise<void>
	handleProviderReady: (provider: unknown) => Promise<void>
	handleViewerCanvasChange: (
		elements: unknown[],
		appState: Record<string, unknown>,
		files: Record<string, unknown>
	) => void
	handleCanvasChange: (
		elements: unknown[],
		appState: Record<string, unknown>,
		files: Record<string, unknown>
	) => void
	onApiReadyWithApply: (api: ExcalidrawImperativeAPI) => void
	onViewerApiReady: (api: ExcalidrawImperativeAPI) => void
	enterFullscreen: () => void
	exitFullscreen: () => void
}

/**
 * Main composition hook for DocumentsSection widget.
 * Orchestrates all document section logic by composing individual hooks.
 *
 * @param params - Hook parameters
 * @returns All state, refs, and handlers needed by the widget
 */
export function useDocumentsSection(
	params: UseDocumentsSectionParams
): UseDocumentsSectionResult {
	const { resolvedTheme } = params
	const searchParams = useSearchParams()

	// Document hooks
	const ensureInitialized = useEnsureInitialized()

	const [waId, setWaId] = useState<string>(DEFAULT_DOCUMENT_WA_ID)
	const [scene, setScene] = useState<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>(null)
	// Viewer scene state - only set during initial load, then rely on API updates
	const [viewerScene, setViewerScene] = useState<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>(null)
	const currentWaIdRef = useRef<string | null>(null)

	// Viewer canvas API
	const viewerApiRef = useRef<ExcalidrawImperativeAPI | null>(null)
	// Pending initial viewer scene if API not ready yet
	const pendingViewerInitRef = useRef<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>(null)

	const providerRef = useRef<DataProvider | null>(null)
	const fsContainerRef = useRef<HTMLDivElement | null>(null)
	const [isUnlocked, setIsUnlocked] = useState(false)

	// Track which waId we're expecting to load initially
	// After initial load for that waId, editor becomes write-only to prevent remounting during edits
	const pendingInitialLoadWaIdRef = useRef<string | null>(waId)

	// Signatures to avoid redundant scene re-applies that can cause flicker
	const editorSigRef = useRef<string | null>(null)
	const viewerSigRef = useRef<string | null>(null)

	// Debounce and guard controls for persistence to avoid duplicate PUTs on programmatic loads/switches
	const persistTimerRef = useRef<number | null>(null)
	const ignorePersistUntilRef = useRef<number>(0)

	// Track if component is mounted to prevent state updates on unmounted component
	const isMountedRef = useRef<boolean>(true)
	useEffect(
		() => () => {
			isMountedRef.current = false
		},
		[]
	)

	// Customer row (single-row grid): name | age | phone
	const {
		customerColumns,
		customerDataSource,
		customerLoading,
		validationErrors,
		onDataProviderReady: onDataProviderReadyFromHook,
	} = useDocumentCustomerRow(waId)

	// Saving and autosave controllers bound to current waId and lock state
	const {
		handleCanvasChange: originalHandleCanvasChange,
		onExcalidrawAPI,
		saveStatus,
		loading,
	} = useDocumentScene(waId, {
		enabled: true,
		isUnlocked,
	})

	// Keep latest scene in ref for API-ready application
	const sceneRef = useRef(scene)
	useEffect(() => {
		sceneRef.current = scene
	}, [scene])

	// Canvas synchronization hook (must be before useEffects that use initializeCamera)
	const { handleViewerCanvasChange, handleCanvasChange, initializeCamera } =
		useCanvasSynchronization({
			isUnlocked,
			originalHandleCanvasChange,
			sceneRef,
			viewerApiRef,
		})

	// Initialize waId - start with default (blank) on fresh page load
	// User can explicitly select a customer from calendar/phone picker
	useEffect(() => {
		pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID
		setWaId(DEFAULT_DOCUMENT_WA_ID)
	}, [])

	// Check for waId in URL parameters and load that customer's document
	useEffect(() => {
		const urlWaId = searchParams.get('waId')
		if (urlWaId && urlWaId !== DEFAULT_DOCUMENT_WA_ID) {
			// Guard: briefly suppress persist while switching customers
			ignorePersistUntilRef.current = Date.now() + IGNORE_PERSIST_DELAY_MS
			if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current)
				persistTimerRef.current = null
			}
			// Mark this waId as pending initial load
			pendingInitialLoadWaIdRef.current = urlWaId
			// Reset viewer camera tracking for new document
			initializeCamera({})
			// Initialize the customer's document with template on first selection
			ensureInitialized(urlWaId).catch(() => {
				// Silently ignore initialization errors (handled by UI state)
			})
			setWaId(urlWaId)
		}
	}, [searchParams, ensureInitialized, initializeCamera])

	// External document updates hook
	useExternalDocumentUpdates({
		waId,
		setScene,
		setViewerScene,
		pendingInitialLoadWaIdRef,
		editorSigRef,
		viewerSigRef,
		viewerApiRef,
		pendingViewerInitRef,
		initializeCamera,
		currentWaIdRef,
	})

	// Customer selection hook
	useCustomerSelection({
		ensureInitialized,
		setWaId,
		pendingInitialLoadWaIdRef,
		ignorePersistUntilRef,
		persistTimerRef,
		initializeCamera,
	})

	// Unlock validation hook
	const { recomputeUnlock } = useUnlockValidation({
		waId,
		customerDataSource: customerDataSource as IDataSource | null,
		customerColumns,
		isUnlocked,
		setIsUnlocked,
	})

	// Customer loaded event hook
	useCustomerLoadedEvent({
		waId,
		recomputeUnlock,
	})

	// Scene initialization hook
	const { onApiReadyWithApply } = useSceneInitialization({
		onExcalidrawAPI,
		sceneRef,
		resolvedTheme,
		isMountedRef,
	})

	// Viewer API ready hook
	const { onViewerApiReady } = useViewerApiReady({
		viewerApiRef,
		pendingViewerInitRef,
		isMountedRef,
	})

	// Customer row persistence hook
	const { persistRow } = useCustomerRowPersistence({
		waId,
		customerDataSource: customerDataSource as IDataSource | null,
		customerColumns,
	})

	// Wire provider events: fetch initial row (hook) and detect commits
	const handleProviderReady = useCallback(
		async (provider: unknown) => {
			try {
				providerRef.current = provider as DataProvider
				// Prefill row with name/age for current waId
				await onDataProviderReadyFromHook(provider)
				await recomputeUnlock()
				// Attach commit-like hook
				try {
					;(
						providerRef.current as unknown as {
							setOnCellDataLoaded?: (cb: (c: number, r: number) => void) => void
						}
					)?.setOnCellDataLoaded?.(((colIdx: number, rowIdx: number) => {
						try {
							const column = (
								providerRef.current as DataProvider
							).getColumnDefinition(colIdx)
							if (!column) {
								return
							}
							if (rowIdx !== 0) {
								return // single-row grid
							}
							// Update unlock state after any change (no persistence here; UI edits persist via doc:persist)
							// Guard: ignore provider-applied loads for a brief window after waId change
							if (
								(globalThis as unknown as { __docIgnoreProviderLoad?: number })
									.__docIgnoreProviderLoad
							) {
								return
							}
							recomputeUnlock().catch(() => {
								// Silently ignore unlock recomputation errors (handled by UI state)
							})
							// Removed: persistRow on provider data loaded to avoid duplicate PUTs
						} catch {
							// Silently ignore errors in provider load handler to prevent UI disruption
						}
					}) as unknown as (c: number, r: number) => void)
				} catch {
					// Silently ignore errors when setting up provider load handler
				}
			} catch {
				// Silently ignore errors in provider setup to prevent component crash
			}
		},
		[onDataProviderReadyFromHook, recomputeUnlock]
	)

	// Persist trigger hook
	usePersistTrigger({
		persistRow,
		ignorePersistUntilRef,
		persistTimerRef,
	})

	// Clear action hook
	const { handleClear } = useClearAction({
		customerDataSource: customerDataSource as IDataSource | null,
		customerColumns,
		providerRef,
		pendingInitialLoadWaIdRef,
		viewerApiRef,
		setWaId,
		setScene,
		setIsUnlocked,
		initializeCamera,
	})

	// Fullscreen management hook
	const { isFullscreen, enterFullscreen, exitFullscreen } =
		useFullscreenManagement({
			fsContainerRef,
		})

	return {
		// State
		waId,
		scene,
		viewerScene,
		isUnlocked,
		isFullscreen,
		customerColumns,
		customerDataSource: customerDataSource as IDataSource | null,
		customerLoading,
		validationErrors,
		loading,
		saveStatus,
		// Refs
		fsContainerRef,
		viewerApiRef,
		// Handlers
		handleClear,
		handleProviderReady,
		handleViewerCanvasChange,
		handleCanvasChange,
		onApiReadyWithApply,
		onViewerApiReady,
		enterFullscreen,
		exitFullscreen,
	}
}
