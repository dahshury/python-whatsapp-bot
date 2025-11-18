import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from '@glideapps/glide-data-grid'
import type { TimekeeperCell } from '../../models/TimekeeperCellTypes'
import { FormattingService } from '../../services/FormattingService'
import { messages } from '../../utils/i18n'
import type { IColumnType, IRowContext } from '../interfaces/IColumnType'
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from '../interfaces/IDataSource'

const TIME_REGEX_24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/
const TIME_REGEX_12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i

export class TimeColumnType implements IColumnType {
	id = 'time'
	dataType = ColumnDataType.TIME

	createCell(options: {
		value: unknown
		column: IColumnDefinition
		theme: Partial<Theme>
		isDarkTheme: boolean
		rowContext?: IRowContext
	}): GridCell {
		const { value, column, theme: _theme, isDarkTheme, rowContext } = options
		const time = this.parseValue(value, column)
		const displayTime = this.formatValue(time, column.formatting)

		// Get the date from the first available date column for time restrictions
		let selectedDate: Date | undefined
		if (rowContext?.getRowCellData) {
			try {
				// Look for date columns in the row (typically index 3, but check multiple)
				const PRIMARY_DATE_COLUMN_INDEX = 3
				const SECONDARY_DATE_COLUMN_INDEX_0 = 0
				const SECONDARY_DATE_COLUMN_INDEX_1 = 1
				const SECONDARY_DATE_COLUMN_INDEX_2 = 2
				const SECONDARY_DATE_COLUMN_INDEX_4 = 4
				const SECONDARY_DATE_COLUMN_INDEX_5 = 5
				const DATE_COLUMN_INDICES = [
					PRIMARY_DATE_COLUMN_INDEX,
					SECONDARY_DATE_COLUMN_INDEX_0,
					SECONDARY_DATE_COLUMN_INDEX_1,
					SECONDARY_DATE_COLUMN_INDEX_2,
					SECONDARY_DATE_COLUMN_INDEX_4,
					SECONDARY_DATE_COLUMN_INDEX_5,
				] as const
				const EPOCH_YEAR = 1970
				for (const dateColIndex of DATE_COLUMN_INDICES) {
					const columnData = rowContext.getRowCellData(dateColIndex)
					if (
						columnData instanceof Date &&
						columnData.getFullYear() > EPOCH_YEAR
					) {
						selectedDate = columnData
						break
					}
				}
			} catch {
				// Column data retrieval failed; continue without selected date
			}
		}

		const cell = {
			kind: GridCellKind.Custom,
			data: {
				kind: 'timekeeper-cell',
				time,
				displayTime,
				isDarkTheme,
				use24Hour: column.metadata?.use24Hour,
				selectedDate,
			},
			copyData: displayTime,
			allowOverlay: true,
		} as TimekeeperCell

		// Validate and store error details
		const validation = this.validateValue(time, column)
		if (!validation.isValid) {
			;(
				cell as { isMissingValue?: boolean; validationError?: string }
			).isMissingValue = true
			;(
				cell as { isMissingValue?: boolean; validationError?: string }
			).validationError = validation.error || ''
		}

		return cell
	}

	getCellValue(cell: GridCell): unknown {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as { data?: { kind?: string } }).data?.kind === 'timekeeper-cell'
		) {
			return (cell as { data?: { time?: unknown } }).data?.time
		}
		return null
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		if (column.isRequired && !value) {
			return {
				isValid: false,
				error: messages.validation.required(
					column.title || column.name || 'Time'
				),
			}
		}

		if (
			value &&
			!(value instanceof Date) &&
			!this.isValidTimeString(String(value))
		) {
			return { isValid: false, error: messages.validation.invalidTime() }
		}

		return { isValid: true }
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (!value) {
			return ''
		}

		const date =
			value instanceof Date ? value : this.parseTimeString(String(value))
		if (!date || Number.isNaN(date.getTime())) {
			return ''
		}

		if (formatting?.type) {
			return FormattingService.formatValue(date, 'time', formatting.type)
		}

		if (formatting?.pattern) {
			return FormattingService.formatValue(date, 'time', formatting.pattern)
		}

		// Default formatting based on use24Hour
		const use24Hour = formatting?.options?.hour12 === false
		const hours = date.getHours()
		const minutes = date.getMinutes()
		const MINUTES_PADDING_LENGTH = 2
		const minutesStr = minutes.toString().padStart(MINUTES_PADDING_LENGTH, '0')

		if (use24Hour) {
			return `${hours.toString().padStart(MINUTES_PADDING_LENGTH, '0')}:${minutesStr}`
		}
		const NOON_HOUR = 12
		const MIDNIGHT_HOUR = 0
		const HOURS_IN_HALF_DAY = 12
		const isPM = hours >= NOON_HOUR
		let displayHours: number
		if (hours === MIDNIGHT_HOUR) {
			displayHours = NOON_HOUR
		} else if (hours > NOON_HOUR) {
			displayHours = hours - HOURS_IN_HALF_DAY
		} else {
			displayHours = hours
		}
		return `${displayHours}:${minutesStr}${isPM ? 'pm' : 'am'}`
	}

	parseValue(input: unknown, _column: IColumnDefinition): unknown {
		if (!input) {
			return null
		}
		if (input instanceof Date) {
			return input
		}

		return this.parseTimeString(String(input))
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		if (column.defaultValue === 'now') {
			return new Date()
		}
		return column.defaultValue
			? this.parseTimeString(String(column.defaultValue))
			: null
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

	private isValidTimeString(value: string): boolean {
		// Support both 24-hour and 12-hour formats
		return TIME_REGEX_24.test(value) || TIME_REGEX_12.test(value)
	}

	private parseTimeString(value: string): Date | null {
		const EPOCH_YEAR = 1970
		const EPOCH_MONTH = 0
		const EPOCH_DAY = 1
		const date = new Date(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY)

		// Try 24-hour format first
		const match24 = value.match(TIME_REGEX_24)
		if (match24?.[1] && match24[2]) {
			date.setHours(Number.parseInt(match24[1], 10))
			date.setMinutes(Number.parseInt(match24[2], 10))
			if (match24[4]) {
				date.setSeconds(Number.parseInt(match24[4], 10))
			}
			return date
		}

		// Try 12-hour format
		const match12 = value.match(TIME_REGEX_12)
		if (match12?.[1] && match12[2] && match12[3]) {
			const NOON_HOUR = 12
			const MIDNIGHT_HOUR = 0
			const HOURS_IN_HALF_DAY = 12
			let hours = Number.parseInt(match12[1], 10)
			const minutes = Number.parseInt(match12[2], 10)
			const isPM = match12[3].toLowerCase() === 'pm'

			if (hours === NOON_HOUR && !isPM) {
				hours = MIDNIGHT_HOUR // 12am is 0 hours
			} else if (hours !== NOON_HOUR && isPM) {
				hours += HOURS_IN_HALF_DAY // Convert PM hours
			}

			date.setHours(hours)
			date.setMinutes(minutes)
			return date
		}

		return null
	}
}
