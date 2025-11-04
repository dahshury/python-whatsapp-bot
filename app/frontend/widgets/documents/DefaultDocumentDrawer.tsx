'use client'

import type { ExcalidrawProps } from '@excalidraw/excalidraw/types'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { FileEdit } from 'lucide-react'
import { useTheme } from 'next-themes'
import React from 'react'
import { useDocumentScene, useGetByWaId } from '@/features/documents'
import { TEMPLATE_USER_WA_ID, toSceneFromDoc } from '@/shared/libs/documents'
import { computeSceneSignature } from '@/shared/libs/documents/scene-utils'
import { logger } from '@/shared/libs/logger'
import { useLanguage } from '@/shared/libs/state/language-context'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/shared/ui/sheet'
import { DocumentCanvas } from '@/widgets/document-canvas/DocumentCanvas'
import { DocumentSavingIndicator } from './DocumentSavingIndicator'

type DefaultDocumentDrawerProps = {
	className?: string
	trigger?: React.ReactNode
	title?: string
}

const CAMERA_PRECISION_FACTOR = 1000

const logDrawerError = (context: string, error: unknown) => {
	logger.warn(`[DefaultDocumentDrawer] ${context}`, error)
}

/**
 * DefaultDocumentDrawer allows editing the template document that will be
 * copied to all new users when they first open their document.
 */
export function DefaultDocumentDrawer({
	className,
	trigger,
	title = 'Default Document Template',
}: DefaultDocumentDrawerProps) {
	const [open, setOpen] = React.useState(false)
	const [mounted, setMounted] = React.useState(false)
	const { resolvedTheme } = useTheme()
	const { locale } = useLanguage()
	const [scene, setScene] = React.useState<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>(null)
	// Live scene for real-time viewer mirror (updates on every editor change)
	const [liveScene, setLiveScene] = React.useState<{
		elements?: unknown[]
		appState?: Record<string, unknown>
		files?: Record<string, unknown>
	} | null>(null)
	const [loading, setLoading] = React.useState(false)
	const [isLoaded, setIsLoaded] = React.useState(false)

	const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light'

	// Ref to track viewer's current camera state for saving
	const viewerCameraRef = React.useRef<Record<string, unknown>>({})
	// Ref to track last viewer camera signature to avoid redundant saves
	const lastViewerCameraSigRef = React.useRef<string>('')

	// Track if we're expecting initial load
	// After initial load, editor becomes write-only to prevent remounting during edits
	const pendingInitialLoadRef = React.useRef<boolean>(false)

	// Signatures to avoid redundant scene re-applies that can cause flicker
	const editorSigRef = React.useRef<string | null>(null)
	const viewerSigRef = React.useRef<string | null>(null)

	// Debug hook retained without side effects
	React.useEffect(() => {
		// no-op
	}, [])

	// Ensure component only renders after hydration to avoid ID mismatches
	React.useEffect(() => {
		setMounted(true)
	}, [])

	// Use the template user's document for autosave, gated by drawer open + loaded
	const {
		saveStatus,
		handleCanvasChange: originalHandleCanvasChange,
		onExcalidrawAPI,
		loading: hookLoading,
	} = useDocumentScene(TEMPLATE_USER_WA_ID, {
		enabled: true,
		isUnlocked: open && isLoaded,
		autoLoadOnMount: false,
	})

	// Use ref to track current scene for comparison without re-subscribing
	const sceneRef = React.useRef(scene)
	React.useEffect(() => {
		sceneRef.current = scene
	}, [scene])

	// DRY: Common logic for applying scene updates during initial load only
	const applySceneIfInitialLoad = React.useCallback(
		(
			_source: string,
			sceneData:
				| {
						elements?: unknown[]
						appState?: Record<string, unknown>
						files?: Record<string, unknown>
						viewerAppState?: Record<string, unknown>
						editorAppState?: Record<string, unknown>
				  }
				| null
				| undefined
		) => {
			if (!sceneData) {
				return
			}

			const sig = computeSceneSignature(
				(sceneData?.elements as unknown[]) || [],
				(sceneData?.appState as Record<string, unknown>) || {},
				(sceneData?.files as Record<string, unknown>) || {}
			)

			// Only update editor during initial load
			const isPendingInitialLoad = pendingInitialLoadRef.current
			const hasElements =
				Array.isArray(sceneData.elements) && sceneData.elements.length > 0

			if (isPendingInitialLoad && sig && sig !== editorSigRef.current) {
				// Only mark as loaded if we received actual content
				if (hasElements) {
					editorSigRef.current = sig
					setScene(sceneData)
					viewerSigRef.current = sig

					// Load viewer's saved camera or use empty state
					const viewerCamera = sceneData.viewerAppState || {}
					viewerCameraRef.current = viewerCamera

					// Initialize viewer camera signature from loaded data
					const zoomValue =
						(viewerCamera.zoom as { value?: number })?.value ?? 1
					const scrollX = (viewerCamera.scrollX as number) ?? 0
					const scrollY = (viewerCamera.scrollY as number) ?? 0
					const camera = {
						zoom:
							Math.round(zoomValue * CAMERA_PRECISION_FACTOR) /
							CAMERA_PRECISION_FACTOR,
						scrollX: Math.round(scrollX),
						scrollY: Math.round(scrollY),
					}
					lastViewerCameraSigRef.current = JSON.stringify(camera)

					setLiveScene({
						elements: sceneData.elements || [],
						appState: viewerCamera,
						files: sceneData.files || {},
					})
					// Mark as loaded
					pendingInitialLoadRef.current = false
				} else {
					// no-op
				}
			} else if (!isPendingInitialLoad) {
				// removed console logging
			}
		},
		[]
	)

	// Debug: log when saveStatus changes
	React.useEffect(() => {
		// removed console logging
	}, [])

	// Callback for viewer canvas changes (to track viewer camera)
	const handleViewerCanvasChange = React.useCallback(
		(
			_elements: unknown[],
			appState: Record<string, unknown>,
			_files: Record<string, unknown>
		) => {
			// Compute stable signature for viewer camera (only zoom/scroll values)
			// Round to avoid floating-point precision issues
			const zoomValue = (appState.zoom as { value?: number })?.value ?? 1
			const scrollX = (appState.scrollX as number) ?? 0
			const scrollY = (appState.scrollY as number) ?? 0

			const camera = {
				zoom:
					Math.round(zoomValue * CAMERA_PRECISION_FACTOR) /
					CAMERA_PRECISION_FACTOR,
				scrollX: Math.round(scrollX),
				scrollY: Math.round(scrollY),
			}
			const newSig = JSON.stringify(camera)

			// Only trigger autosave if camera signature actually changed
			if (newSig === lastViewerCameraSigRef.current) {
				return // No change, skip
			}

			// no-op

			// Update refs
			viewerCameraRef.current = appState
			lastViewerCameraSigRef.current = newSig

			// Trigger autosave with current editor state + new viewer camera
			try {
				const currentScene = sceneRef.current
				if (currentScene?.elements && open && isLoaded) {
					// Extract editor's camera from current scene
					const editorCamera = currentScene.appState
						? {
								zoom: currentScene.appState.zoom,
								scrollX: currentScene.appState.scrollX,
								scrollY: currentScene.appState.scrollY,
							}
						: undefined

					originalHandleCanvasChange({
						elements: currentScene.elements as unknown[],
						appState: currentScene.appState || {},
						files: currentScene.files || {},
						viewerAppState: viewerCameraRef.current,
						editorAppState: editorCamera,
					})
				}
			} catch (error) {
				logDrawerError(
					'Failed to propagate viewer camera updates to autosave',
					error
				)
			}
		},
		[originalHandleCanvasChange, open, isLoaded]
	)

	// Wrap handleCanvasChange to update live viewer scene in real-time
	// Only mirror elements and files, not viewport/panning (appState)
	const handleCanvasChange = React.useCallback(
		(
			elements: unknown[],
			appState: Record<string, unknown>,
			files: Record<string, unknown>
		) => {
			// Update live scene with elements and files only
			// Preserve viewer's independent viewport by not updating appState
			setLiveScene((prev) => ({
				elements,
				appState: prev?.appState || {}, // Keep viewer's viewport
				files,
			}))

			// Extract editor's camera state for explicit tracking
			const editorCamera = {
				zoom: appState.zoom,
				scrollX: appState.scrollX,
				scrollY: appState.scrollY,
			}

			// Call original handler for autosave logic with both cameras
			originalHandleCanvasChange({
				elements,
				appState,
				files,
				viewerAppState: viewerCameraRef.current,
				editorAppState: editorCamera,
			})
		},
		[originalHandleCanvasChange]
	)

	const handleCanvasChangeWithLog = React.useCallback(
		(elements: readonly unknown[], appState: unknown, files: unknown) => {
			handleCanvasChange(
				elements as unknown[] as unknown[],
				appState as Record<string, unknown>,
				files as Record<string, unknown>
			)
		},
		[handleCanvasChange]
	)

	// Ensure initial scene is applied as soon as Excalidraw API is ready
	const onApiReadyWithApply = React.useCallback(
		(api: unknown) => {
			try {
				;(onExcalidrawAPI as unknown as (a: unknown) => void)(api)
				const current = sceneRef.current
				if (current) {
					Promise.resolve().then(() => {
						try {
							requestAnimationFrame(() => {
								try {
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
											theme: themeMode,
										},
									})
								} catch (error) {
									logDrawerError(
										'Applying scene via Excalidraw API failed',
										error
									)
								}
							})
						} catch (error) {
							logDrawerError('Scheduling Excalidraw scene update failed', error)
						}
					})
				}
			} catch (error) {
				logDrawerError('Handling Excalidraw API readiness failed', error)
			}
		},
		[onExcalidrawAPI, themeMode]
	)

	// Listen for document updates from WebSocket - ONLY apply during initial load
	// After initial load, editor becomes write-only to prevent remounting during edits
	React.useEffect(() => {
		const onExternal = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string
					document?: Record<string, unknown> | null
				}
				if (String(detail?.wa_id || '') !== TEMPLATE_USER_WA_ID) {
					return
				}

				const sceneData = toSceneFromDoc(detail?.document || null)
				applySceneIfInitialLoad('WebSocket', sceneData)
			} catch (error) {
				logDrawerError('Processing external document update failed', error)
			}
		}
		window.addEventListener(
			'documents:external-update',
			onExternal as unknown as EventListener
		)
		return () => {
			window.removeEventListener(
				'documents:external-update',
				onExternal as unknown as EventListener
			)
		}
	}, [applySceneIfInitialLoad])

	// When the hook broadcasts that a scene was applied - ONLY apply during initial load
	React.useEffect(() => {
		const onApplied = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string
					scene?: {
						elements?: unknown[]
						appState?: Record<string, unknown>
						files?: Record<string, unknown>
						viewerAppState?: Record<string, unknown>
						editorAppState?: Record<string, unknown>
					} | null
				}
				if (String(detail?.wa_id || '') !== TEMPLATE_USER_WA_ID) {
					return
				}

				applySceneIfInitialLoad('hook', detail?.scene)

				setIsLoaded(true)
				setLoading(false)
			} catch (error) {
				logDrawerError('Processing internal sceneApplied event failed', error)
			}
		}
		window.addEventListener(
			'documents:sceneApplied',
			onApplied as unknown as EventListener
		)
		return () =>
			window.removeEventListener(
				'documents:sceneApplied',
				onApplied as unknown as EventListener
			)
	}, [applySceneIfInitialLoad])

	// Use TanStack Query for document retrieval
	const {
		data,
		isLoading: queryLoading,
		isFetching,
		refetch,
	} = useGetByWaId(TEMPLATE_USER_WA_ID, {
		enabled: open,
	})

	// Load template document when drawer opens (always request fresh snapshot)
	React.useEffect(() => {
		if (open) {
			// Mark as pending initial load
			pendingInitialLoadRef.current = true
			// Reset camera tracking
			lastViewerCameraSigRef.current = ''
			viewerCameraRef.current = {}
			setIsLoaded(false)
			setLoading(true)
			// Trigger query fetch
			refetch()
				.then((result) => {
					if (result?.data?.document) {
						window.dispatchEvent(
							new CustomEvent('documents:external-update', {
								detail: {
									wa_id: TEMPLATE_USER_WA_ID,
									document: result.data.document,
								},
							})
						)
					}
				})
				.catch(() => {
					setLoading(false)
				})
		}
	}, [open, refetch])

	// Sync loading state with query state
	React.useEffect(() => {
		if (open) {
			setLoading(queryLoading || isFetching)
		}
	}, [open, queryLoading, isFetching])

	// Handle query data when it arrives
	React.useEffect(() => {
		if (data?.document && open) {
			window.dispatchEvent(
				new CustomEvent('documents:external-update', {
					detail: {
						wa_id: TEMPLATE_USER_WA_ID,
						document: data.document,
					},
				})
			)
			setLoading(false)
		}
	}, [data, open])

	React.useEffect(() => {
		// When closing, keep scene but lock saves
		if (!open) {
			setIsLoaded(false)
		}
	}, [open])

	return (
		<>
			{mounted ? (
				<Sheet onOpenChange={setOpen} open={open}>
					<SheetTrigger asChild>
						{trigger || (
							<Button
								aria-label="Edit default document"
								size="icon"
								variant="ghost"
							>
								<FileEdit className="h-5 w-5" />
							</Button>
						)}
					</SheetTrigger>
					<SheetContent
						className={cn(
							'flex w-[95vw] max-w-none flex-col overflow-hidden p-0 sm:max-w-none',
							className
						)}
						side="right"
					>
						<SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 pr-12">
							<SheetTitle>{title}</SheetTitle>
							<DocumentSavingIndicator
								loading={loading || hookLoading}
								status={saveStatus}
							/>
						</SheetHeader>

						<div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
							{/* Top viewer canvas (read-only, mirrors bottom editor) */}
							<div className="relative h-[150px] flex-shrink-0">
								<div className="viewer-canvas-container relative h-full overflow-hidden rounded-md border border-border/50 bg-card/40">
									<style>{`
										.viewer-canvas-container button[title*="Exit"],
										.viewer-canvas-container button[aria-label*="Exit"],
										.viewer-canvas-container .excalidraw-textEditorContainer,
										.viewer-canvas-container .layer-ui__wrapper__footer-right,
										.viewer-canvas-container .layer-ui__wrapper__footer-left,
										.viewer-canvas-container .layer-ui__wrapper__top-right,
										.viewer-canvas-container .Island:has(button[title*="canvas actions"]),
										.viewer-canvas-container button[title*="View mode"],
										.viewer-canvas-container button[title*="Zen mode"],
										.viewer-canvas-container button[title*="zen mode"],
										.viewer-canvas-container .zen-mode-visibility,
										.viewer-canvas-container button[aria-label*="fullscreen" i],
										.viewer-canvas-container button[title*="fullscreen" i],
										.viewer-canvas-container .excalidraw__canvas {
											pointer-events: auto !important;
										}
										.viewer-canvas-container button[title*="Exit"]:not([title*="fullscreen" i]),
										.viewer-canvas-container button[aria-label*="Exit"]:not([aria-label*="fullscreen" i]) {
											display: none !important;
										}
									`}</style>
									<DocumentCanvas
										langCode={locale || 'en'}
										onApiReady={onApiReadyWithApply}
										onChange={
											handleViewerCanvasChange as unknown as ExcalidrawProps['onChange']
										}
										theme={themeMode}
										{...(liveScene ? { scene: liveScene } : {})}
										forceLTR={true}
										hideHelpIcon={true}
										hideToolbar={true}
										scrollable={false}
										uiOptions={{
											canvasActions: {
												toggleTheme: false,
												export: false,
												saveAsImage: false,
												clearCanvas: false,
												loadScene: false,
												saveToActiveFile: false,
											},
										}}
										viewModeEnabled={true}
										zenModeEnabled={true}
									/>
								</div>
							</div>

							{/* Bottom editor canvas (editable) */}
							<div
								className="relative flex-1 overflow-hidden rounded-md border border-border/50 bg-card/40"
								style={{ minHeight: '450px' }}
							>
								{!loading && (
									<DocumentCanvas
										langCode={locale || 'en'}
										onApiReady={onApiReadyWithApply}
										onChange={
											handleCanvasChangeWithLog as unknown as ExcalidrawProps['onChange']
										}
										theme={themeMode}
										{...(scene ? { scene } : {})}
										forceLTR={true}
										hideHelpIcon={false}
										scrollable={false}
										viewModeEnabled={false}
										zenModeEnabled={false}
									/>
								)}
								{loading && (
									<div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
										<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-muted-foreground text-sm shadow">
											<span>Loading template...</span>
										</div>
									</div>
								)}
							</div>
						</div>
					</SheetContent>
				</Sheet>
			) : null}
		</>
	)
}
