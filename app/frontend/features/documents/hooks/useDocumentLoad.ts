import { useEffect, useRef, useState, useTransition } from 'react'
import { DocumentLoadService } from '../services/document-load.service'
import { createDocumentsService } from '../services/documents.service.factory'

export type UseDocumentLoadOptions = {
	enabled: boolean
	autoLoadOnMount: boolean
	pollIntervalMs?: number
	ignoreChangesDelayMs?: number
}

/**
 * Hook for loading documents from the server.
 * Handles initialization, REST coordination, and WebSocket loading.
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

	useEffect(() => {
		if (!(enabled && autoLoadOnMount && waId)) {
			return
		}

		let cancelled = false

		const load = async () => {
			if (DocumentLoadService.shouldSkipLoad(waId, lastLoadedWaIdRef.current)) {
				return
			}

			startTransition(() => setLoading(true))

			try {
				// Ensure document is initialized
				const svc = createDocumentsService()
				await svc.ensureInitialized(waId)

				// Check if we should still proceed
				if (cancelled) {
					return
				}
				if (lastLoadedWaIdRef.current === waId) {
					return
				}

				// Load document via WebSocket
				await DocumentLoadService.load({
					waId,
					pollIntervalMs,
				})
			} catch (_error) {
				if (!cancelled) {
					// Error handled at higher level
					startTransition(() => setLoading(false))
				}
			}
		}

		load().catch(() => {
			// Error already handled in load()
		})

		return () => {
			cancelled = true
		}
	}, [enabled, autoLoadOnMount, waId, pollIntervalMs])

	return {
		loading,
		setLoading,
		lastLoadedWaIdRef,
		startTransition,
	} as const
}
