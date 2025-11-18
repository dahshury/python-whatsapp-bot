import { useEffect, useRef, useState, useTransition } from 'react'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import { useEnsureInitialized, useGetByWaId } from './index'

export type UseDocumentLoadOptions = {
	enabled: boolean
	autoLoadOnMount: boolean
	pollIntervalMs?: number
	ignoreChangesDelayMs?: number
}

/**
 * Hook for loading documents from the server using TanStack Query.
 * Handles initialization and document loading via queries.
 *
 * @param waId - WhatsApp ID of the document to load
 * @param options - Load configuration options
 * @returns Loading state and utilities
 *
 * @example
 * ```typescript
 * const { loading, lastLoadedWaIdRef } = useDocumentLoad(waId, {
 *   enabled: true,
 *   autoLoadOnMount: true
 * })
 * ```
 */
export const useDocumentLoad = (
	waId: string,
	options: UseDocumentLoadOptions
) => {
	const { enabled, autoLoadOnMount, pollIntervalMs = 50 } = options

	const [loading, setLoading] = useState(false)
	const [, startTransition] = useTransition()
	const lastLoadedWaIdRef = useRef<string | null>(null)

	// Use TanStack Query for document retrieval
	// Enable query when basic conditions are met - documents are dynamic, no caching
	// Note: Template user (TEMPLATE_USER_WA_ID) is loaded via query like any other user
	const queryEnabled =
		enabled &&
		autoLoadOnMount &&
		Boolean(waId) &&
		waId !== DEFAULT_DOCUMENT_WA_ID // DEFAULT_DOCUMENT_WA_ID is empty string, not template

	// Use query with enabled flag to control when it fetches
	const { data, isLoading } = useGetByWaId(waId, {
		enabled: queryEnabled,
	})
	const ensureInitialized = useEnsureInitialized()

	// Reset when waId changes and show loading indicator for new document
	useEffect(() => {
		if (!waId) {
			return
		}

		if (lastLoadedWaIdRef.current !== waId) {
			// Reset tracking
			lastLoadedWaIdRef.current = null

			const shouldShowSpinner =
				enabled && autoLoadOnMount && waId !== DEFAULT_DOCUMENT_WA_ID

			if (shouldShowSpinner) {
				// Always show loading - query will refetch fresh data (no caching)
				startTransition(() => setLoading(true))
			} else {
				startTransition(() => setLoading(false))
			}
		}
		// startTransition is stable from React, doesn't need to be in deps
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [waId, enabled, autoLoadOnMount])

	// Handle query data when it arrives
	useEffect(() => {
		// Allow documents with empty elements array (like template) to load
		if (!waId || lastLoadedWaIdRef.current === waId) {
			return
		}

		// Only dispatch if we have data (document can be empty object for new/template docs)
		if (!data) {
			return
		}

		lastLoadedWaIdRef.current = waId

		window.dispatchEvent(
			new CustomEvent('documents:external-update', {
				detail: {
					wa_id: waId,
					document: data.document,
				},
			})
		)
		startTransition(() => setLoading(false))
		// startTransition is stable from React, doesn't need to be in deps
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, waId])

	// Initialization effect - ensures document is initialized (runs in parallel with query)
	useEffect(() => {
		if (
			!(enabled && autoLoadOnMount && waId) ||
			waId === DEFAULT_DOCUMENT_WA_ID
		) {
			return
		}

		// Skip if already loaded
		if (lastLoadedWaIdRef.current === waId) {
			return
		}

		let cancelled = false

		const initialize = async () => {
			try {
				// Ensure initialization - this can run in parallel with query fetch
				await ensureInitialized(waId)

				if (cancelled) {
					return
				}

				// Wait for any in-flight REST operations to complete
				while (true) {
					await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
					const restInFlight = (globalThis as { __docRestInFlight?: boolean })
						.__docRestInFlight
					if (!restInFlight) {
						break
					}
					if (cancelled) {
						return
					}
				}
			} catch (_error) {
				if (!cancelled) {
					startTransition(() => setLoading(false))
				}
			}
		}

		initialize().catch(() => {
			// Error already handled
		})

		return () => {
			cancelled = true
		}
	}, [enabled, autoLoadOnMount, waId, pollIntervalMs, ensureInitialized])

	// Sync loading state with query state during initial load only
	useEffect(() => {
		if (!queryEnabled) {
			return
		}
		if (lastLoadedWaIdRef.current === waId) {
			return
		}
		startTransition(() => {
			setLoading(isLoading)
		})
		// startTransition is stable from React, doesn't need to be in deps
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryEnabled, isLoading, waId])

	return {
		loading,
		setLoading,
		lastLoadedWaIdRef,
		startTransition,
	} as const
}
