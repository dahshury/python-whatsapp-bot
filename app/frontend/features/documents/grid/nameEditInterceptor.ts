import {
	type CustomCell,
	type EditableGridCell,
	GridCellKind,
} from '@glideapps/glide-data-grid'
import type {
	EditInterceptor,
	EditInterceptorContext,
} from '@shared/libs/data-grid/core/services/runEditPipeline'
import type { IColumnDefinition, IDataSource } from '@/shared/libs/data-grid'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import type { useUpdateCustomerName } from '../hooks/useUpdateCustomerName'

export type NameEditDeps = {
	waId: string
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
	isLocalized?: boolean
	updateNameMutation: ReturnType<typeof useUpdateCustomerName>
}

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

/**
 * Checks if the customer data source has BOTH name AND phone (not cleared state).
 * Both must exist for the mutation to trigger.
 */
async function hasNameAndPhone(
	customerDataSource: IDataSource,
	customerColumns: IColumnDefinition[]
): Promise<boolean> {
	const nameCol = customerColumns.findIndex((c) => c.id === 'name')
	const phoneCol = customerColumns.findIndex((c) => c.id === 'phone')

	if (nameCol === -1 || phoneCol === -1) {
		return false
	}

	const [nameVal, phoneVal] = await Promise.all([
		customerDataSource.getCellData(nameCol, 0),
		customerDataSource.getCellData(phoneCol, 0),
	])

	const nameOk = typeof nameVal === 'string' && nameVal.trim().length > 0
	const phoneOk = typeof phoneVal === 'string' && phoneVal.trim().length > 0

	return nameOk && phoneOk
}

export function createNameEditInterceptor(deps: NameEditDeps): EditInterceptor {
	const {
		waId,
		customerDataSource,
		customerColumns,
		isLocalized,
		updateNameMutation,
	} = deps

	return function nameEditInterceptor(ctx: EditInterceptorContext) {
		// Only handle name column edits
		const displayColumns = Array.isArray(ctx.extras?.displayColumns)
			? (ctx.extras.displayColumns as Array<{ id?: string; name?: string }>)
			: []
		const columnId = getColumnId(displayColumns, ctx.cell[0])
		if (columnId !== 'name') {
			return false
		}

		// Skip if no customer selected or default document
		if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
			return false
		}

		// Skip if no data source
		if (!customerDataSource) {
			return false
		}

		const nameCell = ctx.newValue
		const nameValue = extractNameValue(nameCell).trim()

		// Don't proceed if name is empty
		if (!nameValue) {
			return false
		}

		// Check if we have BOTH name AND phone (not cleared state)
		// Trigger mutation asynchronously without blocking the normal edit path
		hasNameAndPhone(customerDataSource, customerColumns)
			.then((hasBoth) => {
				if (!hasBoth) {
					return
				}

				// Trigger mutation to update name
				updateNameMutation.mutate({
					waId,
					name: nameValue,
					...(isLocalized !== undefined ? { isLocalized } : {}),
				})
			})
			.catch(() => {
				// Silently ignore errors - let default edit path handle it
			})

		// Return false to let the normal edit path handle updating the grid cell
		// This ensures the grid cell is updated immediately with the new name value
		return false
	}
}

const coerceToNonEmptyString = (value: unknown): string => {
	if (typeof value === 'string') {
		return value
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}
	return ''
}

const extractNameValue = (cell: EditableGridCell): string => {
	if (cell.kind === GridCellKind.Text) {
		return coerceToNonEmptyString(cell.data)
	}

	if (cell.kind === GridCellKind.Custom) {
		const customData = (cell as CustomCell<Record<string, unknown>>).data
		if (customData && typeof customData === 'object') {
			const maybe =
				(customData as { value?: unknown }).value ??
				(customData as { display?: unknown }).display ??
				(customData as { label?: unknown }).label
			const resolved = coerceToNonEmptyString(maybe)
			if (resolved) {
				return resolved
			}
		}
		return coerceToNonEmptyString(customData)
	}

	return coerceToNonEmptyString((cell as { data?: unknown }).data)
}
