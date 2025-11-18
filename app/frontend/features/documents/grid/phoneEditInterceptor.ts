import { GridCellKind } from '@glideapps/glide-data-grid'
import type {
	EditInterceptor,
	EditInterceptorContext,
} from '@shared/libs/data-grid/core/services/runEditPipeline'

export type CustomerLike = {
	id: string
	phone?: string
	name?: string
}

export type PhoneEditDeps = {
	findCustomerByPhone: (phone: string) => CustomerLike | undefined
	dispatch?: (
		type:
			| 'doc:user-select'
			| 'doc:customer-loaded'
			| 'grid:age-request'
			| 'doc:persist'
			| 'doc:notify',
		detail: unknown
	) => void
	documentsMode?: boolean
	onCustomerSelected?: (waId: string) => void
	// Optional: mutation hook for updating name when phone is edited and both exist
	updateNameMutation?: {
		mutate: (params: {
			waId: string
			name: string
			isLocalized?: boolean
		}) => void
	}
	// Optional: current waId to check if we're staying on the same customer
	currentWaId?: string
	// Optional: data source and columns for checking if both name and phone exist
	customerDataSource?: unknown
	customerColumns?: Array<{ id?: string }>
	isLocalized?: boolean
}

const isString = (value: unknown): value is string => typeof value === 'string'

const getColumnId = (
	columns: Array<{ id?: string; name?: string }>,
	index: number
): string | undefined => {
	const col = columns[index]
	if (!col) {
		return
	}
	return col.id ?? col.name ?? undefined
}

const toTextCell = (value: string) => ({
	kind: GridCellKind.Text,
	data: value,
	displayData: value,
	allowOverlay: true,
})

const UNLOCK_VALIDATION_DELAY_MS = 50

export function createPhoneEditInterceptor(
	deps: PhoneEditDeps
): EditInterceptor {
	const {
		findCustomerByPhone,
		dispatch,
		documentsMode,
		onCustomerSelected,
		updateNameMutation,
		currentWaId,
		customerDataSource,
		customerColumns,
		isLocalized,
	} = deps

	return function phoneEditInterceptor(ctx: EditInterceptorContext) {
		try {
			const suppressionCounter = (
				globalThis as {
					__docSuppressPhoneSelect?: number
				}
			).__docSuppressPhoneSelect
			if (typeof suppressionCounter === 'number' && suppressionCounter > 0) {
				return false
			}
		} catch {
			// Ignore suppression lookup failures and continue normally
		}
		const [displayCol, displayRow] = ctx.cell
		const actualRow = ctx.visibleRows?.[displayRow] ?? displayRow
		if (actualRow === undefined) {
			return false
		}

		const displayColumns = Array.isArray(ctx.extras?.displayColumns)
			? (ctx.extras.displayColumns as Array<{ id?: string; name?: string }>)
			: []
		const columnId = getColumnId(displayColumns, displayCol)
		if (columnId !== 'phone') {
			return false
		}

		const phoneCell = ctx.newValue as {
			data?: { kind?: string; value?: string }
		}
		if (phoneCell?.data?.kind !== 'phone-cell') {
			return false
		}

		const rawPhone = phoneCell.data?.value ?? ''
		if (!isString(rawPhone) || rawPhone.trim() === '') {
			return false
		}

		const customer = findCustomerByPhone(rawPhone)
		if (!customer) {
			// For new customers, still trigger unlock validation after a delay
			// This allows the document to unlock once both name and phone are filled
			setTimeout(() => {
				try {
					window.dispatchEvent(
						new CustomEvent('doc:unlock-request', {
							detail: { waId: rawPhone },
						})
					)
				} catch {
					/* noop */
				}
			}, UNLOCK_VALIDATION_DELAY_MS)

			return false
		}

		const dataProvider = ctx.extras?.dataProvider as
			| {
					setCell?: (col: number, row: number, cell: unknown) => void
					getCell?: (col: number, row: number) => unknown
			  }
			| undefined

		const nameDisplayIndex = displayColumns.findIndex((col) => {
			const identifier = col?.id ?? col?.name
			return identifier === 'name'
		})

		if (
			nameDisplayIndex >= 0 &&
			dataProvider &&
			typeof dataProvider.setCell === 'function'
		) {
			const actualNameCol =
				ctx.visibleColumns?.[nameDisplayIndex] ?? nameDisplayIndex
			if (actualNameCol !== undefined) {
				const desiredName = (customer.name ?? '').trim()
				if (desiredName) {
					let shouldUpdate = true
					if (typeof dataProvider.getCell === 'function') {
						try {
							const existing = dataProvider.getCell(
								actualNameCol,
								actualRow
							) as { data?: unknown }
							if (isString(existing?.data)) {
								shouldUpdate = existing.data !== desiredName
							}
						} catch {
							shouldUpdate = true
						}
					}
					if (shouldUpdate) {
						try {
							dataProvider.setCell(
								actualNameCol,
								actualRow,
								toTextCell(desiredName)
							)

							// Force grid to refresh the name cell after programmatic update
							try {
								const gridApi = (
									window as unknown as {
										__docGridApi?: {
											updateCells?: (
												cells: { cell: [number, number] }[]
											) => void
										}
									}
								).__docGridApi
								if (gridApi?.updateCells) {
									gridApi.updateCells([{ cell: [actualNameCol, actualRow] }])
								}
							} catch {
								/* ignore grid update errors */
							}
						} catch {
							/* ignore cell update errors */
						}
					}
				}
			}
		}

		const waId = customer.id || rawPhone

		// Check if we're staying on the same customer (not switching) and both name and phone exist
		// If so, trigger name mutation (phone can't be updated via API)
		if (
			documentsMode &&
			updateNameMutation &&
			customerDataSource &&
			customerColumns &&
			currentWaId &&
			waId === currentWaId // Only trigger if staying on the same customer
		) {
			// Check if both name and phone exist asynchronously
			const nameCol = customerColumns.findIndex((c) => c.id === 'name')
			const phoneCol = customerColumns.findIndex((c) => c.id === 'phone')
			if (nameCol !== -1 && phoneCol !== -1) {
				Promise.all([
					(
						customerDataSource as {
							getCellData?: (col: number, row: number) => Promise<unknown>
						}
					).getCellData?.(nameCol, 0) ?? Promise.resolve(''),
					(
						customerDataSource as {
							getCellData?: (col: number, row: number) => Promise<unknown>
						}
					).getCellData?.(phoneCol, 0) ?? Promise.resolve(''),
				])
					.then(([nameVal, phoneVal]) => {
						const nameOk =
							typeof nameVal === 'string' && nameVal.trim().length > 0
						const phoneOk =
							typeof phoneVal === 'string' && phoneVal.trim().length > 0

						// Only trigger mutation if both name and phone exist
						if (nameOk && phoneOk && typeof nameVal === 'string') {
							updateNameMutation.mutate({
								waId,
								name: nameVal.trim(),
								...(isLocalized !== undefined ? { isLocalized } : {}),
							})
						}
					})
					.catch(() => {
						// Silently ignore errors
					})
			}
		}

		if (dispatch) {
			try {
				dispatch('doc:user-select', { waId })
			} catch {
				/* noop */
			}
			if (documentsMode) {
				try {
					dispatch('doc:notify', { field: 'phone', waId })
				} catch {
					/* noop */
				}
				try {
					dispatch('doc:persist', { field: 'phone', waId })
				} catch {
					/* noop */
				}
				if ((customer.name ?? '').trim()) {
					try {
						dispatch('doc:persist', { field: 'name', waId })
					} catch {
						/* noop */
					}
				}
			}
		}

		// Trigger unlock validation after autofilling name and phone
		// Use setTimeout to ensure grid/provider has fully processed the cell updates
		setTimeout(() => {
			try {
				window.dispatchEvent(
					new CustomEvent('doc:unlock-request', {
						detail: { waId },
					})
				)
			} catch {
				/* noop */
			}
		}, UNLOCK_VALIDATION_DELAY_MS)

		if (documentsMode && typeof onCustomerSelected === 'function') {
			try {
				onCustomerSelected(waId)
			} catch {
				/* noop */
			}
			return true
		}

		return true
	}
}
