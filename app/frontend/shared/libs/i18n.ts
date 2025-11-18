import i18next from 'i18next'
import arCommon from '@/public/locales/ar/common.json'
import enCommon from '@/public/locales/en/common.json'

// Initialize i18next with bundled JSON resources to avoid extra client plugins
const resources = {
	en: { common: enCommon as unknown as Record<string, string> },
	ar: { common: arCommon as unknown as Record<string, string> },
}

// Available languages dynamically discovered from resources
export const AVAILABLE_LANGUAGES = Object.keys(resources) as Array<
	keyof typeof resources
>

// Language labels for display - using direct resource access to avoid initialization order issues
export const LANGUAGE_LABELS: Record<string, string> = {
	en: (enCommon as Record<string, string>).language_english || 'English',
	ar: (arCommon as Record<string, string>).language_arabic || 'العربية',
}

let initialized = false
function ensureInitialized(): typeof i18next {
	if (initialized) {
		return i18next
	}
	i18next.init({
		resources,
		lng: 'en',
		fallbackLng: 'en',
		defaultNS: 'common',
		interpolation: { escapeValue: false },
		returnObjects: false,
	})
	initialized = true
	return i18next
}

const HUMANIZE_PREFIX_RE =
	/^(kpi_|msg_|chart_|dashboard_|response_time_|operation_|segment_|funnel_|day_|slot_)/
function humanize(raw: string): string {
	const stripped = raw.replace(HUMANIZE_PREFIX_RE, '').replace(/_/g, ' ').trim()
	return stripped
		.split(' ')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ')
}

function pickLocale(isLocalizedArg?: boolean): 'en' | 'ar' {
	if (typeof isLocalizedArg === 'boolean') {
		return isLocalizedArg ? 'ar' : 'en'
	}
	if (typeof window !== 'undefined') {
		try {
			const loc = localStorage.getItem('locale')
			if (loc === 'ar') {
				return 'ar'
			}
		} catch {
			// ignore
		}
	}
	return 'en'
}

function translate(
	key: string,
	isLocalizedArg?: boolean,
	options?: Record<string, unknown>
): string {
	const lng = pickLocale(isLocalizedArg)
	const i18n = ensureInitialized()
	const value = i18n.t(key, { lng, ...options })
	if (value === key) {
		return humanize(key)
	}
	return value
}

export const messages = {
	validation: {
		required: (field: string) =>
			translate('validation.required', undefined, { field }),
		thisFieldIsRequired: () => translate('validation.thisFieldIsRequired'),
		invalidFormat: () => translate('validation.invalidFormat'),
		invalidDate: () => translate('validation.invalidDate'),
		invalidTime: () => translate('validation.invalidTime'),
		invalidPhone: () => translate('validation.invalidPhone'),
		phoneFormatNotRecognized: () =>
			translate('validation.phoneFormatNotRecognized'),
		phoneHasInvalidCountryCode: () =>
			translate('validation.phoneHasInvalidCountryCode'),
		phoneContainsInvalidCharacters: () =>
			translate('validation.phoneContainsInvalidCharacters'),
		phoneIsTooShort: () => translate('validation.phoneIsTooShort'),
		phoneIsTooLong: () => translate('validation.phoneIsTooLong'),
		phoneHasInvalidLengthForCountry: () =>
			translate('validation.phoneHasInvalidLengthForCountry'),
		phoneInvalidFormat: () => translate('validation.phoneInvalidFormat'),
		phoneMayHaveInvalidAreaCode: () =>
			translate('validation.phoneMayHaveInvalidAreaCode'),
		phoneFormatIsInvalid: () => translate('validation.phoneFormatIsInvalid'),
		invalidName: () => translate('validation.invalidName'),
		nameRequired: () => translate('validation.nameRequired'),
		nameTooShort: () => translate('validation.nameTooShort'),
		nameInvalidCharacters: () => translate('validation.nameInvalidCharacters'),
		nameWordsTooShort: () => translate('validation.nameWordsTooShort'),
		nameTooLong: () => translate('validation.nameTooLong'),
	},
	// Relative time formatting helpers
	time: {
		justNow: () => translate('time.justNow'),
		minAgo: (n: number) => translate('time.minAgo', undefined, { n }),
		hoursAgo: (n: number) => translate('time.hoursAgo', undefined, { n }),
		daysAgo: (n: number) => translate('time.daysAgo', undefined, { n }),
	},
	grid: {
		none: () => translate('grid.none'),
	},
} as const

export const i18n = {
	t: (key: string, fallback?: string) =>
		ensureInitialized().t(key, { defaultValue: fallback }),
	getMessage: (key: string, isLocalizedArg?: boolean): string =>
		translate(key, isLocalizedArg),
	getUnknownCustomerLabel: (isLocalizedArg?: boolean): string =>
		translate('phone_unknown_label', isLocalizedArg),
	changeLanguage: (lng: 'en' | 'ar') => ensureInitialized().changeLanguage(lng),
	messages,
}
