import {
	type DocumentApiRepository,
	type DocumentDto,
	documentToDto,
} from '@/entities/document'
import { TEMPLATE_USER_WA_ID } from '@/shared/libs/documents'
import type {
	DocumentsUseCase,
	EnsureInitializedResult,
} from '../usecase/documents.usecase'
import { hasDocumentContent } from '../utils/documentContent'

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

	ensureInitialized: async (waId: string): Promise<EnsureInitializedResult> => {
		if (!waId) {
			return { success: false, modified: false, document: null }
		}

		let existingDto: DocumentDto | null = null

		// Special handling for template user - ensure it exists with proper name
		if (waId === TEMPLATE_USER_WA_ID) {
			try {
				const existing = await repository.getByWaId(TEMPLATE_USER_WA_ID)
				existingDto = documentToDto(existing)
				// If template exists, ensure it has the correct name
				const needsNameUpdate =
					!existing.snapshot?.name ||
					existing.snapshot.name !== 'Default document'

				if (needsNameUpdate) {
					const updated = await repository.save(TEMPLATE_USER_WA_ID, {
						name: 'Default document',
						age: null,
					})
					return {
						success: updated,
						modified: updated,
						document: existingDto,
					}
				}

				return { success: true, modified: false, document: existingDto }
			} catch {
				// Template doesn't exist, create it with empty document and proper name
				const created = await repository.save(TEMPLATE_USER_WA_ID, {
					name: 'Default document',
					age: null,
					document: {
						type: 'tldraw',
						snapshot: {
							document: {},
						},
					},
				})
				return {
					success: created,
					modified: created,
					document: {
						name: 'Default document',
						age: null,
						document: {
							type: 'tldraw',
							snapshot: {
								document: {},
							},
						},
					},
				}
			}
		}

		// Regular user initialization - copy from template if needed
		try {
			const existing = await repository.getByWaId(waId)
			existingDto = documentToDto(existing)

			// Check if user already has a document with content
			if (existingDto.document) {
				const doc = existingDto.document

				// Check if it has content using the same logic as useDefaultDocumentCopy
				if (hasDocumentContent(doc)) {
					return {
						success: true,
						modified: false,
						document: existingDto,
					} // Document already has content, don't overwrite
				}
			}
		} catch {
			// If fetching existing doc fails, treat as needing initialization
		}

		// Document is empty or doesn't exist, copy from template
		try {
			const tmpl = await repository.getByWaId(TEMPLATE_USER_WA_ID)
			const tmplDto = documentToDto(tmpl)
			const tmplDoc = tmplDto.document

			// Verify template has content before copying
			if (!(tmplDoc && hasDocumentContent(tmplDoc))) {
				return {
					success: false,
					modified: false,
					document: existingDto,
				} // Template is empty, can't copy
			}

			const saved = await repository.save(waId, { document: tmplDoc })
			return {
				success: saved,
				modified: saved,
				document: {
					name: existingDto?.name ?? null,
					age: existingDto?.age ?? null,
					document: tmplDoc,
				},
			}
		} catch {
			return { success: false, modified: false, document: existingDto }
		}
	},
})
