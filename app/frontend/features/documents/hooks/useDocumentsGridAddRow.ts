'use client'

import { useQueryClient } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback } from 'react'
import type { Editor } from 'tldraw'
import { DOCUMENT_QUERY_KEY } from '@/entities/document'
import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import type { DataProvider } from '@/shared/libs/data-grid/components/core/services/DataProvider'
import { logger } from '@/shared/libs/logger'
import { CLEAR_ROW_SUPPRESS_CLEANUP_DELAY_MS } from '../model/persistence-constants'
import { ClearActionService } from '../services/clear-action.service'
import type { SaveStatus } from '../types/save-state.types'

export type UseDocumentsGridAddRowParams = {
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
	providerRef: React.MutableRefObject<DataProvider | null>
	editorRef: React.MutableRefObject<Editor | null>
	viewerRef: React.MutableRefObject<Editor | null>
	setIsCanvasLocked: (locked: boolean) => void
	setSaveStatus: Dispatch<SetStateAction<SaveStatus>>
	waId: string | null | undefined
	onStartNewCustomer?: () =>
		| Promise<string | null | undefined>
		| string
		| null
		| undefined
}

export type UseDocumentsGridAddRowResult = {
	onAddRowOverride: () => Promise<void>
}

/**
 * Self-contained hook for documents grid "Add row" button behavior.
 * Handles clearing row data, clearing canvas, and locking canvases.
 * Completely modular and independent of DocumentsSection or other components.
 */
export function useDocumentsGridAddRow(
	params: UseDocumentsGridAddRowParams
): UseDocumentsGridAddRowResult {
	const {
		customerDataSource,
		customerColumns,
		providerRef,
		editorRef,
		viewerRef,
		setIsCanvasLocked,
		setSaveStatus,
		waId,
		onStartNewCustomer,
	} = params

	const queryClient = useQueryClient()

	const onAddRowOverride = useCallback(async () => {
		// Early return if critical dependencies are not ready
		if (!customerDataSource) {
			return
		}
		if (!customerColumns || customerColumns.length === 0) {
			return
		}

		let nextWaId: string | null | undefined = waId ?? null

		if (typeof onStartNewCustomer === 'function') {
			try {
				const result = await onStartNewCustomer()
				if (typeof result === 'string') {
					nextWaId = result
				}
			} catch (error) {
				logger.warn(
					'[useDocumentsGridAddRow] Failed to start new customer',
					error
				)
			}
		} else if (
			typeof onStartNewCustomer === 'string' ||
			onStartNewCustomer === null
		) {
			nextWaId = onStartNewCustomer ?? null
		}

		// Set global flag to suppress autosave during clearing
		const AUTOSAVE_SUPPRESS_DURATION_MS = 1000
		try {
			;(
				globalThis as unknown as { __docSuppressAutosave?: number }
			).__docSuppressAutosave = Date.now() + AUTOSAVE_SUPPRESS_DURATION_MS
		} catch {
			// Ignore if setting flag fails
		}

		try {
			// Clear the row data using ClearActionService
			// This works even if providerRef.current is null - ClearActionService handles it
			await ClearActionService.clearRow({
				customerDataSource,
				customerColumns,
				providerRef,
			})
		} catch (error) {
			logger.warn('[useDocumentsGridAddRow] Failed to clear row', error)
		}

		// Clear canvas using proper TLDraw editor API
		// This ensures proper cleanup and prevents ghost shapes
		try {
			if (editorRef.current) {
				const editor = editorRef.current
				const shapes = editor.getCurrentPageShapes()
				if (shapes.length > 0) {
					editor.deleteShapes(shapes)
				}
				// Force store reset to prevent lingering edits
				// Note: history.clear() is protected, but we need it for proper cleanup
				;(
					editor as unknown as { history: { clear: () => void } }
				).history.clear()
				editor.selectNone()
			}

			if (viewerRef.current) {
				const viewer = viewerRef.current
				const shapes = viewer.getCurrentPageShapes()
				if (shapes.length > 0) {
					viewer.deleteShapes(shapes)
				}
				// Note: history.clear() is protected, but we need it for proper cleanup
				;(
					viewer as unknown as { history: { clear: () => void } }
				).history.clear()
				viewer.selectNone()
			}
		} catch (error) {
			logger.warn('[useDocumentsGridAddRow] Failed to clear canvas', error)
		}

		// Lock the canvases
		setIsCanvasLocked(true)

		// Reset save status to ready (clearing is not a user edit that needs saving)
		setSaveStatus({ status: 'ready' })

		// Invalidate query cache for current waId to ensure canvas reloads cleanly
		if (nextWaId && nextWaId.trim() !== '') {
			try {
				queryClient.invalidateQueries({
					queryKey: [...DOCUMENT_QUERY_KEY.byWaId(nextWaId)],
				})
				queryClient.invalidateQueries({
					queryKey: [...DOCUMENT_QUERY_KEY.byWaId(nextWaId), 'canvas'],
				})
			} catch (error) {
				logger.warn(
					'[useDocumentsGridAddRow] Failed to invalidate query cache',
					error
				)
			}
		}

		// Clear the suppress flag after a delay
		setTimeout(() => {
			try {
				const global = globalThis as unknown as {
					__docSuppressAutosave?: number | undefined
				}
				global.__docSuppressAutosave = undefined
			} catch {
				// Ignore cleanup failures
			}
		}, CLEAR_ROW_SUPPRESS_CLEANUP_DELAY_MS)
	}, [
		customerDataSource,
		customerColumns,
		providerRef,
		editorRef,
		viewerRef,
		setIsCanvasLocked,
		setSaveStatus,
		waId,
		onStartNewCustomer,
		queryClient,
	])

	return {
		onAddRowOverride,
	}
}
