/**
 * Date Range Query Utilities
 *
 * Utilities for generating period keys and date ranges for calendar queries
 * based on view type (month, week, etc.)
 */

import {
	DAYS_FROM_SATURDAY_TO_FRIDAY,
	DAYS_IN_WEEK,
	DECEMBER_MONTH_INDEX,
	END_OF_DAY_HOUR,
	END_OF_DAY_MILLISECOND,
	END_OF_DAY_MINUTE,
	END_OF_DAY_SECOND,
	JANUARY_MONTH_INDEX,
	LAST_DAY_OF_MONTH,
	MILLISECONDS_PER_DAY,
	SATURDAY_DAY_OF_WEEK,
} from '../lib/constants'

// Regex patterns for period key parsing
const YEAR_PERIOD_PATTERN = /^\d{4}$/
const MONTH_PERIOD_PATTERN = /^\d{4}-\d{2}$/
const WEEK_PERIOD_PATTERN = /^\d{4}-W\d{2}$/
const DAY_PERIOD_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type ViewType =
	| 'dayGridMonth'
	| 'timeGridWeek'
	| 'timeGridDay'
	| 'listMonth'
	| 'multiMonthYear'

/**
 * Generate a period key for caching based on view type and date
 * Examples:
 * - Month view: "2025-11" (YYYY-MM)
 * - Week view: "2025-W44" (YYYY-Www)
 * - Day view: "2025-11-15" (YYYY-MM-DD)
 */
export function getPeriodKey(viewType: ViewType, date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')

	if (viewType === 'multiMonthYear') {
		// Year view: YYYY (entire year)
		return String(year)
	}

	if (viewType === 'dayGridMonth' || viewType === 'listMonth') {
		// Month view: YYYY-MM
		return `${year}-${month}`
	}

	if (viewType === 'timeGridWeek') {
		// Week view: YYYY-Www (Saturday-based week to match FullCalendar's firstDay=6)
		const week = getSaturdayBasedWeek(date)
		return `${year}-W${String(week).padStart(2, '0')}`
	}

	if (viewType === 'timeGridDay') {
		// Day view: YYYY-MM-DD
		const day = String(date.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	// Default to month
	return `${year}-${month}`
}

/**
 * Get Saturday-based week number for a date (matches FullCalendar's firstDay=6)
 * Returns week number where week starts on Saturday
 */
function getSaturdayBasedWeek(date: Date): number {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const dayOfWeek = d.getDay()
	// Adjust to make Saturday (6) the start of the week
	const adjustedDay =
		(dayOfWeek - SATURDAY_DAY_OF_WEEK + DAYS_IN_WEEK) % DAYS_IN_WEEK
	const weekStart = new Date(d)
	weekStart.setDate(d.getDate() - adjustedDay)
	weekStart.setHours(0, 0, 0, 0)

	// Get the year of the week start (important for year boundaries)
	const weekYear = weekStart.getFullYear()

	// Calculate week number from January 1st of that year
	const jan1 = new Date(weekYear, 0, 1)
	const jan1Day = jan1.getDay()
	const daysToFirstSaturday =
		(jan1Day - SATURDAY_DAY_OF_WEEK + DAYS_IN_WEEK) % DAYS_IN_WEEK
	const firstWeekStart = new Date(jan1)
	firstWeekStart.setDate(jan1.getDate() - daysToFirstSaturday)

	const daysSinceFirstWeek = Math.floor(
		(weekStart.getTime() - firstWeekStart.getTime()) / MILLISECONDS_PER_DAY
	)
	const week = Math.floor(daysSinceFirstWeek / DAYS_IN_WEEK) + 1

	return week
}

/**
 * Get date range for a period key
 */
export function getPeriodDateRange(
	viewType: ViewType,
	periodKey: string
): { start: Date; end: Date } {
	if (viewType === 'multiMonthYear') {
		// Year view: Show entire year (12 months) starting from January 1st of the year
		const year = Number(periodKey)
		if (Number.isNaN(year)) {
			// Fallback to current year if parsing fails
			const fallback = new Date()
			return {
				start: new Date(fallback.getFullYear(), JANUARY_MONTH_INDEX, 1),
				end: new Date(
					fallback.getFullYear(),
					DECEMBER_MONTH_INDEX,
					LAST_DAY_OF_MONTH,
					END_OF_DAY_HOUR,
					END_OF_DAY_MINUTE,
					END_OF_DAY_SECOND,
					END_OF_DAY_MILLISECOND
				),
			}
		}
		const start = new Date(year, JANUARY_MONTH_INDEX, 1) // January 1st
		const end = new Date(
			year,
			DECEMBER_MONTH_INDEX,
			LAST_DAY_OF_MONTH,
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		) // December 31st
		return { start, end }
	}

	if (viewType === 'dayGridMonth' || viewType === 'listMonth') {
		// Month: YYYY-MM
		const parts = periodKey.split('-').map(Number)
		const year = parts[0]
		const month = parts[1]
		if (
			year === undefined ||
			month === undefined ||
			Number.isNaN(year) ||
			Number.isNaN(month)
		) {
			// Fallback to current month if parsing fails
			const fallback = new Date()
			return {
				start: new Date(fallback.getFullYear(), fallback.getMonth(), 1),
				end: new Date(
					fallback.getFullYear(),
					fallback.getMonth() + 1,
					0,
					END_OF_DAY_HOUR,
					END_OF_DAY_MINUTE,
					END_OF_DAY_SECOND,
					END_OF_DAY_MILLISECOND
				),
			}
		}
		const start = new Date(year, month - 1, 1)
		const end = new Date(
			year,
			month,
			0,
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		)
		return { start, end }
	}

	if (viewType === 'timeGridWeek') {
		// Week: YYYY-Www (Saturday-based week)
		const [yearStr, weekStr] = periodKey.split('-W')
		const year = Number(yearStr)
		const week = Number(weekStr)
		const start = getSaturdayBasedWeekStart(year, week)
		const end = new Date(start)
		end.setDate(end.getDate() + DAYS_FROM_SATURDAY_TO_FRIDAY) // Saturday to Friday (6 days)
		end.setHours(
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		)
		return { start, end }
	}

	if (viewType === 'timeGridDay') {
		// Day: YYYY-MM-DD
		const date = new Date(periodKey)
		const start = new Date(date)
		start.setHours(0, 0, 0, 0)
		const end = new Date(date)
		end.setHours(
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		)
		return { start, end }
	}

	// Default to month
	const parts = periodKey.split('-').map(Number)
	const year = parts[0]
	const month = parts[1]
	if (
		year === undefined ||
		month === undefined ||
		Number.isNaN(year) ||
		Number.isNaN(month)
	) {
		// Fallback to current month if parsing fails
		const fallback = new Date()
		return {
			start: new Date(fallback.getFullYear(), fallback.getMonth(), 1),
			end: new Date(
				fallback.getFullYear(),
				fallback.getMonth() + 1,
				0,
				END_OF_DAY_HOUR,
				END_OF_DAY_MINUTE,
				END_OF_DAY_SECOND,
				END_OF_DAY_MILLISECOND
			),
		}
	}
	const start = new Date(year, month - 1, 1)
	const end = new Date(
		year,
		month,
		0,
		END_OF_DAY_HOUR,
		END_OF_DAY_MINUTE,
		END_OF_DAY_SECOND,
		END_OF_DAY_MILLISECOND
	)
	return { start, end }
}

/**
 * Get Saturday-based week start date (matches FullCalendar's firstDay=6)
 */
function getSaturdayBasedWeekStart(year: number, week: number): Date {
	const jan1 = new Date(year, JANUARY_MONTH_INDEX, 1)
	const jan1Day = jan1.getDay()
	// Find the first Saturday on or before January 1st
	const daysToFirstSaturday =
		(jan1Day - SATURDAY_DAY_OF_WEEK + DAYS_IN_WEEK) % DAYS_IN_WEEK
	const firstWeekStart = new Date(jan1)
	firstWeekStart.setDate(jan1.getDate() - daysToFirstSaturday)

	// Calculate the start of the requested week
	const WEEKS_OFFSET_TO_CURRENT = 1 // Week numbers are 1-indexed
	const weeksToAdd = week - WEEKS_OFFSET_TO_CURRENT
	const start = new Date(firstWeekStart)
	start.setDate(start.getDate() + weeksToAdd * DAYS_IN_WEEK)
	start.setHours(0, 0, 0, 0)
	return start
}

/**
 * Generate period keys for sliding window prefetch
 * Returns array of period keys: [current - 5, ..., current - 1, current, current + 1, ..., current + 5]
 * When freeRoam is false, only includes current and future periods (no past periods)
 */
export function getPrefetchPeriods(
	viewType: ViewType,
	currentDate: Date,
	count = 5,
	freeRoam = true
): string[] {
	const periods: string[] = []
	const currentPeriod = getPeriodKey(viewType, currentDate)

	// Helper to add/subtract periods
	const addPeriods = (date: Date, periodOffset: number): Date => {
		const newDate = new Date(date)
		if (viewType === 'multiMonthYear') {
			// Year view: add/subtract years
			newDate.setFullYear(newDate.getFullYear() + periodOffset)
		} else if (viewType === 'dayGridMonth' || viewType === 'listMonth') {
			// Month view: add/subtract months
			newDate.setMonth(newDate.getMonth() + periodOffset)
		} else if (viewType === 'timeGridWeek') {
			// Week view: add/subtract weeks
			newDate.setDate(newDate.getDate() + periodOffset * DAYS_IN_WEEK)
		} else if (viewType === 'timeGridDay') {
			// Day view: add/subtract days
			newDate.setDate(newDate.getDate() + periodOffset)
		}
		return newDate
	}

	// Helper to check if a period is in the past (only on client side)
	const isPastPeriod = (periodKey: string): boolean => {
		// Only check on client side to avoid SSR hydration issues
		if (typeof window === 'undefined') {
			return false
		}
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const periodEnd = getPeriodDateRange(viewType, periodKey).end
		return periodEnd < today
	}

	// Generate periods backward (only if freeRoam is enabled)
	if (freeRoam) {
		for (let i = count; i > 0; i--) {
			const date = addPeriods(currentDate, -i)
			const periodKey = getPeriodKey(viewType, date)
			periods.push(periodKey)
		}
	}

	// Add current period
	periods.push(currentPeriod)

	// Generate periods forward
	for (let i = 1; i <= count; i++) {
		const date = addPeriods(currentDate, i)
		const periodKey = getPeriodKey(viewType, date)
		periods.push(periodKey)
	}

	// When freeRoam is false, filter out any past periods (defensive check)
	// Only filter on client side to avoid SSR hydration issues
	const filteredPeriods =
		freeRoam || typeof window === 'undefined'
			? periods
			: periods.filter((periodKey) => !isPastPeriod(periodKey))

	// Remove duplicates
	return Array.from(new Set(filteredPeriods))
}

/**
 * Get the oldest period key from an array (for cache eviction)
 */
export function getOldestPeriod(periodKeys: string[]): string | null {
	if (periodKeys.length === 0) {
		return null
	}

	// Sort periods chronologically
	const sorted = [...periodKeys].sort((a, b) => {
		// Parse period keys and compare
		const dateA = parsePeriodKey(a)
		const dateB = parsePeriodKey(b)
		return dateA.getTime() - dateB.getTime()
	})

	return sorted[0] ?? null
}

/**
 * Get the newest period key from an array (for cache eviction)
 */
export function getNewestPeriod(periodKeys: string[]): string | null {
	if (periodKeys.length === 0) {
		return null
	}

	const sorted = [...periodKeys].sort((a, b) => {
		const dateA = parsePeriodKey(a)
		const dateB = parsePeriodKey(b)
		return dateB.getTime() - dateA.getTime()
	})

	return sorted[0] ?? null
}

/**
 * Parse a period key back to a Date
 */
export function parsePeriodKey(periodKey: string): Date {
	// Try year format: YYYY (for multiMonthYear)
	if (YEAR_PERIOD_PATTERN.test(periodKey)) {
		const year = Number(periodKey)
		return new Date(year, 0, 1) // January 1st
	}

	// Try month format: YYYY-MM
	if (MONTH_PERIOD_PATTERN.test(periodKey)) {
		const parts = periodKey.split('-').map(Number)
		const year = parts[0]
		const month = parts[1]
		if (
			year !== undefined &&
			month !== undefined &&
			!Number.isNaN(year) &&
			!Number.isNaN(month)
		) {
			return new Date(year, month - 1, 1)
		}
	}

	// Try week format: YYYY-Www (Saturday-based week)
	if (WEEK_PERIOD_PATTERN.test(periodKey)) {
		const [yearStr, weekStr] = periodKey.split('-W')
		const year = Number(yearStr)
		const week = Number(weekStr)
		return getSaturdayBasedWeekStart(year, week)
	}

	// Try day format: YYYY-MM-DD
	if (DAY_PERIOD_PATTERN.test(periodKey)) {
		return new Date(periodKey)
	}

	// Default fallback
	return new Date()
}
