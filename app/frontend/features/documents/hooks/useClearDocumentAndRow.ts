'use client'

import { useCallback } from 'react'
import type { TLStore } from 'tldraw'
import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import type { DataProvider } from '@/shared/libs/data-grid/components/core/services/DataProvider'
import { logger } from '@/shared/libs/logger'
import { ClearActionService } from '../services/clear-action.service'

export type UseClearDocumentAndRowParams = {
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
	providerRef: React.MutableRefObject<DataProvider | null>
	editorStore: TLStore | null
	viewerStore: TLStore | null
}

export type UseClearDocumentAndRowResult = {
	clearDocumentAndRow: (onLock?: () => void) => Promise<void>
}

/**
 * Hook for clearing both customer row data and TLDraw canvas.
 * Handles grid data clearing and canvas state reset.
 */
export function useClearDocumentAndRow(
	params: UseClearDocumentAndRowParams
): UseClearDocumentAndRowResult {
	const {
		customerDataSource,
		customerColumns,
		providerRef,
		editorStore,
		viewerStore,
	} = params

	const clearDocumentAndRow = useCallback(
		async (onLock?: () => void) => {
			if (!customerDataSource) {
				return
			}
			if (!customerColumns) {
				return
			}
			if (!providerRef.current) {
				return
			}

			try {
				// Clear the row data using ClearActionService
				await ClearActionService.clearRow({
					customerDataSource,
					customerColumns,
					providerRef,
				})
			} catch (error) {
				logger.warn('[useClearDocumentAndRow] Failed to clear row', error)
			}

			// Clear canvas by removing all document records from both stores
			try {
				if (editorStore) {
					// Get all document records (exclude instance/pointer/presence/camera)
					const allRecords = editorStore.allRecords()
					const documentRecords = allRecords.filter(
						(record) =>
							!(
								record.id.startsWith('instance') ||
								record.id.startsWith('pointer') ||
								record.id.startsWith('presence') ||
								record.id.startsWith('camera')
							)
					)

					if (documentRecords.length > 0) {
						editorStore.remove(documentRecords.map((r) => r.id))
					}
				}

				if (viewerStore) {
					// Get all document records (exclude instance/pointer/presence/camera)
					const allRecords = viewerStore.allRecords()
					const documentRecords = allRecords.filter(
						(record) =>
							!(
								record.id.startsWith('instance') ||
								record.id.startsWith('pointer') ||
								record.id.startsWith('presence') ||
								record.id.startsWith('camera')
							)
					)

					if (documentRecords.length > 0) {
						viewerStore.remove(documentRecords.map((r) => r.id))
					}
				}
			} catch (error) {
				logger.warn('[useClearDocumentAndRow] Failed to clear canvas', error)
			}

			// Lock the canvases
			if (onLock) {
				onLock()
			}
		},
		[customerDataSource, customerColumns, providerRef, editorStore, viewerStore]
	)

	return {
		clearDocumentAndRow,
	}
}
