import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import { messages } from "../../utils/i18n";
import type {
	CreateCellOptions,
	IColumnType,
} from "../interfaces/i-column-type";
import {
	COLUMN_DATA_TYPE,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/i-data-source";

// Regex patterns for validation
const PATTERN_DIGIT = /\d/;
const PATTERN_LETTER_SPACE_HYPHEN = /^[\p{L}\s-]+$/u;
const PATTERN_LETTER_HYPHEN = /^[\p{L}-]+$/u;
const PATTERN_WORD_BOUNDARY = /\b\w/g;
const PATTERN_WORD_SPLIT = /[\s-]+/;

// Name validation constants
const MAX_NAME_LENGTH = 50;
const MIN_WORD_LENGTH = 2;
const MIN_WORD_COUNT = 2;

export class TextColumnType implements IColumnType {
	id = "text";
	dataType = COLUMN_DATA_TYPE.TEXT;

	createCell(options: CreateCellOptions): GridCell {
		const { value, column } = options;
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
			(
				cell as { isMissingValue?: boolean; validationError?: string }
			).isMissingValue = true;
			(
				cell as { isMissingValue?: boolean; validationError?: string }
			).validationError = validation.error || "";
		}

		return cell;
	}

	getCellValue(cell: GridCell): unknown {
		return (cell as { data?: unknown }).data || "";
	}

	validateValue(
		value: unknown,
		column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		let text = String(value || "");

		if (column.isRequired && !text.trim()) {
			return {
				isValid: false,
				error: messages.validation.thisFieldIsRequired(),
			};
		}

		// Apply validateInput if provided for coercion and early invalid detection
		const inputValidation = this.applyValidateInput(text, column.validateInput);
		text = inputValidation.text;
		const validateInputInvalid = inputValidation.isInvalid;

		// 2. Built-in name validation (gives detailed messages)
		const isNameColumn =
			column.id?.toLowerCase() === "name" ||
			column.name?.toLowerCase() === "name";
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
			const rulesError = this.validateColumnRules(text, column.validationRules);
			if (rulesError) {
				return rulesError;
			}
		}

		// 4. If validateInput flagged invalid and nothing else caught it, return generic invalid format
		if (validateInputInvalid) {
			return { isValid: false, error: messages.validation.invalidFormat() };
		}

		return { isValid: true };
	}

	private applyValidateInput(
		text: string,
		validateInput?: ((val: string) => boolean | string) | undefined
	): { text: string; isInvalid: boolean } {
		if (!validateInput || typeof validateInput !== "function") {
			return { text, isInvalid: false };
		}

		const validateResult = validateInput(text);
		if (validateResult === false) {
			return { text, isInvalid: true };
		}
		if (typeof validateResult === "string") {
			return { text: validateResult, isInvalid: false };
		}
		return { text, isInvalid: false };
	}

	private validateColumnRules(
		text: string,
		rules: IColumnDefinition["validationRules"]
	): { isValid: boolean; error?: string } | null {
		if (!rules) {
			return null;
		}

		for (const rule of rules) {
			let ruleError: { isValid: boolean; error?: string } | null = null;

			switch (rule.type) {
				case "pattern":
					ruleError = this.validatePatternRule(text, rule);
					break;
				case "min":
					ruleError = this.validateMinRule(text, rule);
					break;
				case "max":
					ruleError = this.validateMaxRule(text, rule);
					break;
				case "custom":
					ruleError = this.validateCustomRule(text, rule);
					break;
				default:
					// Unknown rule type - skip
					break;
			}

			if (ruleError) {
				return ruleError;
			}
		}

		return null;
	}

	private validatePatternRule(
		text: string,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value && !new RegExp(String(ruleObj.value)).test(text)) {
			return {
				isValid: false,
				error: ruleObj.message || messages.validation.invalidFormat(),
			};
		}
		return null;
	}

	private validateMinRule(
		text: string,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value && text.length < Number(ruleObj.value)) {
			return {
				isValid: false,
				error:
					ruleObj.message ||
					`Minimum ${Number(ruleObj.value)} characters required`,
			};
		}
		return null;
	}

	private validateMaxRule(
		text: string,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as { value?: unknown; message?: string };
		if (ruleObj.value && text.length > Number(ruleObj.value)) {
			return {
				isValid: false,
				error:
					ruleObj.message ||
					`Maximum ${Number(ruleObj.value)} characters allowed`,
			};
		}
		return null;
	}

	private validateCustomRule(
		text: string,
		rule: unknown
	): { isValid: boolean; error?: string } | null {
		const ruleObj = rule as {
			validate?: (val: string) => boolean;
			message?: string;
		};
		if (ruleObj.validate && !ruleObj.validate(text)) {
			return {
				isValid: false,
				error: ruleObj.message || messages.validation.invalidFormat(),
			};
		}
		return null;
	}

	formatValue(value: unknown, formatting?: IColumnFormatting): string {
		if (value === null || value === undefined) {
			return "";
		}

		let formatted = String(value);

		if (formatting?.type === "uppercase") {
			formatted = formatted.toUpperCase();
		} else if (formatting?.type === "lowercase") {
			formatted = formatted.toLowerCase();
		} else if (formatting?.type === "capitalize") {
			formatted = formatted.replace(PATTERN_WORD_BOUNDARY, (char) =>
				char.toUpperCase()
			);
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

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition
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

		const trimmed = text.trim();

		// 1. Check for digits FIRST - most specific validation rule
		if (PATTERN_DIGIT.test(trimmed)) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		// 2. Check for other invalid characters (anything that's not letters, spaces, or hyphens)
		if (!PATTERN_LETTER_SPACE_HYPHEN.test(trimmed)) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		// Clean up extra spaces and normalize separators for word analysis
		const normalized = trimmed.replace(/\s+/g, " ").trim();

		// 2.1. Enforce maximum total length for name (50 characters)
		if (normalized.length > MAX_NAME_LENGTH) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooLong(),
			};
		}

		// Split into words (supports spaces and hyphens for compound names)
		const words = normalized
			.split(PATTERN_WORD_SPLIT)
			.filter((word) => word.length > 0);

		// 3. Check word count - must have at least 2 words
		if (words.length < MIN_WORD_COUNT) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooShort(),
			};
		}

		// 4. Check individual word length - each word must be at least 2 characters
		const shortWords = words.filter((word) => word.length < MIN_WORD_LENGTH);
		if (shortWords.length > 0) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameWordsTooShort(),
			};
		}

		// 5. Double-check for any remaining invalid characters in individual words
		// (This catches edge cases where regex might miss something)
		const hasInvalidWordsCharacters = words.some(
			(word) => !PATTERN_LETTER_HYPHEN.test(word)
		);
		if (hasInvalidWordsCharacters) {
			return {
				isValid: false,
				errorMessage: messages.validation.nameInvalidCharacters(),
			};
		}

		return { isValid: true };
	}
}
