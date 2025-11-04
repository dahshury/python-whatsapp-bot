import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'

export type UnlockValidationParams = {
	waId: string
	customerDataSource: IDataSource
	customerColumns: IColumnDefinition[]
}

export type UnlockValidationResult = {
	shouldUnlock: boolean
	nameOk: boolean
	phoneOk: boolean
	waIdOk: boolean
}

/**
 * Service for validating document unlock conditions.
 * Requires non-empty valid name and phone (age optional).
 *
 * Business rules:
 * - nameOk: name must be a non-empty string after trimming
 * - phoneOk: phone must be a string starting with '+'
 * - waIdOk: waId must exist and not be the default document ID
 * - shouldUnlock: all three conditions must be true
 */
export const UnlockValidationService = {
	/**
	 * Validates unlock conditions for a document.
	 * @param params - Validation parameters
	 * @returns Validation result
	 */
	async validate(
		params: UnlockValidationParams
	): Promise<UnlockValidationResult> {
		const { waId, customerDataSource, customerColumns } = params

		// Skip check if no customer selected (blank document)
		if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
			return {
				shouldUnlock: false,
				nameOk: false,
				phoneOk: false,
				waIdOk: false,
			}
		}

		// Find columns by id
		const nameCol = customerColumns.findIndex((c) => c.id === 'name')
		const phoneCol = customerColumns.findIndex((c) => c.id === 'phone')

		const [nameVal, phoneVal] = await Promise.all([
			customerDataSource.getCellData(nameCol, 0),
			customerDataSource.getCellData(phoneCol, 0),
		])

		const nameOk = typeof nameVal === 'string' && nameVal.trim().length > 0
		const phoneOk =
			typeof phoneVal === 'string' && phoneVal.trim().startsWith('+')
		const waIdOk = Boolean(waId && waId !== DEFAULT_DOCUMENT_WA_ID)
		const shouldUnlock = Boolean(nameOk && phoneOk && waIdOk)

		return {
			shouldUnlock,
			nameOk,
			phoneOk,
			waIdOk,
		}
	},
}
