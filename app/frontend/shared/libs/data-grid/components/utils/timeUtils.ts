const MIN_HOUR_24 = 0
const MAX_HOUR_24 = 23
const MIN_MINUTE = 0
const MAX_MINUTE = 59
const MIN_SECOND = 0
const MAX_SECOND = 59
const MIN_MILLISECOND = 0
const MAX_MILLISECOND = 999
const MIDDAY_HOUR_24 = 12
const MIDNIGHT_HOUR = 0
const MIN_HOUR_12 = 1
const MAX_HOUR_12 = 12
const BASE_DATE_YEAR = 2000
const BASE_DATE_MONTH_INDEX = 0
const BASE_DATE_DAY = 1
const DEFAULT_SECONDS = 0
const DEFAULT_MILLISECONDS = 0

// Enhanced validation with complete NaN prevention
export const isValidDate = (date: unknown): date is Date => {
	if (!(date && date instanceof Date)) {
		return false
	}
	const time = date.getTime()
	if (Number.isNaN(time)) {
		return false
	}
	const hours = date.getHours()
	const minutes = date.getMinutes()
	const seconds = date.getSeconds()
	const milliseconds = date.getMilliseconds()

	// Comprehensive NaN checks
	if (
		Number.isNaN(hours) ||
		Number.isNaN(minutes) ||
		Number.isNaN(seconds) ||
		Number.isNaN(milliseconds)
	) {
		return false
	}
	if (hours < MIN_HOUR_24 || hours > MAX_HOUR_24) {
		return false
	}
	if (minutes < MIN_MINUTE || minutes > MAX_MINUTE) {
		return false
	}
	if (seconds < MIN_SECOND || seconds > MAX_SECOND) {
		return false
	}
	if (milliseconds < MIN_MILLISECOND || milliseconds > MAX_MILLISECOND) {
		return false
	}

	return true
}

// Create a guaranteed valid time value for TimeKeeper
export const getSafeTimeValue = (time?: Date): Date => {
	const now = new Date()
	const safeDate = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		MIDDAY_HOUR_24,
		MIN_MINUTE,
		DEFAULT_SECONDS,
		DEFAULT_MILLISECONDS
	)

	if (time && isValidDate(time)) {
		const hours = time.getHours()
		const minutes = time.getMinutes()

		if (
			!(Number.isNaN(hours) || Number.isNaN(minutes)) &&
			hours >= MIN_HOUR_24 &&
			hours <= MAX_HOUR_24 &&
			minutes >= MIN_MINUTE &&
			minutes <= MAX_MINUTE
		) {
			safeDate.setHours(hours, minutes, DEFAULT_SECONDS, DEFAULT_MILLISECONDS)
			return safeDate
		}
	}

	return safeDate
}

// Enhanced time formatting with complete NaN prevention
export const formatTimeForPicker = (date: Date, use24Hour = false): string => {
	try {
		if (!isValidDate(date)) {
			throw new Error('Invalid date provided to formatTimeForPicker')
		}

		const hours = date.getHours()
		const minutes = date.getMinutes()

		// Triple check for NaN values
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			throw new Error('NaN values detected in date formatting')
		}

		const safeHours = Math.max(
			MIN_HOUR_24,
			Math.min(MAX_HOUR_24, Math.floor(hours))
		)
		const safeMinutes = Math.max(
			MIN_MINUTE,
			Math.min(MAX_MINUTE, Math.floor(minutes))
		)
		const minutesStr = safeMinutes.toString().padStart(2, '0')

		if (use24Hour) {
			return `${safeHours.toString().padStart(2, '0')}:${minutesStr}`
		}
		const isPM = safeHours >= MIDDAY_HOUR_24
		let displayHours = safeHours
		if (safeHours === MIDNIGHT_HOUR) {
			displayHours = MAX_HOUR_12
		} else if (safeHours > MIDDAY_HOUR_24) {
			displayHours = safeHours - MIDDAY_HOUR_24
		}
		return `${displayHours}:${minutesStr}${isPM ? 'pm' : 'am'}`
	} catch (_error) {
		// Return a guaranteed safe default
		return use24Hour
			? `${MIDDAY_HOUR_24.toString().padStart(2, '0')}:${DEFAULT_SECONDS.toString().padStart(2, '0')}`
			: `${MAX_HOUR_12}:${DEFAULT_SECONDS.toString().padStart(2, '0')}pm`
	}
}

// Format time for display
export const formatTimeForDisplay = (
	date: Date | undefined,
	use24Hour = false
): string => {
	if (!(date && isValidDate(date))) {
		return ''
	}

	try {
		const hours = date.getHours()
		const minutes = date.getMinutes()

		// Check for NaN values
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return ''
		}

		const minutesStr = minutes.toString().padStart(2, '0')

		if (use24Hour) {
			return `${hours.toString().padStart(2, '0')}:${minutesStr}`
		}
		const isPM = hours >= MIDDAY_HOUR_24
		let displayHours = hours
		if (hours === MIDNIGHT_HOUR) {
			displayHours = MAX_HOUR_12
		} else if (hours > MIDDAY_HOUR_24) {
			displayHours = hours - MIDDAY_HOUR_24
		}
		return `${displayHours}:${minutesStr}${isPM ? 'pm' : 'am'}`
	} catch (_error) {
		return ''
	}
}

// Parse time from picker with enhanced validation
// Creates a Date object with a fixed date (2000-01-01) to avoid timezone issues
export const parseTimeFromPicker = (timeString: string): Date => {
	try {
		// Use a fixed date to avoid timezone conversion issues
		// The date part doesn't matter since we only care about time
		const baseDate = new Date(
			BASE_DATE_YEAR,
			BASE_DATE_MONTH_INDEX,
			BASE_DATE_DAY
		) // January 1, 2000 in local time

		const match24 = timeString.match(TIME_REGEX_24)
		const match12 = timeString.match(TIME_REGEX_12)

		if (match24) {
			const hours = match24[1] ? Number.parseInt(match24[1], 10) : MIN_HOUR_24
			const minutes = match24[2] ? Number.parseInt(match24[2], 10) : MIN_MINUTE

			if (
				hours >= MIN_HOUR_24 &&
				hours <= MAX_HOUR_24 &&
				minutes >= MIN_MINUTE &&
				minutes <= MAX_MINUTE
			) {
				const newDate = new Date(baseDate)
				newDate.setHours(hours, minutes, DEFAULT_SECONDS, DEFAULT_MILLISECONDS)
				return newDate
			}
		} else if (match12) {
			let hours = match12[1] ? Number.parseInt(match12[1], 10) : MIN_HOUR_12
			const minutes = match12[2] ? Number.parseInt(match12[2], 10) : MIN_MINUTE
			const isPM = match12[3] ? match12[3].toLowerCase() === 'pm' : false

			if (
				hours >= MIN_HOUR_12 &&
				hours <= MAX_HOUR_12 &&
				minutes >= MIN_MINUTE &&
				minutes <= MAX_MINUTE
			) {
				if (isPM && hours !== MAX_HOUR_12) {
					hours += MIDDAY_HOUR_24
				}
				if (!isPM && hours === MAX_HOUR_12) {
					hours = MIDNIGHT_HOUR
				}

				const newDate = new Date(baseDate)
				newDate.setHours(hours, minutes, DEFAULT_SECONDS, DEFAULT_MILLISECONDS)
				return newDate
			}
		}

		throw new Error(`Invalid time format: ${timeString}`)
	} catch (_error) {
		const fallbackDate = new Date(
			BASE_DATE_YEAR,
			BASE_DATE_MONTH_INDEX,
			BASE_DATE_DAY
		)
		fallbackDate.setHours(
			MIDDAY_HOUR_24,
			MIN_MINUTE,
			DEFAULT_SECONDS,
			DEFAULT_MILLISECONDS
		) // Default to noon
		return fallbackDate
	}
}

// Regular expressions for time validation
export const TIME_REGEX_24 = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
export const TIME_REGEX_12 = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(am|pm)$/i
