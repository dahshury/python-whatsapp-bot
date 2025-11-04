import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import { createDocumentsService } from './documents.service.factory'

/**
 * Options for loading a document.
 */
export type DocumentLoadOptions = {
	waId: string
	pollIntervalMs?: number
	ignoreChangesDelayMs?: number
}

/**
 * Service for handling document loading operations.
 * Uses REST API to fetch documents instead of WebSocket.
 *
 * @example
 * ```typescript
 * await DocumentLoadService.load({ waId: 'user123' })
 * ```
 */
export const DocumentLoadService = {
	/**
	 * Loads a document by WhatsApp ID using REST API.
	 * Waits for any in-flight REST operations before requesting the document.
	 *
	 * @param options - Load options including waId and polling settings
	 * @throws Error if document load fails
	 */
	async load(options: DocumentLoadOptions): Promise<void> {
		const { waId, pollIntervalMs = 50 } = options

		if (waId === DEFAULT_DOCUMENT_WA_ID) {
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
		}

		// Fetch document via REST API
		const svc = createDocumentsService()
		const result = await svc.getByWaId(waId)

		// Dispatch document update event with fetched data
		if (result?.document) {
			window.dispatchEvent(
				new CustomEvent('documents:external-update', {
					detail: {
						wa_id: waId,
						document: result.document,
					},
				})
			)
		}
	},

	/**
	 * Checks if a document load should be skipped.
	 * Documents with DEFAULT_DOCUMENT_WA_ID or already loaded documents are skipped.
	 *
	 * @param waId - WhatsApp ID to check
	 * @param lastLoadedWaId - Last loaded WhatsApp ID for comparison
	 * @returns true if load should be skipped
	 */
	shouldSkipLoad(waId: string, lastLoadedWaId: string | null): boolean {
		return waId === DEFAULT_DOCUMENT_WA_ID || lastLoadedWaId === waId
	},
}
