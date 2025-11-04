import { type DocumentApiRepository, documentToDto } from '@/entities/document'
import { TEMPLATE_USER_WA_ID } from '@/shared/libs/documents'
import type { DocumentsUseCase } from '../usecase/documents.usecase'

export const DocumentsService = (
	repository: DocumentApiRepository
): DocumentsUseCase => ({
	getByWaId: async (waId: string) => {
		const domain = await repository.getByWaId(waId)
		return documentToDto(domain)
	},

	save: async (
		waId: string,
		snapshot: Partial<{
			name?: string | null
			age?: number | null
			document?: unknown
		}>
	) => await repository.save(waId, snapshot),

	ensureInitialized: async (waId: string) => {
		if (!waId || waId === TEMPLATE_USER_WA_ID) {
			return true
		}
		const existing = await repository.getByWaId(waId)
		const hasElements = Array.isArray(
			(
				existing.snapshot?.document as
					| { elements?: unknown[] }
					| null
					| undefined
			)?.elements
		)
		if (existing.snapshot?.document && hasElements) {
			return true
		}
		const tmpl = await repository.getByWaId(TEMPLATE_USER_WA_ID)
		const tmplDoc = tmpl.snapshot.document as { elements?: unknown[] } | null
		if (
			!(tmplDoc && Array.isArray(tmplDoc.elements)) ||
			tmplDoc.elements.length === 0
		) {
			return false
		}
		return await repository.save(waId, { document: tmplDoc })
	},
})
