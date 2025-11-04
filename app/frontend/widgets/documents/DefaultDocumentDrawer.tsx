'use client'

import type { ExcalidrawProps } from '@excalidraw/excalidraw/types'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { FileEdit } from 'lucide-react'
import { useTheme } from 'next-themes'
import React from 'react'
import { useDocumentScene } from '@/features/documents'
import { DocumentLoadService } from '@/features/documents/services/document-load.service'
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
	const [loading, setLoading] = React.useState(false)
	const [isLoaded, setIsLoaded] = React.useState(false)

	const themeMode = resolvedTheme === 'dark' ? 'dark' : 'light'

	// Track if we're expecting initial load
	// After initial load, editor becomes write-only to prevent remounting during edits
	const pendingInitialLoadRef = React.useRef<boolean>(false)

	// Signatures to avoid redundant scene re-applies that can cause flicker
	const editorSigRef = React.useRef<string | null>(null)

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

			if (
				isPendingInitialLoad &&
				sig &&
				sig !== editorSigRef.current &&
				hasElements
			) {
				editorSigRef.current = sig
				setScene(sceneData)
				pendingInitialLoadRef.current = false
			}
		},
		[]
	)

	// Debug: log when saveStatus changes
	React.useEffect(() => {
		// removed console logging
	}, [])

	// Canvas change handler wired to autosave orchestration
	const handleCanvasChange = React.useCallback(
		(
			elements: unknown[],
			appState: Record<string, unknown>,
			files: Record<string, unknown>
		) => {
			const editorCamera = {
				zoom: appState.zoom,
				scrollX: appState.scrollX,
				scrollY: appState.scrollY,
			}

			originalHandleCanvasChange({
				elements,
				appState,
				files,
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

	// Load template document when drawer opens (always request fresh snapshot)
	React.useEffect(() => {
		if (open) {
			// Mark as pending initial load
			pendingInitialLoadRef.current = true
			setIsLoaded(false)
			setLoading(true)
			// Load document via REST API
			DocumentLoadService.load({ waId: TEMPLATE_USER_WA_ID }).catch(() => {
				setLoading(false)
			})
		}
	}, [open])

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

						<div className="flex min-h-0 flex-1 flex-col p-2">
							<div
								className="relative flex-1 overflow-hidden rounded-md border border-border/50 bg-card/40"
								style={{ minHeight: '600px' }}
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
