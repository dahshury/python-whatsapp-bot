import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from '@glideapps/glide-data-grid'
import {
	isPossiblePhoneNumber,
	isValidPhoneNumber,
	parsePhoneNumber,
} from 'react-phone-number-input'

// Temporarily comment out libphonenumber-js imports until package is properly installed
// import {
// 	validatePhoneNumberLength,
// 	type ValidatePhoneNumberLengthResult,
// } from "libphonenumber-js";

// Use a simple fallback for now
const validatePhoneNumberLength = (
	phoneNumber: string
): ValidatePhoneNumberLengthResult => {
	// Basic length validation as fallback
	const digitsOnly = phoneNumber.replace(/\D/g, '')
	const MIN_PHONE_DIGITS = 7
	const MAX_PHONE_DIGITS = 15
	if (digitsOnly.length < MIN_PHONE_DIGITS) {
		return 'TOO_SHORT'
	}
	if (digitsOnly.length > MAX_PHONE_DIGITS) {
		return 'TOO_LONG'
	}
	return { isValid: true }
}

type ValidatePhoneNumberLengthResult =
	| 'INVALID_COUNTRY'
	| 'NOT_A_NUMBER'
	| 'TOO_SHORT'
	| 'TOO_LONG'
	| 'INVALID_LENGTH'
	| { isValid: true }

import { createElement } from 'react'
import { PhoneCellEditor } from '../../ui/PhoneCellEditor'
import { messages } from '../../utils/i18n'
import type { IColumnType } from '../interfaces/IColumnType'
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from '../interfaces/IDataSource'

// Utility function to convert 00 prefix to + prefix
const convertZeroZeroToPlus = (phoneNumber: string): string => {
	if (phoneNumber.startsWith('00')) {
		return `+${phoneNumber.substring(2)}`
	}
	return phoneNumber
}

// Map specific validation results to user-friendly error messages
const getPhoneValidationErrorMessage = (result: string): string => {
	switch (result) {
		case 'INVALID_COUNTRY':
			return messages.validation.phoneHasInvalidCountryCode()
		case 'NOT_A_NUMBER':
			return messages.validation.phoneContainsInvalidCharacters()
		case 'TOO_SHORT':
			return messages.validation.phoneIsTooShort()
		case 'TOO_LONG':
			return messages.validation.phoneIsTooLong()
		case 'INVALID_LENGTH':
			return messages.validation.phoneHasInvalidLengthForCountry()
		default:
			return messages.validation.phoneInvalidFormat()
	}
}

export class PhoneColumnType implements IColumnType {
	id = 'phone'
	dataType = ColumnDataType.PHONE

	createCell(options: {
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
		} = options
		let phoneNumber = this.formatValue(value, column.formatting)

		// Apply validateInput coercion if present
		if (column.validateInput && typeof column.validateInput === 'function') {
			const validateResult = column.validateInput(phoneNumber)
			if (validateResult === false) {
				// Invalid input - mark as error but keep original value
			} else if (typeof validateResult === 'string') {
				// Coerced value - use the cleaned value
				phoneNumber = validateResult
			}
			// If validateResult === true, keep original value
		}

		const cell: GridCell = {
			kind: GridCellKind.Custom,
			data: {
				kind: 'phone-cell',
				value: phoneNumber,
			},
			copyData: phoneNumber,
			allowOverlay: true,
		}

		// Validate and store error details
		const validation = this.validateValue(phoneNumber, column)
		if (!validation.isValid) {
			;(
				cell as { isMissingValue?: boolean; validationError?: string }
			).isMissingValue = true
			if (validation.error !== undefined) {
				;(
					cell as { isMissingValue?: boolean; validationError?: string }
				).validationError = validation.error
			}
		}

		return cell
	}

	getCellValue(cell: GridCell): unknown {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as { data?: { kind?: string; value?: unknown } }).data?.kind ===
				'phone-cell'
		) {
			return (cell as { data?: { kind?: string; value?: unknown } }).data?.value
		}
		return ''
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		let phoneNumber = String(value || '')

		if (column.isRequired && !phoneNumber.trim()) {
			return {
				isValid: false,
				error: messages.validation.thisFieldIsRequired(),
			}
		}

		// Apply validateInput if provided for coercion and early invalid detection
		let validateInputInvalid = false
		if (column.validateInput && typeof column.validateInput === 'function') {
			const validateResult = column.validateInput(phoneNumber)
			if (validateResult === false) {
				// Mark as invalid but keep original text for further validation checks
				validateInputInvalid = true
			} else if (typeof validateResult === 'string') {
				// Use coerced value for subsequent validations
				phoneNumber = validateResult
			}
			// If true, phoneNumber remains as is
		}

		// Use libphonenumber-js for detailed phone number validation
		if (phoneNumber.trim()) {
			// Normalize: allow 00 -> +, otherwise require explicit + country code
			let normalizedNumber = phoneNumber.trim()
			if (normalizedNumber.startsWith('00')) {
				normalizedNumber = convertZeroZeroToPlus(normalizedNumber)
			}
			if (!normalizedNumber.startsWith('+')) {
				return {
					isValid: false,
					error: messages.validation.phoneHasInvalidCountryCode(),
				}
			}

			// Quick invalid characters check before deeper validation
			const invalidChars = normalizedNumber.replace(/[0-9+\s\-()]/g, '')
			if (invalidChars.length > 0) {
				return {
					isValid: false,
					error: messages.validation.phoneContainsInvalidCharacters(),
				}
			}

			// Use validatePhoneNumberLength with NATIONAL number + country from parsed
			try {
				const parsedForLength = parsePhoneNumber(normalizedNumber)
				if (parsedForLength?.country && parsedForLength.nationalNumber) {
					const lengthValidation = validatePhoneNumberLength(
						String(parsedForLength.nationalNumber)
					)
					if (typeof lengthValidation === 'string') {
						return {
							isValid: false,
							error: getPhoneValidationErrorMessage(lengthValidation),
						}
					}
				}
			} catch {
				// Phone number validation failed; use original value
			}

			// Prefer specific invalid reasons first; check overall validity
			if (!isValidPhoneNumber(normalizedNumber)) {
				// Try to parse to get more specific information
				try {
					const parsed = parsePhoneNumber(normalizedNumber)
					if (parsed) {
						// If it parses but isn't valid, it might be an area code issue
						return {
							isValid: false,
							error: messages.validation.phoneMayHaveInvalidAreaCode(),
						}
					}
				} catch (error) {
					// Parse error gives us more specific information
					if (error instanceof Error) {
						if (error.message.includes('Invalid country')) {
							return {
								isValid: false,
								error: messages.validation.phoneHasInvalidCountryCode(),
							}
						}
						if (error.message.includes('Too short')) {
							return {
								isValid: false,
								error: messages.validation.phoneIsTooShort(),
							}
						}
						if (error.message.includes('Too long')) {
							return {
								isValid: false,
								error: messages.validation.phoneIsTooLong(),
							}
						}
					}
					return {
						isValid: false,
						error: messages.validation.phoneFormatIsInvalid(),
					}
				}

				// As a final fallback, if it's still not considered possible, show generic message
				if (!isPossiblePhoneNumber(normalizedNumber)) {
					return {
						isValid: false,
						error: messages.validation.phoneFormatNotRecognized(),
					}
				}
			}
		}

		// 4. If validateInput flagged invalid and nothing else caught it, return generic invalid format
		if (validateInputInvalid) {
			return { isValid: false, error: messages.validation.invalidFormat() }
		}

		return { isValid: true }
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (value === null || value === undefined) {
			return ''
		}

		let phoneNumber = String(value)

		// For phone cells we want to preserve partial input and not coerce empties away.
		// However, ensure that if there is any input at all, it starts with '+'.
		if (phoneNumber.trim() === '') {
			return '' // leave empty for internal flow; defaultValue handles initial '+966 '
		}

		// Ensure it starts with + when there are digits/content
		if (!phoneNumber.startsWith('+')) {
			phoneNumber = `+${phoneNumber}`
		}

		// Try to format it properly
		// Do not aggressively reformat while user is editing; keep as-is.
		try {
			const parsed = parsePhoneNumber(phoneNumber)
			if (parsed?.isValid?.()) {
				// Optional: if fully valid, we can keep international formatting for display only
				phoneNumber = parsed.formatInternational()
			}
		} catch {
			// Phone number formatting failed; use original value
		}

		// Apply additional formatting if specified
		if (formatting?.type === 'uppercase') {
			phoneNumber = phoneNumber.toUpperCase()
		} else if (formatting?.type === 'lowercase') {
			phoneNumber = phoneNumber.toLowerCase()
		}

		return phoneNumber
	}

	parseValue(input: string, column: IColumnDefinition): unknown {
		const processedInput = convertZeroZeroToPlus(input)

		// Apply validateInput coercion if present
		if (column.validateInput && typeof column.validateInput === 'function') {
			const validateResult = column.validateInput(processedInput)
			if (typeof validateResult === 'string') {
				// Return coerced value
				return validateResult
			}
			// If validateResult is true or false, return processed input
		}
		return processedInput
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		// Default to Saudi Arabia calling code when no default is provided
		const v = column.defaultValue
		if (v === undefined || v === null || String(v).trim() === '') {
			return '+966 '
		}
		return v
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

	coercePasteValue(
		value: string,
		_cell: GridCell,
		column: IColumnDefinition
	): GridCell | undefined {
		// Convert 00 prefix to + prefix for phone numbers
		const coercedValue = convertZeroZeroToPlus(value.trim())

		// If the value changed, create a new cell with the coerced value
		if (coercedValue !== value) {
			// Validate the coerced value
			const validation = this.validateValue(coercedValue, column)

			// Only coerce if the coerced value is valid or the original value was also invalid
			const originalValidation = this.validateValue(value, column)
			if (validation.isValid || !originalValidation.isValid) {
				return {
					kind: GridCellKind.Custom,
					data: {
						kind: 'phone-cell',
						value: coercedValue,
					},
					copyData: coercedValue,
					allowOverlay: true,
				}
			}
		}

		// Return undefined to use default behavior
		return
	}

	provideEditor() {
		return {
			editor: (props: {
				value: GridCell
				onChange: (cell: GridCell) => void
				onFinishedEditing: (save: boolean) => void
			}) => {
				const { value, onChange, onFinishedEditing } = props
				const phoneValue = this.getCellValue(value) as string

				const handleChange = (newValue: string) => {
					const newCell: GridCell = {
						kind: GridCellKind.Custom,
						data: {
							kind: 'phone-cell',
							value: newValue,
						},
						copyData: newValue,
						allowOverlay: true,
					}
					onChange(newCell)
				}

				const handleFinishedEditing = (save: boolean) => {
					if (!save) {
						// Revert to original value
						handleChange(phoneValue)
					}
					onFinishedEditing(save)
				}

				return createElement(PhoneCellEditor, {
					value: phoneValue,
					onChange: handleChange,
					onFinishedEditing: handleFinishedEditing,
				})
			},
			disablePadding: true,
		}
	}
}
