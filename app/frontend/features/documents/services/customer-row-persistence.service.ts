import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import { i18n } from '@/shared/libs/i18n'
import { toastService } from '@/shared/libs/toast'
import type { DocumentsUseCase } from '../usecase/documents.usecase'

export type CustomerRowPersistenceParams = {
	waId: string
	customerDataSource: IDataSource
	customerColumns: IColumnDefinition[]
	documentsService: DocumentsUseCase
	isLocalized: boolean
	triggeredBy?: 'name' | 'age' | 'phone' | undefined
	prevByWa: Map<string, { name: string; age: number | null }>
	currentInFlight: {
		waId: string
		name: string
		age: number | null
	} | null
}

export type CustomerRowPersistenceState = {
	prevByWa: Map<string, { name: string; age: number | null }>
	persistInFlight: {
		waId: string
		name: string
		age: number | null
	} | null
}

/**
 * Service for persisting customer row data (name/age) to the backend.
 * Handles debouncing, change detection, in-flight guards, and toast notifications.
 */
export const CustomerRowPersistenceService = {
	/**
	 * Persists customer row data if changed.
	 * @param params - Persistence parameters
	 * @returns Updated state after persistence
	 */
	async persistRow(
		params: CustomerRowPersistenceParams
	): Promise<CustomerRowPersistenceState> {
		const {
			waId,
			customerDataSource,
			customerColumns,
			documentsService,
			isLocalized,
			triggeredBy,
			prevByWa,
			currentInFlight,
		} = params

		// Skip if default document
		if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
			return {
				prevByWa,
				persistInFlight: currentInFlight,
			}
		}

		const nameCol = customerColumns.findIndex((c) => c.id === 'name')
		const ageCol = customerColumns.findIndex((c) => c.id === 'age')
		const [nameVal, ageVal] = await Promise.all([
			customerDataSource.getCellData(nameCol, 0),
			customerDataSource.getCellData(ageCol, 0),
		])
		const name = (nameVal as string) || ''
		const age = (ageVal as number | null) ?? null

		// If this was a phone-only edit, show a notification but avoid PUT (API doesn't accept phone here)
		if (triggeredBy === 'phone') {
			toastService.success(i18n.getMessage('saved', isLocalized))
			return {
				prevByWa,
				persistInFlight: currentInFlight,
			}
		}

		const prev = prevByWa.get(waId)
		const changed = !prev || prev.name !== name || prev.age !== age

		if (!changed) {
			// Nothing changed; still show a small success if user committed
			toastService.success(
				triggeredBy === 'age'
					? i18n.getMessage('age_recorded', isLocalized)
					: i18n.getMessage('saved', isLocalized)
			)
			return {
				prevByWa,
				persistInFlight: currentInFlight,
			}
		}

		// In-flight guard: prevent duplicate PUTs for identical payload
		const currentSig = { waId, name, age } as const
		const inflight = currentInFlight
		if (
			inflight &&
			inflight.waId === currentSig.waId &&
			inflight.name === currentSig.name &&
			inflight.age === currentSig.age
		) {
			return {
				prevByWa,
				persistInFlight: currentInFlight,
			}
		}

		// Update state map
		const updatedPrevByWa = new Map(prevByWa)

		// Save with toast promise
		await toastService.promise(documentsService.save(waId, { name, age }), {
			loading: i18n.getMessage('saving', isLocalized),
			success: () =>
				i18n.getMessage(
					triggeredBy === 'age' ? 'age_recorded' : 'saved',
					isLocalized
				),
			error: () => i18n.getMessage('save_failed', isLocalized),
		})

		// Update last persisted snapshot
		updatedPrevByWa.set(waId, { name, age })

		return {
			prevByWa: updatedPrevByWa,
			persistInFlight: null,
		}
	},
}
