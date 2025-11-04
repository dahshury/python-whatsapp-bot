'use client'

import { useCallback } from 'react'
import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import { UnlockValidationService } from '../services/unlock-validation.service'

export type UseUnlockValidationParams = {
	waId: string
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
	isUnlocked: boolean
	setIsUnlocked: (unlocked: boolean) => void
}

/**
 * Hook for validating and managing document unlock state.
 * Validates unlock conditions whenever customer data changes.
 *
 * @param params - Hook parameters
 * @returns Callback to recompute unlock state
 */
export function useUnlockValidation(params: UseUnlockValidationParams): {
	recomputeUnlock: () => Promise<void>
} {
	const {
		waId,
		customerDataSource,
		customerColumns,
		isUnlocked,
		setIsUnlocked,
	} = params

	const recomputeUnlock = useCallback(async () => {
		try {
			// Skip check if no customer selected (blank document)
			if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
				if (isUnlocked) {
					setIsUnlocked(false)
				}
				return
			}

			if (!customerDataSource) {
				setIsUnlocked(false)
				return
			}

			const result = await UnlockValidationService.validate({
				waId,
				customerDataSource,
				customerColumns,
			})

			setIsUnlocked(result.shouldUnlock)
		} catch (_err) {
			setIsUnlocked(false)
		}
	}, [customerColumns, customerDataSource, waId, isUnlocked, setIsUnlocked])

	return {
		recomputeUnlock,
	}
}
