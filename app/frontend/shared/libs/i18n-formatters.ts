import type { Locale } from './i18n-types'

export type NumberFormatOptions = Intl.NumberFormatOptions

export type DateFormatOptions = Intl.DateTimeFormatOptions

interface CurrencyFormatOptions extends Intl.NumberFormatOptions {
	currency?: string
}

const localeMap: Record<Locale, string> = {
	en: 'en-US',
	ar: 'ar-SA',
}

// Percentage conversion constant - divide by 100 to convert percentage (50) to decimal (0.5)
const PERCENT_TO_DECIMAL_DIVISOR = 100
// Default fraction digits for currency formatting
const DEFAULT_CURRENCY_FRACTION_DIGITS = 2
// Default fraction digits for percentage formatting
const DEFAULT_PERCENT_FRACTION_DIGITS = 2

export const formatNumber = (
	value: number,
	locale: Locale,
	options?: NumberFormatOptions
): string => {
	const localeCode = localeMap[locale]
	return new Intl.NumberFormat(localeCode, {
		useGrouping: true,
		...options,
	}).format(value)
}

export const formatDate = (
	date: Date | number,
	locale: Locale,
	options?: DateFormatOptions
): string => {
	const localeCode = localeMap[locale]
	return new Intl.DateTimeFormat(localeCode, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		...options,
	}).format(new Date(date))
}

export const formatTime = (
	date: Date | number,
	locale: Locale,
	options?: DateFormatOptions
): string => {
	const localeCode = localeMap[locale]
	return new Intl.DateTimeFormat(localeCode, {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		...options,
	}).format(new Date(date))
}

export const formatDateTime = (
	date: Date | number,
	locale: Locale,
	options?: DateFormatOptions
): string => {
	const localeCode = localeMap[locale]
	return new Intl.DateTimeFormat(localeCode, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		...options,
	}).format(new Date(date))
}

export const formatCurrency = (
	value: number,
	locale: Locale,
	currencyCode = 'USD',
	options?: CurrencyFormatOptions
): string => {
	const localeCode = localeMap[locale]
	return new Intl.NumberFormat(localeCode, {
		style: 'currency',
		currency: currencyCode,
		minimumFractionDigits: DEFAULT_CURRENCY_FRACTION_DIGITS,
		maximumFractionDigits: DEFAULT_CURRENCY_FRACTION_DIGITS,
		...options,
	}).format(value)
}

export const formatPercent = (
	value: number,
	locale: Locale,
	options?: NumberFormatOptions
): string => {
	const localeCode = localeMap[locale]
	return new Intl.NumberFormat(localeCode, {
		style: 'percent',
		minimumFractionDigits: 0,
		maximumFractionDigits: DEFAULT_PERCENT_FRACTION_DIGITS,
		...options,
	}).format(value / PERCENT_TO_DECIMAL_DIVISOR)
}
