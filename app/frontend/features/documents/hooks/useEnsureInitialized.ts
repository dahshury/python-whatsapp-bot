/**
 * Hook to ensure document is initialized
 */

'use client'

import { useCallback } from 'react'
import { logger } from '@/shared/libs/logger'

/**
 * Hook for ensuring a document exists for a given waId
 */
export function useEnsureInitialized() {
	const ensureInitialized = useCallback(async (waId: string) => {
		// Documents are created automatically when first saved
		// No need for complex initialization
		logger.info(`[useEnsureInitialized] Document ${waId} will be created on first save`)
		return true
	}, [])

	return ensureInitialized
}


