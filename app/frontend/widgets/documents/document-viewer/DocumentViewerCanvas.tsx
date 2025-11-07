'use client'

import type { ReactNode } from 'react'
import type { TldrawStoreState } from '@/features/documents/hooks/useTldrawStore'
import { cn } from '@/lib/utils'
import { DocumentEditorCanvas } from '../document-editor/DocumentEditorCanvas'

type DocumentViewerCanvasProps = {
	storeState: TldrawStoreState
	className?: string
	focusMode?: boolean
	errorMessage?: string
	children?: ReactNode
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
}: DocumentViewerCanvasProps) => (
	<div className={cn('h-full w-full', className)}>
		<DocumentEditorCanvas
			focusMode={focusMode}
			loadingLabel="Loading viewer..."
			storeState={storeState}
			{...(errorMessage ? { errorMessage } : {})}
		>
			{children}
		</DocumentEditorCanvas>
	</div>
)
