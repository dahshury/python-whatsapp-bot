import { ValueObject } from '@/shared/domain'
import type { ColumnConfig } from '../types/app-config.types'

const DATA_TYPES = new Set([
	'text',
	'number',
	'datetime',
	'phone',
	'dropdown',
	'date',
	'time',
])

const normalizeDataType = (type: string) => type?.trim().toLowerCase() ?? 'text'

export class ColumnConfigVO extends ValueObject<ColumnConfig> {
	constructor(value: ColumnConfig) {
		super({
			...value,
			id: value.id.trim(),
			name: value.name.trim(),
			title: value.title.trim(),
			dataType: normalizeDataType(value.dataType),
		})
	}

	protected validate(value: ColumnConfig): void {
		if (!value.id) {
			throw new Error('Column id is required')
		}
		if (!value.name) {
			throw new Error('Column name is required')
		}
		if (!value.title) {
			throw new Error('Column title is required')
		}
		if (!DATA_TYPES.has(value.dataType)) {
			throw new Error(`Unsupported column data type: ${value.dataType}`)
		}
		if (
			value.width !== undefined &&
			value.width !== null &&
			(!Number.isInteger(value.width) || value.width <= 0)
		) {
			throw new Error('Column width must be a positive integer when provided')
		}
	}
}
