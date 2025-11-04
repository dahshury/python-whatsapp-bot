import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'

export type ClearActionParams = {
	customerDataSource: IDataSource
	customerColumns: IColumnDefinition[]
	providerRef: {
		current: {
			setOnCellDataLoaded?: (cb: () => void) => void
		} | null
	}
}

export type ClearActionResult = {
	name: string
	age: number | null
	phone: string
}

/**
 * Service for clearing customer row data and resetting document state.
 * Handles grid data clearing and provider state management.
 */
export const ClearActionService = {
	/**
	 * Clears customer row data (name, age, phone).
	 * @param params - Clear action parameters
	 * @returns Cleared values
	 */
	async clearRow(params: ClearActionParams): Promise<ClearActionResult> {
		const { customerDataSource, customerColumns, providerRef } = params

		const nameCol = customerColumns.findIndex((c) => c.id === 'name')
		const ageCol = customerColumns.findIndex((c) => c.id === 'age')
		const phoneCol = customerColumns.findIndex((c) => c.id === 'phone')

		// Clear editing state through provider to ensure grid immediately reflects
		try {
			providerRef.current?.setOnCellDataLoaded?.(() => {
				// Intentionally empty callback to clear editing state
			})
		} catch {
			// Silently fail if provider is not available
		}

		await Promise.all([
			customerDataSource.setCellData(nameCol, 0, ''),
			customerDataSource.setCellData(ageCol, 0, null),
			customerDataSource.setCellData(phoneCol, 0, ''),
		])

		// Set guard to ignore provider-applied loads for the next tick
		const PROVIDER_LOAD_GUARD_DURATION_MS = 500
		const PROVIDER_LOAD_GUARD_CLEANUP_DELAY_MS = 600
		try {
			;(
				globalThis as unknown as { __docIgnoreProviderLoad?: number }
			).__docIgnoreProviderLoad = Date.now() + PROVIDER_LOAD_GUARD_DURATION_MS
			setTimeout(() => {
				try {
					const global = globalThis as unknown as {
						__docIgnoreProviderLoad?: number | undefined
					}
					global.__docIgnoreProviderLoad = undefined
				} catch {
					// Silently fail if cleanup fails
				}
			}, PROVIDER_LOAD_GUARD_CLEANUP_DELAY_MS)
		} catch {
			// Silently fail if guard setup fails
		}

		return {
			name: '',
			age: null,
			phone: '',
		}
	},
}
