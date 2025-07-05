import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import { messages } from "../../utils/i18n";
import type { IColumnType } from "../interfaces/IColumnType";
import {
	ColumnDataType,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/IDataSource";

export class TextColumnType implements IColumnType {
	id = "text";
	dataType = ColumnDataType.TEXT;

	createCell(
		value: any,
		column: IColumnDefinition,
		_theme: Partial<Theme>,
		_isDarkTheme: boolean,
		_rowContext?: any,
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
			(cell as any).isMissingValue = true;
			(cell as any).validationError = validation.error;
		}

		return cell;
	}

	getCellValue(cell: GridCell): any {
		return (cell as any).data || "";
	}

	validateValue(
		value: any,
		column: IColumnDefinition,
	): { isValid: boolean; error?: string } {
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
		const isNameColumn =
			column.id?.toLowerCase() === "name" ||
			column.name?.toLowerCase() === "name";
		if (isNameColumn) {
			const nameValidation = this.validateNameWithDetails(text);
			if (!nameValidation.isValid) {
				return { isValid: false, error: nameValidation.errorMessage };
			}
		}

		// 3. Column validation rules
		if (column.validationRules) {
			for (const rule of column.validationRules) {
				switch (rule.type) {
					case "pattern":
						if (rule.value && !new RegExp(rule.value).test(text)) {
							return {
								isValid: false,
								error: rule.message || messages.validation.invalidFormat(),
							};
						}
						break;
					case "min":
						if (rule.value && text.length < rule.value) {
							return {
								isValid: false,
								error:
									rule.message || `Minimum ${rule.value} characters required`,
							};
						}
						break;
					case "max":
						if (rule.value && text.length > rule.value) {
							return {
								isValid: false,
								error:
									rule.message || `Maximum ${rule.value} characters allowed`,
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

	formatValue(value: any, formatting?: IColumnFormatting): string {
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

	parseValue(input: string, column: IColumnDefinition): any {
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

	getDefaultValue(column: IColumnDefinition): any {
		return column.defaultValue || "";
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

		let trimmed = text.trim();

		// Remove any numerical characters and coerce the name
		if (/\d/.test(trimmed)) {
			trimmed = trimmed.replace(/\d/g, "");
		}

		// Clean up extra spaces and normalize separators
		trimmed = trimmed.replace(/\s+/g, " ").trim();

		// Split into words (supports spaces and hyphens for compound names)
		const words = trimmed.split(/[\s-]+/).filter((word) => word.length > 0);

		// Must have at least 2 words
		if (words.length < 2) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooShort(),
			};
		}

		// Check for invalid characters first
		const hasInvalidCharacters = words.some(
			(word) => !/^[\p{L}-]+$/u.test(word),
		);
		if (hasInvalidCharacters) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		// Each word must be at least 2 characters
		const shortWords = words.filter((word) => word.length < 2);
		if (shortWords.length > 0) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameWordsTooShort(),
			};
		}

		return { isValid: true };
	}

	/**
	 * Validate name according to rules:
	 * 1. Only letters (any language), spaces or hyphens between words
	 * 2. At least two words, each >=2 chars
	 */
	private validateName(name: string): boolean {
		const validation = this.validateNameWithDetails(name);
		return validation.isValid;
	}
}
