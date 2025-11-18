import { BaseError } from '@/shared/libs/errors/base-error'
import { DocumentTitle } from '../value-objects/document-title.vo'
import type { DocumentSnapshot } from './document.domain'
import { DocumentDomain } from './document.domain'

export function createNewDocument(
	waId: string,
	snapshot: DocumentSnapshot = {}
): DocumentDomain {
	if (!waId?.trim()) {
		throw BaseError.validation('WhatsApp ID is required to create a document')
	}
	// Validate name through VO if provided
	if (snapshot.name != null) {
		new DocumentTitle(String(snapshot.name))
	}
	return new DocumentDomain(waId, {
		...snapshot,
		updatedAt: snapshot.updatedAt ?? Date.now(),
	})
}

export function createEmptyDocument(waId: string): DocumentDomain {
	if (!waId?.trim()) {
		throw BaseError.validation('WhatsApp ID is required to create a document')
	}
	return new DocumentDomain(waId, {
		name: null,
		age: null,
		document: undefined,
		updatedAt: Date.now(),
	})
}

export function createDocumentFromDto(
	waId: string,
	dto: unknown
): DocumentDomain {
	if (!waId?.trim()) {
		throw BaseError.validation('WhatsApp ID is required')
	}

	const data = dto as {
		data?: { document?: unknown; name?: string | null; age?: number | null }
	}
	const snapshot: DocumentSnapshot = data?.data
		? {
				name: data.data.name ?? null,
				age: data.data.age ?? null,
				document: data.data.document,
				updatedAt: Date.now(),
			}
		: {
				name: null,
				age: null,
				document: undefined,
				updatedAt: Date.now(),
			}
	return new DocumentDomain(waId, snapshot)
}
