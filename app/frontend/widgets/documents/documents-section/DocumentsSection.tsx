'use client'

import type { ExcalidrawProps } from '@excalidraw/excalidraw/types'
import { Maximize2, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { useCallback, useMemo } from 'react'
import { useDocumentsSection } from '@/features/documents'
import { createPhoneEditInterceptor } from '@/features/documents/grid/phoneEditInterceptor'
import { useCustomerData } from '@/shared/libs/data/customer-data-context'
import type { IDataSource } from '@/shared/libs/data-grid'
import { FullscreenProvider } from '@/shared/libs/data-grid'
import { i18n } from '@/shared/libs/i18n'
import { useLanguage } from '@/shared/libs/state/language-context'
import { SidebarInset } from '@/shared/ui/sidebar'
import { DocumentCanvas } from '@/widgets/document-canvas/DocumentCanvas'
import { DocumentLockOverlay } from '@/widgets/documents/DocumentLockOverlay'
import { DocumentSavingIndicator } from '@/widgets/documents/DocumentSavingIndicator'

function DocumentsPageContent() {
	const { resolvedTheme } = useTheme()
	const { locale, isLocalized } = useLanguage()
	const { customers } = useCustomerData()

	// Main composition hook - orchestrates all document section logic
	const {
		scene,
		viewerScene,
		isUnlocked,
		isFullscreen,
		customerDataSource,
		customerLoading,
		validationErrors,
		loading,
		saveStatus,
		fsContainerRef,
		handleClear,
		handleProviderReady,
		handleViewerCanvasChange,
		handleCanvasChange,
		onApiReadyWithApply,
		onViewerApiReady,
		enterFullscreen,
		exitFullscreen,
	} = useDocumentsSection({
		resolvedTheme,
	})

	const themeMode = useMemo<'light' | 'dark'>(
		() => (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
		[resolvedTheme]
	)

	const findCustomerByPhone = useCallback(
		(phone: string) => {
			if (!phone) {
				return
			}
			const normalizedInput = phone.replace(/\D/g, '')
			if (!normalizedInput) {
				return
			}
			return customers.find((customer) => {
				const candidates = [customer.phone, customer.id]
				return candidates.some((candidate) => {
					if (typeof candidate !== 'string') {
						return false
					}
					return candidate.replace(/\D/g, '') === normalizedInput
				})
			})
		},
		[customers]
	)

	const gridDispatch = useCallback(
		(
			type:
				| 'doc:user-select'
				| 'doc:customer-loaded'
				| 'grid:age-request'
				| 'doc:persist'
				| 'doc:notify',
			detail: unknown
		) => {
			try {
				window.dispatchEvent(new CustomEvent(type, { detail }))
			} catch {
				// Ignore dispatch errors to avoid breaking grid editing flow
			}
		},
		[]
	)

	const phoneEditInterceptor = useMemo(
		() =>
			createPhoneEditInterceptor({
				findCustomerByPhone,
				dispatch: gridDispatch,
				documentsMode: true,
			}),
		[findCustomerByPhone, gridDispatch]
	)

	const editInterceptors = useMemo(
		() => [phoneEditInterceptor],
		[phoneEditInterceptor]
	)

	// Defer Grid import to client to avoid SSR window references inside the library
	const ClientGrid = useMemo(
		() =>
			dynamic(() => import('@/shared/libs/data-grid/components/Grid'), {
				ssr: false,
			}),
		[]
	)

	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
				{/* Header spacer (calendar icon exists elsewhere) */}
				<div className="flex items-center justify-end gap-2" />

				{/* Work area: grid + canvases */}
				<div
					className={`flex-1 rounded-lg border border-border/50 bg-card/50 p-2 ${isFullscreen ? 'rounded-none border-0 p-0' : ''}`}
					ref={fsContainerRef}
				>
					<div
						className="flex min-h-0 flex-col gap-2"
						style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 6.5rem)' }}
					>
						{/* Top: customer grid */}
						<div className="w-full flex-shrink-0 rounded-md border border-border/50 bg-background/60 p-1">
							<FullscreenProvider>
								<ClientGrid
									className="min-h-[64px] w-full"
									dataSource={customerDataSource as unknown as IDataSource}
									disableTrailingRow={true}
									documentsGrid={true}
									editInterceptors={editInterceptors}
									fullWidth={true}
									hideAppendRowPlaceholder={true}
									loading={customerLoading}
									onAddRowOverride={handleClear}
									onDataProviderReady={handleProviderReady}
									rowMarkers="none"
									showThemeToggle={false}
									validationErrors={validationErrors}
								/>
							</FullscreenProvider>
						</div>

						{/* Below: dual canvases */}
						<div className="flex min-h-0 flex-1 flex-col gap-2">
							{/* Viewer (top, ~150px) - real-time mirror of editor with independent camera */}
							<div className="viewer-canvas-container relative h-[150px] flex-shrink-0 overflow-hidden rounded-md border border-border/50 bg-card/40">
								<style>
									{`
										.viewer-canvas-container .excalidraw-modal,
										.viewer-canvas-container .welcome-screen-center,
										.viewer-canvas-container .zen-mode-transition,
										.viewer-canvas-container button[title*="Exit"],
										.viewer-canvas-container button[aria-label*="Exit"],
										.viewer-canvas-container button[title*="exit"],
										.viewer-canvas-container button[aria-label*="exit"],
										.viewer-canvas-container .zen-mode-transition-container,
										.viewer-canvas-container .disable-zen-mode,
										.viewer-canvas-container [class*="zen-mode"],
										.viewer-canvas-container [class*="fullscreen"] {
											display: none !important;
										}
										/* Allow panning/zooming but keep it read-only */
										.viewer-canvas-container .excalidraw {
											cursor: grab !important;
										}
										.viewer-canvas-container .excalidraw:active {
											cursor: grabbing !important;
										}
									`}
								</style>
								<DocumentCanvas
									forceLTR={true}
									hideHelpIcon={true}
									hideToolbar={true}
									langCode={locale || 'en'}
									onApiReady={onViewerApiReady}
									onChange={
										handleViewerCanvasChange as unknown as ExcalidrawProps['onChange']
									}
									scrollable={false}
									theme={themeMode}
									{...(viewerScene ? { scene: viewerScene } : {})}
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
								{/* Saving indicator overlay */}
								<div className="pointer-events-none absolute top-2 right-2 z-[3]">
									<DocumentSavingIndicator
										loading={loading}
										status={saveStatus}
									/>
								</div>
								{/* Lock overlay when not unlocked or loading (viewer - spinner only) */}
								<DocumentLockOverlay
									active={loading || !isUnlocked}
									loading={loading}
									message=""
								/>
							</div>

							{/* Editor (bottom, flex-fill) */}
							<div
								className={`relative min-h-0 flex-1 ${isFullscreen ? 'rounded-none border-0' : 'rounded-md border border-border/50'} flex flex-col overflow-hidden bg-card/40`}
							>
								<DocumentCanvas
									langCode={locale || 'en'}
									onApiReady={onApiReadyWithApply}
									onChange={
										handleCanvasChange as unknown as ExcalidrawProps['onChange']
									}
									theme={themeMode}
									{...(scene ? { scene } : {})}
									forceLTR={true}
									hideHelpIcon={true}
									scrollable={false}
									viewModeEnabled={false}
									zenModeEnabled={false}
								/>

								{/* Lock overlay when not unlocked; show loading when busy */}
								<DocumentLockOverlay
									active={loading || !isUnlocked}
									loading={loading}
									message={
										isUnlocked
											? i18n.getMessage('document_loading', isLocalized)
											: i18n.getMessage('document_unlock_prompt', isLocalized)
									}
								/>
								{/* Fullscreen toggle button (theme-aware container) */}
								<div className="absolute right-2 bottom-2 z-[3]">
									<div className="rounded-md border border-border bg-card/90 px-1.5 py-1 text-foreground shadow-sm backdrop-blur">
										{isFullscreen ? (
											<button
												aria-label="Exit fullscreen"
												className="excalidraw-fullscreen-button"
												onClick={exitFullscreen}
												type="button"
											>
												<Minimize2 className="size-4" />
											</button>
										) : (
											<button
												aria-label="Enter fullscreen"
												className="excalidraw-fullscreen-button"
												onClick={enterFullscreen}
												type="button"
											>
												<Maximize2 className="size-4" />
											</button>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</SidebarInset>
	)
}

export default function DocumentsSection() {
	return <DocumentsPageContent />
}
