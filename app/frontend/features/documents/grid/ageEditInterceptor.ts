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
import type { AgeWheelCell } from '@/shared/libs/data-grid/components/AgeWheelCell'
import { DEFAULT_DOCUMENT_WA_ID } from '@/shared/libs/documents'
import type { useUpdateCustomerAge } from '../hooks/useUpdateCustomerAge'
import { MAX_AGE } from '../model/age-validation.constants'

export type AgeEditDeps = {
	waId: string
	customerDataSource: IDataSource | null
	customerColumns: IColumnDefinition[]
	isLocalized?: boolean
	updateAgeMutation: ReturnType<typeof useUpdateCustomerAge>
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

const isAgeWheelCell = (cell: EditableGridCell): cell is AgeWheelCell =>
	cell.kind === GridCellKind.Custom &&
	typeof (cell as { data?: unknown }).data === 'object' &&
	(cell as { data?: { kind?: string } }).data?.kind === 'age-wheel-cell'

const coerceToNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed) {
			return null
		}
		const parsed = Number.parseInt(trimmed, 10)
		return Number.isNaN(parsed) ? null : parsed
	}
	return null
}

const extractAgeValue = (cell: EditableGridCell): number | null => {
	switch (cell.kind) {
		case GridCellKind.Number:
			return coerceToNumber(cell.data)
		case GridCellKind.Text:
			return coerceToNumber(cell.data)
		case GridCellKind.Custom: {
			if (isAgeWheelCell(cell)) {
				return cell.data.value ?? null
			}
			const customData = (cell as CustomCell<Record<string, unknown>>).data
			if (customData && typeof customData === 'object') {
				const maybeValue = (customData as { value?: unknown }).value
				const fallback = (customData as { data?: unknown }).data
				return (
					coerceToNumber(maybeValue) ??
					coerceToNumber(fallback) ??
					coerceToNumber(customData)
				)
			}
			return coerceToNumber(customData)
		}
		default:
			return coerceToNumber((cell as { data?: unknown }).data)
	}
}

/**
 * Checks if the customer data source is NOT in a cleared state.
 * A cleared state means name and phone are empty.
 */
async function isNotClearedState(
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

export function createAgeEditInterceptor(deps: AgeEditDeps): EditInterceptor {
	const {
		waId,
		customerDataSource,
		customerColumns,
		isLocalized,
		updateAgeMutation,
	} = deps

	return function ageEditInterceptor(ctx: EditInterceptorContext) {
		// Only handle age column edits
		const displayColumns = Array.isArray(ctx.extras?.displayColumns)
			? (ctx.extras.displayColumns as Array<{ id?: string; name?: string }>)
			: []
		const columnId = getColumnId(displayColumns, ctx.cell[0])
		if (columnId !== 'age') {
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

		// Extract age value from the new cell value
		const ageCell = ctx.newValue
		const ageValue = extractAgeValue(ageCell)

		// Validate age range (0-120)
		if (ageValue !== null && (ageValue < 0 || ageValue > MAX_AGE)) {
			return false
		}

		// Check if we're NOT in a cleared state (name and phone exist)
		// Trigger mutation asynchronously without blocking the normal edit path
		isNotClearedState(customerDataSource, customerColumns)
			.then((notCleared) => {
				if (!notCleared) {
					return
				}

				// Only trigger mutation if we have a valid age value
				if (ageValue !== null && ageValue !== undefined) {
					updateAgeMutation.mutate({
						waId,
						age: ageValue,
						...(isLocalized !== undefined ? { isLocalized } : {}),
					})
				}
			})
			.catch(() => {
				// Silently ignore errors - let default edit path handle it
			})

		// Return false to let the normal edit path handle updating the grid cell
		// This ensures the grid cell is updated immediately with the new age value
		return false
	}
}
