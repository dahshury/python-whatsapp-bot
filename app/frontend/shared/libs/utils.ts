import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs))
}

// Regex patterns for time parsing - defined at top level for performance
const TIME_24HOUR_FORMAT_REGEX = /^\d{2}:\d{2}$/
const AMPM_SUFFIX_REGEX = /(AM|PM)$/
const AMPM_REPLACE_REGEX = /\s*(AM|PM)$/
const PM_SUFFIX_REGEX = /PM$/

// Time conversion constants
const HOURS_IN_HALF_DAY = 12
const MIDNIGHT_HOUR = 0
const PADDING_WIDTH = 2
const PADDING_CHAR = '0'
const MAX_HOUR = 23
const MAX_MINUTE = 59
const DEFAULT_TIME = '00:00'

// Normalize various time formats to 24h HH:MM
export function to24h(time: string): string {
	try {
		if (!time) {
			return '00:00'
		}
		const trimmed = time
			.trim()
			.toUpperCase()
			.replace('ص', 'AM')
			.replace('م', 'PM')
		// If already HH:MM
		if (TIME_24HOUR_FORMAT_REGEX.test(trimmed)) {
			return trimmed
		}
		// If H:MM AM/PM
		const ampm = AMPM_SUFFIX_REGEX.test(trimmed)
		const [hPart, mPartRaw] = trimmed.replace(AMPM_REPLACE_REGEX, '').split(':')
		const minute = mPartRaw ? Number.parseInt(mPartRaw, 10) : 0
		let hour = Number.parseInt(hPart || '0', 10)
		if (ampm) {
			const isPM = PM_SUFFIX_REGEX.test(trimmed)
			if (isPM && hour < HOURS_IN_HALF_DAY) {
				hour += HOURS_IN_HALF_DAY
			}
			if (!isPM && hour === HOURS_IN_HALF_DAY) {
				hour = MIDNIGHT_HOUR
			}
		}
		const hh = String(Math.max(0, Math.min(MAX_HOUR, hour))).padStart(
			PADDING_WIDTH,
			PADDING_CHAR
		)
		const mm = String(Math.max(0, Math.min(MAX_MINUTE, minute))).padStart(
			PADDING_WIDTH,
			PADDING_CHAR
		)
		return `${hh}:${mm}`
	} catch {
		return DEFAULT_TIME
	}
}
