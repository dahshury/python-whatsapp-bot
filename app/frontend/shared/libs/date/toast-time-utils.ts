import {
	DEFAULT_HOUR_12,
	HOURS_IN_HALF_DAY,
	MIDNIGHT_HOUR,
	TIME_FORMAT_REGEX,
} from '../toast/constants'

export function to12HourFormat(time?: string): string {
	try {
		if (!time) {
			return ''
		}
		const trimmed = String(time).trim()
		const m = TIME_FORMAT_REGEX.exec(trimmed)
		if (!m) {
			return trimmed
		}
		const hour = Number.parseInt(m[1] || '0', 10)
		const minutes = m[2]
		const ampm = hour >= HOURS_IN_HALF_DAY ? 'PM' : 'AM'
		const hour12 =
			hour % HOURS_IN_HALF_DAY === MIDNIGHT_HOUR
				? DEFAULT_HOUR_12
				: hour % HOURS_IN_HALF_DAY
		return `${hour12}:${minutes} ${ampm}`
	} catch {
		return String(time || '')
	}
}
