import { createDocumentFromDto } from '../../core/document.factory'
import type { DocumentRepository } from '../../core/document.repository'
import { DocumentAdapter } from '../api/document.adapter'

export class DocumentApiRepository implements DocumentRepository {
	private readonly adapter = DocumentAdapter()

	async getByWaId(waId: string) {
		const resp = await this.adapter.getByWaId(waId)
		return createDocumentFromDto(waId, resp)
	}

	async save(
		waId: string,
		snapshot: Partial<{
			document?: unknown
			name?: string | null
			age?: number | null
		}>
	) {
		const resp = await this.adapter.save(waId, snapshot)
		return Boolean((resp as { success?: unknown })?.success) !== false
	}
}
