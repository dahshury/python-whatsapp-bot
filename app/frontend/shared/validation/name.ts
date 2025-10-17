import { messages } from "@shared/libs/data-grid/components/utils/i18n";

const CAPITAL_LETTER_PATTERN = /^[a-z]/;
const NON_LETTER_PATTERN = /[^\p{L}\s-]/gu;
const MULTIPLE_SPACES_PATTERN = /\s+/g;
const WORD_SEPARATOR_PATTERN = /[\s-]+/;

export function capitalizeWord(word: string): string {
	return word.replace(CAPITAL_LETTER_PATTERN, (c) => c.toUpperCase());
}

export function validateFullName(text: string): {
	isValid: boolean;
	correctedValue?: string;
	errorMessage?: string;
} {
	if (!text || text.trim() === "") {
		return { isValid: false, errorMessage: messages.validation.nameRequired() };
	}

	const cleaned = text
		.replace(NON_LETTER_PATTERN, "")
		.replace(MULTIPLE_SPACES_PATTERN, " ")
		.trim();

	let words = cleaned.split(WORD_SEPARATOR_PATTERN).filter(Boolean);

	if (words.some((w) => w.length < 2)) {
		return {
			isValid: false,
			errorMessage: messages.validation.nameWordsTooShort(),
		};
	}

	if (words.length < 2) {
		if (words.length === 1 && words[0] && words[0].length >= 2) {
			words.push("Doe");
		} else {
			return {
				isValid: false,
				errorMessage: messages.validation.nameTooShort(),
			};
		}
	}

	words = words.map(capitalizeWord);

	const finalName = words.join(" ");
	return { isValid: true, correctedValue: finalName };
}
