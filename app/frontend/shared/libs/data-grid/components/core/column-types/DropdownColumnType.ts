import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from '@glideapps/glide-data-grid'
import { messages } from '../../utils/i18n'
import type { IColumnType } from '../interfaces/IColumnType'
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from '../interfaces/IDataSource'

export class DropdownColumnType implements IColumnType {
	id = 'dropdown'
	dataType = ColumnDataType.DROPDOWN

	createCell(cellOptions: {
		value: unknown
		column: IColumnDefinition
		theme: Partial<Theme>
		isDarkTheme: boolean
		rowContext?: unknown
	}): GridCell {
		const {
			value,
			column,
			theme: _theme,
			isDarkTheme: _isDarkTheme,
			rowContext: _rowContext,
		} = cellOptions
		const dropdownOptions = (
			Array.isArray(column.metadata?.options)
				? (column.metadata?.options as unknown[])
				: []
		).map((v) => String(v))
		const selectedValue = String(value ?? column.defaultValue ?? '')

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: 'dropdown-cell',
				allowedValues: dropdownOptions,
				value: selectedValue,
			},
			copyData: selectedValue,
			allowOverlay: true,
		} as GridCell

		// Validate and store error details
		const validation = this.validateValue(selectedValue, column)
		if (!validation.isValid) {
			;(cell as { isMissingValue?: boolean }).isMissingValue = true
			;(cell as { validationError?: string }).validationError =
				validation.error || ''
		}

		return cell
	}

	getCellValue(cell: GridCell): unknown {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as { data?: { kind?: string; value?: unknown } }).data?.kind ===
				'dropdown-cell'
		) {
			return (cell as { data?: { kind?: string; value?: unknown } }).data?.value
		}
		return ''
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || 'Selection'
				),
			}
		}

		const options = (
			Array.isArray(column.metadata?.options)
				? (column.metadata?.options as unknown[])
				: []
		) as unknown[]
		if (value && !options.map((v) => String(v)).includes(String(value))) {
			return { isValid: false, error: messages.validation.invalidFormat() }
		}

		return { isValid: true }
	}

	formatValue(value: unknown, _formatting?: IColumnFormatting): string {
		return String(value || '')
	}

	parseValue(input: string, _column: IColumnDefinition): unknown {
		return input
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		return column.defaultValue || ''
	}

	canEdit(column: IColumnDefinition): boolean {
		return column.isEditable !== false
	}

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition
	): EditableGridCell {
		return cell as EditableGridCell
	}
}
