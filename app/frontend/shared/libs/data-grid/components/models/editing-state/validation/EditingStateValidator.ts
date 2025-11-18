import type { GridCell } from '@glideapps/glide-data-grid'

import type { IColumnDefinition } from '../../../core/interfaces/IDataSource'
import type { ColumnTypeRegistry } from '../../../core/services/ColumnTypeRegistry'
import type { BaseColumnProps } from '../../../core/types'
import { messages } from '../../../utils/i18n'
import type { EditingStateStore } from '../core/EditingStateStore'

type ValidatorDeps = {
	store: EditingStateStore
	columnDefinitions: Map<number, IColumnDefinition>
	columnTypeRegistry: ColumnTypeRegistry
	getCellValue: (cell: GridCell, column: BaseColumnProps) => unknown
}

export class EditingStateValidator {
	private readonly store: EditingStateStore
	private readonly columnDefinitions: Map<number, IColumnDefinition>
	private readonly columnTypeRegistry: ColumnTypeRegistry
	private readonly getCellValue: (
		cell: GridCell,
		column: BaseColumnProps
	) => unknown

	constructor(deps: ValidatorDeps) {
		this.store = deps.store
		this.columnDefinitions = deps.columnDefinitions
		this.columnTypeRegistry = deps.columnTypeRegistry
		this.getCellValue = deps.getCellValue
	}

	validate(columns: BaseColumnProps[]): {
		isValid: boolean
		errors: Array<{ row: number; col: number; message: string }>
	} {
		const errors: Array<{ row: number; col: number; message: string }> = []
		const columnsByIndex = new Map<number, BaseColumnProps>()
		for (const column of columns) {
			columnsByIndex.set(column.indexNumber, column)
		}

		for (const [rowIndex, row] of this.store.editedRowEntries()) {
			for (const [colIndex, cell] of row.entries()) {
				const column = columnsByIndex.get(colIndex)
				const colDef = this.columnDefinitions.get(colIndex)

				if (!(column && colDef)) {
					continue
				}

				const cellWithValidation = cell as GridCell & {
					isMissingValue?: boolean
					validationError?: string | undefined
				}

				if (cellWithValidation.isMissingValue === true) {
					errors.push({
						row: rowIndex,
						col: colIndex,
						message:
							cellWithValidation.validationError ||
							messages.validation.required(
								column.title || column.name || 'Field'
							),
					})
					continue
				}

				const cellValue = this.getCellValue(cell, column)

				if (
					colDef.isRequired &&
					colDef.isEditable !== false &&
					(cellValue === null ||
						cellValue === undefined ||
						cellValue === '' ||
						(typeof cellValue === 'string' && cellValue.trim() === ''))
				) {
					errors.push({
						row: rowIndex,
						col: colIndex,
						message: messages.validation.required(
							column.title || column.name || 'Field'
						),
					})
					continue
				}

				const columnType = this.columnTypeRegistry.get(colDef.dataType)
				if (columnType?.validateValue) {
					const validation = columnType.validateValue(cellValue, colDef)

					if (!validation.isValid) {
						errors.push({
							row: rowIndex,
							col: colIndex,
							message: validation.error || 'Invalid value',
						})
					}
				}
			}
		}

		const baseRowCount = this.store.getBaseRowCount()
		for (const [addedRowIndex, row] of this.store.getAddedRows().entries()) {
			const rowIndex = baseRowCount + addedRowIndex

			for (const [colIndex, cell] of row.entries()) {
				const column = columnsByIndex.get(colIndex)
				const colDef = this.columnDefinitions.get(colIndex)

				if (!(column && colDef)) {
					continue
				}

				const cellWithValidation = cell as GridCell & {
					isMissingValue?: boolean
					validationError?: string | undefined
				}

				if (cellWithValidation.isMissingValue === true) {
					errors.push({
						row: rowIndex,
						col: colIndex,
						message:
							cellWithValidation.validationError ||
							messages.validation.required(
								column.title || column.name || 'Field'
							),
					})
					continue
				}

				const cellValue = this.getCellValue(cell, column)

				if (
					colDef.isRequired &&
					colDef.isEditable !== false &&
					(cellValue === null ||
						cellValue === undefined ||
						cellValue === '' ||
						(typeof cellValue === 'string' && cellValue.trim() === ''))
				) {
					errors.push({
						row: rowIndex,
						col: colIndex,
						message: messages.validation.required(
							column.title || column.name || 'Field'
						),
					})
					continue
				}

				const columnType = this.columnTypeRegistry.get(colDef.dataType)
				if (columnType?.validateValue) {
					const validation = columnType.validateValue(cellValue, colDef)
					if (!validation.isValid) {
						errors.push({
							row: rowIndex,
							col: colIndex,
							message: validation.error || 'Invalid value',
						})
					}
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	}
}
