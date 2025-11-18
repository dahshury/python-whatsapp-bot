'use client'

import { Maximize2, Minimize2 } from 'lucide-react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Editor, TLPageId } from 'tldraw'
import { DocumentAutosaveBridge } from '@/features/documents'
import type { TldrawStoreState } from '@/features/documents/hooks'
import type { SaveStatus } from '@/features/documents/types/save-state.types'
import type { DocumentAutosaveBridgeProps } from '@/features/documents/ui/document-autosave-bridge'
import { useLanguageStore } from '@/infrastructure/store/app-store'
import { cn } from '@/lib/utils'
import { i18n } from '@/shared/libs/i18n'
import { DocumentLockOverlay } from '@/widgets/documents/DocumentLockOverlay'
import { DocumentSavingIndicator } from '@/widgets/documents/DocumentSavingIndicator'
import { DocumentEditorCanvas } from '@/widgets/documents/document-editor'

type CameraState = { x: number; y: number; z: number }

type DocumentsEditorPanelProps = {
	isFullscreen: boolean
	storeErrorMessage?: string | undefined
	tldrawEditorStoreState: TldrawStoreState
	onEditorMount: (editor: Editor) => void
	waId: string
	documentsService: DocumentAutosaveBridgeProps['documentsService']
	editorCamera?: CameraState | null
	editorPageId?: TLPageId | string | null
	viewerCameraRef: MutableRefObject<CameraState | null>
	setSaveStatus: Dispatch<SetStateAction<SaveStatus>>
	isCanvasLocked: boolean
	isCheckingLock: boolean
	viewerActive: boolean
	saveStatus: SaveStatus
	className?: string
	enterFullscreen: () => void
	exitFullscreen: () => void
}

export function DocumentsEditorPanel({
	isFullscreen,
	storeErrorMessage,
	tldrawEditorStoreState,
	onEditorMount,
	waId,
	documentsService,
	editorCamera,
	editorPageId,
	viewerCameraRef,
	setSaveStatus,
	isCanvasLocked,
	isCheckingLock,
	viewerActive,
	saveStatus,
	className,
	enterFullscreen,
	exitFullscreen,
}: DocumentsEditorPanelProps) {
	const { isLocalized } = useLanguageStore()
	const normalizedEditorPageId =
		typeof editorPageId === 'string'
			? (editorPageId as TLPageId)
			: (editorPageId ?? null)

	return (
		<div
			className={cn(
				`tldraw-editor-container relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 ${isFullscreen ? 'rounded-none border-0' : ''}`,
				className
			)}
		>
			<div className="relative h-full min-h-0 flex-1 overflow-hidden">
				<DocumentEditorCanvas
					className="h-full flex-1"
					storeState={tldrawEditorStoreState}
					{...(storeErrorMessage ? { errorMessage: storeErrorMessage } : {})}
					onEditorMount={onEditorMount}
				>
					{waId && tldrawEditorStoreState.status === 'ready' ? (
						<DocumentAutosaveBridge
							documentsService={documentsService}
							editorCamera={editorCamera}
							editorPageId={normalizedEditorPageId ?? undefined}
							editorStoreStatus={tldrawEditorStoreState.status}
							setSaveStatus={setSaveStatus}
							viewerCameraRef={viewerCameraRef}
							waId={waId}
						/>
					) : null}
				</DocumentEditorCanvas>

				<DocumentLockOverlay
					active={isCanvasLocked}
					loading={isCheckingLock}
					{...(isCanvasLocked
						? {
								message: i18n.getMessage('document_lock_message', isLocalized),
							}
						: {})}
				/>

				{/* Show status indicator in editor when viewer is disabled */}
				{!viewerActive && (
					<div className="tldraw-status-overlay absolute top-4 right-4">
						<DocumentSavingIndicator status={saveStatus} />
					</div>
				)}

				<button
					aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
					className="tldraw-fullscreen-button absolute right-4 bottom-4 inline-flex items-center justify-center rounded-full bg-background/80 p-2 shadow-sm backdrop-blur transition-colors hover:bg-background"
					onClick={isFullscreen ? exitFullscreen : enterFullscreen}
					type="button"
				>
					{isFullscreen ? (
						<Minimize2 className="size-4" />
					) : (
						<Maximize2 className="size-4" />
					)}
				</button>
			</div>
		</div>
	)
}
