import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import * as React from "react";
import {
	isPossiblePhoneNumber,
	isValidPhoneNumber,
	parsePhoneNumber,
} from "react-phone-number-input";
import { PhoneCellEditor } from "../../ui/PhoneCellEditor";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

// Utility function to convert 00 prefix to + prefix
const convertZeroZeroToPlus = (phoneNumber: string): string => {
	if (phoneNumber.startsWith("00")) {
		return `+${phoneNumber.substring(2)}`;
	}
	return phoneNumber;
};

export class PhoneColumnType implements IColumnType {
	id = "phone";
	dataType = ColumnDataType.PHONE;

	createCell(
		value: unknown,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: unknown,
	): GridCell {
		let phoneNumber = this.formatValue(value, column.formatting);

		// Apply validateInput coercion if present
		if (column.validateInput && typeof column.validateInput === "function") {
			const validateResult = column.validateInput(phoneNumber);
			if (validateResult === false) {
				// Invalid input - mark as error but keep original value
			} else if (typeof validateResult === "string") {
				// Coerced value - use the cleaned value
				phoneNumber = validateResult;
			}
			// If validateResult === true, keep original value
		}

		const cell: GridCell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "phone-cell",
				value: phoneNumber,
			},
			copyData: phoneNumber,
			allowOverlay: true,
		};

		// Validate and store error details
		const validation = this.validateValue(phoneNumber, column);
		if (!validation.isValid) {
			(
				cell as { isMissingValue?: boolean; validationError?: string }
			).isMissingValue = true;
			if (validation.error !== undefined) {
				(
					cell as { isMissingValue?: boolean; validationError?: string }
				).validationError = validation.error;
			}
		}

		return cell;
	}

	getCellValue(cell: GridCell): unknown {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as { data?: { kind?: string; value?: unknown } }).data?.kind ===
				"phone-cell"
		) {
			return (cell as { data?: { kind?: string; value?: unknown } }).data
				?.value;
		}
		return "";
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
		let phoneNumber = String(value || "");

		if (column.isRequired && !phoneNumber.trim()) {
			return {
				isValid: false,
				error: messages.validation.thisFieldIsRequired(),
			};
		}

		// Apply validateInput if provided for coercion and early invalid detection
		let validateInputInvalid = false;
		if (column.validateInput && typeof column.validateInput === "function") {
			const validateResult = column.validateInput(phoneNumber);
			if (validateResult === false) {
				// Mark as invalid but keep original text for further validation checks
				validateInputInvalid = true;
			} else if (typeof validateResult === "string") {
				// Use coerced value for subsequent validations
				phoneNumber = validateResult;
			}
			// If true, phoneNumber remains as is
		}

		// Use react-phone-number-input validation functions
		if (phoneNumber.trim()) {
			// First check if it's a possible phone number (lenient validation)
			if (!isPossiblePhoneNumber(phoneNumber)) {
				return {
					isValid: false,
					error: "Invalid phone number format or too short",
				};
			}

			// For stricter validation, also check if it's a valid phone number
			// Note: isValidPhoneNumber may return false for valid numbers if the library metadata is outdated
			// so we use it as additional validation but not as the primary check
			if (!isValidPhoneNumber(phoneNumber)) {
				// Try to parse the phone number to get more specific error information
				try {
					const parsed = parsePhoneNumber(phoneNumber);
					if (parsed) {
						// If it parses but isn't valid, it might be an area code issue
						return {
							isValid: false,
							error: "Phone number may have invalid area code or format",
						};
					}
				} catch {
					// If parsing fails, fall back to the possible check result
				}
			}
		}

		// 4. If validateInput flagged invalid and nothing else caught it, return generic invalid format
		if (validateInputInvalid) {
			return { isValid: false, error: messages.validation.invalidFormat() };
		}

		return { isValid: true };
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (value === null || value === undefined) return "";

		let phoneNumber = String(value);

		// For phone cells we want to preserve partial input and not coerce empties away.
		// However, ensure that if there is any input at all, it starts with '+'.
		if (phoneNumber.trim() === "") {
			return ""; // leave empty for internal flow; defaultValue handles initial '+966 '
		}

		// Ensure it starts with + when there are digits/content
		if (!phoneNumber.startsWith("+")) {
			phoneNumber = `+${phoneNumber}`;
		}

		// Try to format it properly
		// Do not aggressively reformat while user is editing; keep as-is.
		try {
			const parsed = parsePhoneNumber(phoneNumber);
			if (parsed?.isValid?.()) {
				// Optional: if fully valid, we can keep international formatting for display only
				phoneNumber = parsed.formatInternational();
			}
		} catch {}

		// Apply additional formatting if specified
		if (formatting?.type === "uppercase") {
			phoneNumber = phoneNumber.toUpperCase();
		} else if (formatting?.type === "lowercase") {
			phoneNumber = phoneNumber.toLowerCase();
		}

		return phoneNumber;
	}

	parseValue(input: string, column: IColumnDefinition): unknown {
		const processedInput = convertZeroZeroToPlus(input);

		// Apply validateInput coercion if present
		if (column.validateInput && typeof column.validateInput === "function") {
			const validateResult = column.validateInput(processedInput);
			if (typeof validateResult === "string") {
				// Return coerced value
				return validateResult;
			}
			// If validateResult is true or false, return processed input
		}
		return processedInput;
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		// Default to Saudi Arabia calling code when no default is provided
		const v = column.defaultValue;
		if (v === undefined || v === null || String(v).trim() === "") {
			return "+966 ";
		}
		return v;
	}

	canEdit(column: IColumnDefinition): boolean {
		return column.isEditable !== false;
	}

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition,
	): EditableGridCell {
		return cell as EditableGridCell;
	}

	coercePasteValue(
		value: string,
		_cell: GridCell,
		column: IColumnDefinition,
	): GridCell | undefined {
		// Convert 00 prefix to + prefix for phone numbers
		const coercedValue = convertZeroZeroToPlus(value.trim());

		// If the value changed, create a new cell with the coerced value
		if (coercedValue !== value) {
			// Validate the coerced value
			const validation = this.validateValue(coercedValue, column);

			// Only coerce if the coerced value is valid or the original value was also invalid
			const originalValidation = this.validateValue(value, column);
			if (validation.isValid || !originalValidation.isValid) {
				return {
					kind: GridCellKind.Custom,
					data: {
						kind: "phone-cell",
						value: coercedValue,
					},
					copyData: coercedValue,
					allowOverlay: true,
				};
			}
		}

		// Return undefined to use default behavior
		return undefined;
	}

	provideEditor() {
		return {
			editor: (props: {
				value: GridCell;
				onChange: (cell: GridCell) => void;
				onFinishedEditing: (save: boolean) => void;
			}) => {
				const { value, onChange, onFinishedEditing } = props;
				const phoneValue = this.getCellValue(value) as string;

				const handleChange = (newValue: string) => {
					const newCell: GridCell = {
						kind: GridCellKind.Custom,
						data: {
							kind: "phone-cell",
							value: newValue,
						},
						copyData: newValue,
						allowOverlay: true,
					};
					onChange(newCell);
				};

				const handleFinishedEditing = (save: boolean) => {
					if (!save) {
						// Revert to original value
						handleChange(phoneValue);
					}
					onFinishedEditing(save);
				};

				return React.createElement(PhoneCellEditor, {
					value: phoneValue,
					onChange: handleChange,
					onFinishedEditing: handleFinishedEditing,
				});
			},
			disablePadding: true,
		};
	}
}
