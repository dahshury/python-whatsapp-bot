import { i18n } from '@shared/libs/i18n'
import type * as RPNInput from 'react-phone-number-input'
import { getCountries, getCountryCallingCode } from 'react-phone-number-input'
import countryLabelsAr from 'react-phone-number-input/locale/ar.json'
import countryLabelsEn from 'react-phone-number-input/locale/en.json'

// Get all countries from react-phone-number-input library
// This includes all 245 supported countries
const ALL_COUNTRIES = getCountries() as RPNInput.Country[]

// Legacy list removed - all countries now come from react-phone-number-input library

export const CALLING_CODE_TO_COUNTRY: Record<string, RPNInput.Country> =
	(() => {
		const map: Record<string, RPNInput.Country> = {}
		// Use all countries from library instead of hardcoded list
		for (const countryCode of ALL_COUNTRIES) {
			try {
				const callingCode = String(getCountryCallingCode(countryCode))
				if (!map[callingCode]) {
					map[callingCode] = countryCode
				}
			} catch {
				// Skip invalid countries
			}
		}
		return map
	})()

export const CALLING_CODES_SORTED: string[] = Object.keys(
	CALLING_CODE_TO_COUNTRY
).sort((a, b) => b.length - a.length)

export const getCountryLabel = (countryCode: RPNInput.Country): string => {
	try {
		const callingCode = getCountryCallingCode(countryCode)
		const labels: Record<string, string> = countryLabelsEn as Record<
			string,
			string
		>
		const localizedName = labels[countryCode] || countryCode
		return `${localizedName} (+${callingCode})`
	} catch {
		const labels: Record<string, string> = countryLabelsEn as Record<
			string,
			string
		>
		return labels[countryCode] || countryCode
	}
}

/**
 * Get localized country options for all countries.
 * Uses translations from common.json (key: `country_${countryCode}`),
 * falls back to react-phone-number-input locale files if not found.
 * Includes searchable text in both languages for multilingual search.
 *
 * @param isLocalized - Whether to use Arabic (true) or English (false) translations
 * @returns Array of country options with value, label, and searchable text in both languages
 */
export const getLocalizedCountryOptions = (
	isLocalized: boolean
): ReadonlyArray<{
	value: RPNInput.Country
	label: string
	searchText: string // Includes both English and Arabic names for search
}> => {
	// Get labels in both languages for search
	const enLabels: Record<string, string> = countryLabelsEn as Record<
		string,
		string
	>
	const arLabels: Record<string, string> = countryLabelsAr as Record<
		string,
		string
	>

	// Use all countries from react-phone-number-input library (245 countries)
	// Wrap in try-catch to ensure all countries are included even if one fails
	return ALL_COUNTRIES.map((countryCode) => {
		try {
			const callingCode = getCountryCallingCode(countryCode)

			// Try to get translation from common.json first (key: country_${countryCode})
			const i18nKey = `country_${countryCode}`
			const customTranslation = i18n.getMessage(i18nKey, isLocalized)

			// Get both English and Arabic names for search
			const enName =
				i18n.getMessage(i18nKey, false) !== i18nKey
					? i18n.getMessage(i18nKey, false)
					: enLabels[countryCode] || countryCode
			const arName =
				i18n.getMessage(i18nKey, true) !== i18nKey
					? i18n.getMessage(i18nKey, true)
					: arLabels[countryCode] || countryCode

			// Use custom translation if available, otherwise fallback to library
			let localizedName: string
			if (customTranslation && customTranslation !== i18nKey) {
				localizedName = customTranslation
			} else if (isLocalized) {
				localizedName = arLabels[countryCode] || countryCode
			} else {
				localizedName = enLabels[countryCode] || countryCode
			}

			// Combine both language names for search (lowercase for case-insensitive matching)
			const searchText = `${enName} ${arName}`.toLowerCase()

			return {
				value: countryCode,
				label: `${localizedName} (+${callingCode})`,
				searchText,
			}
		} catch {
			// Fallback for countries that fail calling code lookup
			const i18nKey = `country_${countryCode}`
			const customTranslation = i18n.getMessage(i18nKey, isLocalized)
			const enName =
				i18n.getMessage(i18nKey, false) !== i18nKey
					? i18n.getMessage(i18nKey, false)
					: enLabels[countryCode] || countryCode
			const arName =
				i18n.getMessage(i18nKey, true) !== i18nKey
					? i18n.getMessage(i18nKey, true)
					: arLabels[countryCode] || countryCode
			let localizedName: string
			if (customTranslation && customTranslation !== i18nKey) {
				localizedName = customTranslation
			} else if (isLocalized) {
				localizedName = arLabels[countryCode] || countryCode
			} else {
				localizedName = enLabels[countryCode] || countryCode
			}

			const searchText = `${enName} ${arName}`.toLowerCase()

			return {
				value: countryCode,
				label: localizedName,
				searchText,
			}
		}
	})
}
