import { type EditableGridCell, type GridCell, GridCellKind, type Theme } from "@glideapps/glide-data-grid";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import { ColumnDataType, type IColumnDefinition, type IColumnFormatting } from "../interfaces/IDataSource";

export class TextColumnType implements IColumnType {
	id = "text";
	dataType = ColumnDataType.TEXT;

	createCell(
		value: unknown,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: unknown
	): GridCell {
		let text = this.formatValue(value, column.formatting);

		// Apply validateInput coercion if present
		if (column.validateInput && typeof column.validateInput === "function") {
			const validateResult = column.validateInput(text);
			if (validateResult === false) {
				// Invalid input - mark as error but keep original value
			} else if (typeof validateResult === "string") {
				// Coerced value - use the cleaned value
				text = validateResult;
			}
			// If validateResult === true, keep original value
		}

		const cell: GridCell = {
			kind: GridCellKind.Text,
			data: text,
			displayData: text,
			allowOverlay: true,
		};

		// Validate and store error details
		const validation = this.validateValue(text, column);
		if (!validation.isValid) {
			(cell as { isMissingValue?: boolean; validationError?: string }).isMissingValue = true;
			(cell as { isMissingValue?: boolean; validationError?: string }).validationError = validation.error || "";
		}

		return cell;
	}

	getCellValue(cell: GridCell): unknown {
		return (cell as { data?: unknown }).data || "";
	}

	validateValue(value: unknown, column: IColumnDefinition): { isValid: boolean; error?: string } {
		let text = String(value || "");

		if (column.isRequired && !text.trim()) {
			return {
				isValid: false,
				error: messages.validation.thisFieldIsRequired(),
			};
		}

		// 1. Apply validateInput if provided for coercion and early invalid detection
		let validateInputInvalid = false;
		if (column.validateInput && typeof column.validateInput === "function") {
			const validateResult = column.validateInput(text);
			if (validateResult === false) {
				// Mark as invalid but keep original text for further validation checks
				validateInputInvalid = true;
			} else if (typeof validateResult === "string") {
				// Use coerced value for subsequent validations
				text = validateResult;
			}
			// If true, text remains as is
		}

		// 2. Built-in name validation (gives detailed messages)
		const isNameColumn = column.id?.toLowerCase() === "name" || column.name?.toLowerCase() === "name";
		if (isNameColumn) {
			const nameValidation = this.validateNameWithDetails(text);
			if (!nameValidation.isValid) {
				return {
					isValid: false,
					error: nameValidation.errorMessage || "Name validation failed",
				};
			}
		}

		// 3. Column validation rules
		if (column.validationRules) {
			for (const rule of column.validationRules) {
				switch (rule.type) {
					case "pattern":
						if (rule.value && !new RegExp(String(rule.value)).test(text)) {
							return {
								isValid: false,
								error: rule.message || messages.validation.invalidFormat(),
							};
						}
						break;
					case "min":
						if (rule.value && text.length < Number(rule.value)) {
							return {
								isValid: false,
								error: rule.message || `Minimum ${Number(rule.value)} characters required`,
							};
						}
						break;
					case "max":
						if (rule.value && text.length > Number(rule.value)) {
							return {
								isValid: false,
								error: rule.message || `Maximum ${Number(rule.value)} characters allowed`,
							};
						}
						break;
					case "custom":
						if (rule.validate && !rule.validate(text)) {
							return {
								isValid: false,
								error: rule.message || messages.validation.invalidFormat(),
							};
						}
						break;
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

		let formatted = String(value);

		if (formatting?.type === "uppercase") {
			formatted = formatted.toUpperCase();
		} else if (formatting?.type === "lowercase") {
			formatted = formatted.toLowerCase();
		} else if (formatting?.type === "capitalize") {
			formatted = formatted.replace(/\b\w/g, (char) => char.toUpperCase());
		}

		return formatted;
	}

	parseValue(input: string, column: IColumnDefinition): unknown {
		// Apply validateInput coercion if present
		if (column.validateInput && typeof column.validateInput === "function") {
			const validateResult = column.validateInput(input);
			if (typeof validateResult === "string") {
				// Return coerced value
				return validateResult;
			}
			// If validateResult is true or false, return original input
		}
		return input;
	}

	getDefaultValue(column: IColumnDefinition): unknown {
		return column.defaultValue || "";
	}

	canEdit(column: IColumnDefinition): boolean {
		return column.isEditable !== false;
	}

	createEditableCell(cell: GridCell, _column: IColumnDefinition): EditableGridCell {
		return cell as EditableGridCell;
	}

	/**
	 * Validate name with detailed error messages
	 */
	private validateNameWithDetails(text: string): {
		isValid: boolean;
		errorMessage?: string;
	} {
		if (!text || text.trim() === "") {
			return {
				isValid: false,
				errorMessage: messages.validation.nameRequired(),
			};
		}

		const trimmed = text.trim();

		// 1. Check for digits FIRST - most specific validation rule
		if (/\d/.test(trimmed)) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		// 2. Check for other invalid characters (anything that's not letters, spaces, or hyphens)
		if (!/^[\p{L}\s-]+$/u.test(trimmed)) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		// Clean up extra spaces and normalize separators for word analysis
		const normalized = trimmed.replace(/\s+/g, " ").trim();

		// 2.1. Enforce maximum total length for name (50 characters)
		if (normalized.length > 50) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooLong(),
			};
		}

		// Split into words (supports spaces and hyphens for compound names)
		const words = normalized.split(/[\s-]+/).filter((word) => word.length > 0);

		// 3. Check word count - must have at least 2 words
		if (words.length < 2) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooShort(),
			};
		}

		// 4. Check individual word length - each word must be at least 2 characters
		const shortWords = words.filter((word) => word.length < 2);
		if (shortWords.length > 0) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameWordsTooShort(),
			};
		}

		// 5. Double-check for any remaining invalid characters in individual words
		// (This catches edge cases where regex might miss something)
		const hasInvalidWordsCharacters = words.some((word) => !/^[\p{L}-]+$/u.test(word));
		if (hasInvalidWordsCharacters) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		return { isValid: true };
	}
}
