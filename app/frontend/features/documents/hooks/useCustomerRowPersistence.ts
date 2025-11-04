'use client'

import { useCallback, useRef } from 'react'
import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import { useLanguage } from '@/shared/libs/state/language-context'
import { CustomerRowPersistenceService } from '../services/customer-row-persistence.service'
import { createDocumentsService } from '../services/documents.service.factory'

export type UseCustomerRowPersistenceParams = {
	waId: string
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
}

/**
 * Hook for persisting customer row data (name/age) to the backend.
 * Handles debouncing, change detection, in-flight guards, and toast notifications.
 *
 * @param params - Hook parameters
 * @returns Callback to persist row data
 */
export function useCustomerRowPersistence(
	params: UseCustomerRowPersistenceParams
): {
	persistRow: (triggeredBy?: 'name' | 'age' | 'phone') => Promise<void>
} {
	const { waId, customerDataSource, customerColumns } = params
	const { isLocalized } = useLanguage()

	// Track previous persisted values per waId
	const prevByWaRef = useRef<Map<string, { name: string; age: number | null }>>(
		new Map()
	)
	// Track in-flight persistence to prevent duplicates
	const persistInFlightRef = useRef<{
		waId: string
		name: string
		age: number | null
	} | null>(null)

	const persistRow = useCallback(
		async (triggeredBy?: 'name' | 'age' | 'phone') => {
			try {
				if (!customerDataSource) {
					return
				}

				const documentsService = createDocumentsService()

				const result = await CustomerRowPersistenceService.persistRow({
					waId,
					customerDataSource,
					customerColumns,
					documentsService,
					isLocalized,
					triggeredBy,
					prevByWa: prevByWaRef.current,
					currentInFlight: persistInFlightRef.current,
				})

				// Update refs with result
				prevByWaRef.current = result.prevByWa
				persistInFlightRef.current = result.persistInFlight
			} catch {
				// Errors handled in service via toast
			}
		},
		[customerColumns, customerDataSource, waId, isLocalized]
	)

	return {
		persistRow,
	}
}
