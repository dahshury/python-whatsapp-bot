import { useQuery } from '@tanstack/react-query'
import { DOCUMENT_QUERY_KEY } from '@/entities/document'
import { createDocumentsService } from '../services/documents.service.factory'
import { normalizeDocumentSnapshot } from '../utils/documentContent'

type UseDocumentCanvasOptions = {
	enabled?: boolean
}

/**
 * Hook for fetching document canvas data for TLDraw viewer
 * Returns snapshot and camera positions separately
 * Uses TanStack Query for caching and state management
 */
export function useDocumentCanvas(
	waId: string | null | undefined,
	options?: UseDocumentCanvasOptions
) {
	const documentsService = createDocumentsService()
	const normalizedWaId = waId?.trim() ?? ''
	const enabled =
		Boolean(normalizedWaId) &&
		(options?.enabled === undefined ? true : options.enabled)

	return useQuery({
		queryKey: [...DOCUMENT_QUERY_KEY.byWaId(normalizedWaId), 'canvas'],
		queryFn: async () => {
			if (!normalizedWaId) {
				return {
					snapshot: null,
					editorCamera: null,
					viewerCamera: null,
					editorPageId: null,
				}
			}

			// Ensure the document exists (copies default template when needed)
			const ensureResult =
				await documentsService.ensureInitialized(normalizedWaId)
			const ensuredDocument = ensureResult?.document ?? null

			// Prefer the document returned from ensureInitialized to avoid duplicate fetches
			let rawDocument = ensuredDocument?.document ?? null
			if (!rawDocument) {
				const response = await documentsService.getByWaId(normalizedWaId)
				rawDocument = response?.document ?? null
			}

			// Extract snapshot and cameras separately
			const doc = rawDocument as {
				type?: string
				snapshot?: unknown
				editorCamera?: { x: number; y: number; z: number }
				viewerCamera?: { x: number; y: number; z: number }
				editorPageId?: string
			} | null

			const result = {
				snapshot: normalizeDocumentSnapshot(rawDocument),
				editorCamera: doc?.editorCamera ?? null,
				viewerCamera: doc?.viewerCamera ?? null,
				editorPageId: doc?.editorPageId ?? null,
			}

			return result
		},
		enabled,
		staleTime: 0, // Always treat cached data as stale to force fresh fetches
		gcTime: 300_000, // Keep in cache for 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: 'always',
		retry: 1,
	})
}
