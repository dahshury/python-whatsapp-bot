export type NameValidationCode =
	| 'nameRequired'
	| 'nameWordsTooShort'
	| 'nameTooShort'

export type NameValidationResult = {
	isValid: boolean
	code?: NameValidationCode
	correctedValue?: string
}

const LATIN_LOWERCASE_START = /^[a-z]/
const NON_LETTER_SPACE_HYPHEN = /[^\p{L}\s-]/gu
const MULTI_SPACE = /\s+/g
const WORD_SPLIT = /[\s-]+/

const capitalizeWord = (word: string): string =>
	word.replace(LATIN_LOWERCASE_START, (c) => c.toUpperCase())

/**
 * Domain-agnostic, i18n-agnostic name validator.
 * - Strips non-letter characters except spaces and hyphens
 * - Normalizes whitespace
 * - Ensures at least 2 characters per word
 * - Ensures at least two words, adds placeholder last name if exactly one word >= 2 chars
 * - Auto-capitalizes initial latin letter per word
 */
export function validatePersonName(input: string): NameValidationResult {
	const text = input ?? ''
	if (!text || text.trim() === '') {
		return { isValid: false, code: 'nameRequired' }
	}

	const cleaned = text
		.replace(NON_LETTER_SPACE_HYPHEN, '')
		.replace(MULTI_SPACE, ' ')
		.trim()

	let words = cleaned.split(WORD_SPLIT).filter(Boolean)

	if (words.some((w) => w.length < 2)) {
		return { isValid: false, code: 'nameWordsTooShort' }
	}

	if (words.length < 2) {
		if (words.length === 1 && words[0] && words[0].length >= 2) {
			words.push('Doe')
		} else {
			return { isValid: false, code: 'nameTooShort' }
		}
	}

	words = words.map(capitalizeWord)
	const finalName = words.join(' ')
	return { isValid: true, correctedValue: finalName }
}
