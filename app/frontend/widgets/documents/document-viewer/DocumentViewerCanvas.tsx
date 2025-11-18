'use client'

import type { ReactNode } from 'react'
import type { Editor } from 'tldraw'
import type { TldrawStoreState } from '@/features/documents/hooks/useTldrawStore'
import { cn } from '@/lib/utils'
import { DocumentEditorCanvas } from '../document-editor/DocumentEditorCanvas'

type DocumentViewerCanvasProps = {
	storeState: TldrawStoreState
	className?: string
	focusMode?: boolean
	errorMessage?: string
	children?: ReactNode
	onEditorMount?: (editor: Editor) => void
}

/**
 * TLDraw viewer component - read-only canvas for viewing drawings.
 * Wraps the editor canvas in focus mode with interactions disabled.
 */
export const DocumentViewerCanvas = ({
	storeState,
	className,
	focusMode = true,
	errorMessage,
	children,
	onEditorMount,
}: DocumentViewerCanvasProps) => (
	<div className={cn('flex h-full min-h-0 flex-1', className)}>
		<DocumentEditorCanvas
			className="h-full flex-1"
			focusMode={focusMode}
			readOnly={true}
			storeState={storeState}
			{...(errorMessage ? { errorMessage } : {})}
			{...(onEditorMount ? { onEditorMount } : {})}
		>
			{children}
		</DocumentEditorCanvas>
	</div>
)
