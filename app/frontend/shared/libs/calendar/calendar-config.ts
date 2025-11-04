export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Riyadh'
export const SLOT_DURATION_HOURS = 2 // Streamlit used 2-hour slot intervals

type BusinessHoursRule = {
	daysOfWeek: number[]
	startTime: string
	endTime: string
	startRecur?: string
	endRecur?: string
}

type ValidRange = {
	start: Date
}

export function getTimezone(): string {
	return TIMEZONE
}

export function getBusinessHours(freeRoam: boolean): BusinessHoursRule[] {
	if (freeRoam) {
		return []
	}
	// Business hours:
	// - Sun-Thu: 11:00-17:00
	// - Sat: 16:00-22:00 (evening only)
	// - Fri: closed (handled via hiddenDays)
	// - Ramadan (if configured via env): 10:00-16:00
	const ramadanRules = getRamadanBusinessHours()
	const normalRules = subtractRamadanFromNormal(
		[
			// Sun(0)-Thu(4): 11:00-17:00
			{
				daysOfWeek: (() => {
					const SUNDAY = 0
					const MONDAY = 1
					const TUESDAY = 2
					const WEDNESDAY = 3
					const THURSDAY = 4
					return [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY]
				})(),
				startTime: '11:00',
				endTime: '17:00',
				startRecur: '2022-01-01',
				endRecur: '2031-12-31',
			},
			// Saturday(6): 16:00-22:00
			{
				daysOfWeek: (() => {
					const SATURDAY = 6
					return [SATURDAY]
				})(),
				startTime: '16:00',
				endTime: '22:00',
				startRecur: '2022-01-01',
				endRecur: '2031-12-31',
			},
		],
		ramadanRules
	)
	return [...ramadanRules, ...normalRules]
}

export function getValidRange(freeRoam: boolean): ValidRange | undefined {
	if (freeRoam) {
		return
	}
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return { start: today }
}

export function getSlotTimes(date: Date, freeRoam: boolean, _view: string) {
	if (freeRoam) {
		return { slotMinTime: '00:00:00', slotMaxTime: '24:00:00' }
	}
	if (isRamadan(date)) {
		return { slotMinTime: '10:00:00', slotMaxTime: '16:00:00' }
	}
	const day = date.getDay() // 0=Sun..6=Sat
	const SUNDAY = 0
	const THURSDAY = 4
	if (day >= SUNDAY && day <= THURSDAY) {
		return { slotMinTime: '11:00:00', slotMaxTime: '17:00:00' }
	}
	const SATURDAY = 6
	if (day === SATURDAY) {
		return { slotMinTime: '16:00:00', slotMaxTime: '22:00:00' }
	}
	// Friday hidden elsewhere
	return { slotMinTime: '11:00:00', slotMaxTime: '17:00:00' }
}

// Simple Ramadan check using approximate Hijri conversion boundaries is handled on backend.
// Here, treat Hijri month 9 via environment override window when available.
export function isRamadan(date: Date): boolean {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return false
	}

	const islamicMonth = getIslamicMonthViaIntl(date)
	if (islamicMonth !== null) {
		return islamicMonth === RAMADAN_ISLAMIC_MONTH
	}

	return isRamadanTabular(date)
}

function getRamadanBusinessHours() {
	// Build dynamic Ramadan date ranges for 2022-2031 using automatic detection
	if (RAMADAN_RULES_CACHE) {
		return RAMADAN_RULES_CACHE
	}
	const ranges: { start: string; end: string }[] = []
	try {
		const START_YEAR = 2022
		const START_MONTH = 0 // January
		const START_DAY = 1
		const END_YEAR = 2031
		const END_MONTH = 11 // December
		const END_DAY = 31
		const start = new Date(Date.UTC(START_YEAR, START_MONTH, START_DAY))
		const end = new Date(Date.UTC(END_YEAR, END_MONTH, END_DAY))
		let inRange = false
		let rangeStart: string | null = null
		const cursor = new Date(start)
		while (cursor.getTime() <= end.getTime()) {
			const isR = isRamadan(cursor)
			const y = cursor.getUTCFullYear()
			const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')
			const d = String(cursor.getUTCDate()).padStart(2, '0')
			const iso = `${y}-${m}-${d}`
			if (isR && !inRange) {
				inRange = true
				rangeStart = iso
			} else if (!isR && inRange) {
				// Close previous range
				const prev = new Date(cursor)
				prev.setUTCDate(prev.getUTCDate() - 1)
				const py = prev.getUTCFullYear()
				const pm = String(prev.getUTCMonth() + 1).padStart(2, '0')
				const pd = String(prev.getUTCDate()).padStart(2, '0')
				const pend = `${py}-${pm}-${pd}`
				if (rangeStart) {
					ranges.push({ start: rangeStart, end: pend })
				}
				inRange = false
				rangeStart = null
			}
			cursor.setUTCDate(cursor.getUTCDate() + 1)
		}
		if (inRange && rangeStart) {
			const py = end.getUTCFullYear()
			const pm = String(end.getUTCMonth() + 1).padStart(2, '0')
			const pd = String(end.getUTCDate()).padStart(2, '0')
			ranges.push({ start: rangeStart, end: `${py}-${pm}-${pd}` })
		}
	} catch {
		// Date parsing failed; use empty ranges
	}
	const SUNDAY = 0
	const MONDAY = 1
	const TUESDAY = 2
	const WEDNESDAY = 3
	const THURSDAY = 4
	const SATURDAY = 6
	RAMADAN_RULES_CACHE = ranges.map((r) => ({
		daysOfWeek: [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, SATURDAY],
		startTime: '10:00',
		endTime: '16:00',
		startRecur: r.start,
		endRecur: r.end,
	}))
	return RAMADAN_RULES_CACHE
}

function subtractRamadanFromNormal(
	normal: BusinessHoursRule[],
	ramadan: BusinessHoursRule[]
) {
	if (!ramadan || ramadan.length === 0) {
		return normal
	}
	// Merge Ramadan intervals
	const intervals = ramadan
		.map((r) => ({
			start: r.startRecur ? toUTCDate(r.startRecur) : undefined,
			end: r.endRecur ? toUTCDate(r.endRecur) : undefined,
		}))
		.filter((x) => x.start && x.end) as { start: Date; end: Date }[]
	if (intervals.length === 0) {
		return normal
	}
	intervals.sort((a, b) => a.start.getTime() - b.start.getTime())
	const merged: { start: Date; end: Date }[] = []
	for (const iv of intervals) {
		if (merged.length === 0) {
			merged.push({ ...iv })
			continue
		}
		const lastIdx = merged.length - 1
		const last = merged[lastIdx]
		if (!last) {
			merged.push({ ...iv })
			continue
		}
		if (iv.start.getTime() <= addDaysUTC(last.end, 1).getTime()) {
			if (iv.end.getTime() > last.end.getTime()) {
				merged[lastIdx] = { start: last.start, end: iv.end }
			}
		} else {
			merged.push({ ...iv })
		}
	}

	// Subtract merged Ramadan intervals from each normal rule's recurrence window
	const result: BusinessHoursRule[] = []
	for (const rule of normal) {
		const windowStart = rule.startRecur
			? toUTCDate(rule.startRecur)
			: toUTCDate('2022-01-01')
		const windowEnd = rule.endRecur
			? toUTCDate(rule.endRecur)
			: toUTCDate('2031-12-31')
		let cursor = new Date(windowStart)
		for (const iv of merged) {
			const s =
				iv.start.getTime() < windowStart.getTime() ? windowStart : iv.start
			const e = iv.end.getTime() > windowEnd.getTime() ? windowEnd : iv.end
			if (cursor.getTime() < s.getTime()) {
				const prev = addDaysUTC(s, -1)
				if (cursor.getTime() <= prev.getTime()) {
					result.push({
						daysOfWeek: [...rule.daysOfWeek],
						startTime: rule.startTime,
						endTime: rule.endTime,
						startRecur: toISO(cursor),
						endRecur: toISO(prev),
					})
				}
			}
			const next = addDaysUTC(e, 1)
			if (next.getTime() > cursor.getTime()) {
				cursor = next
			}
		}
		if (cursor.getTime() <= windowEnd.getTime()) {
			result.push({
				daysOfWeek: [...rule.daysOfWeek],
				startTime: rule.startTime,
				endTime: rule.endTime,
				startRecur: toISO(cursor),
				endRecur: toISO(windowEnd),
			})
		}
	}
	return result
}

// Cache for Ramadan rules
let RAMADAN_RULES_CACHE: BusinessHoursRule[] | null = null

// --- Date and Hijri conversion helpers ---
function toUTCDate(iso: string): Date {
	return new Date(`${iso}T00:00:00Z`)
}

function toISO(d: Date): string {
	const y = d.getUTCFullYear()
	const m = String(d.getUTCMonth() + 1).padStart(2, '0')
	const day = String(d.getUTCDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

function addDaysUTC(d: Date, delta: number): Date {
	const copy = new Date(d)
	copy.setUTCDate(copy.getUTCDate() + delta)
	return copy
}

// Gregorian to Julian Day Number
function gregorianToJDN(year: number, month: number, day: number): number {
	const MONTH_ADJUSTMENT_NUMERATOR = 14
	const MONTH_ADJUSTMENT_DENOMINATOR = 12
	const YEAR_OFFSET = 4800
	const MONTH_OFFSET = 3
	const DAY_CALCULATION_MULTIPLIER = 153
	const DAY_CALCULATION_ADDEND = 2
	const DAY_CALCULATION_DIVISOR = 5
	const DAYS_PER_YEAR = 365
	const DAYS_PER_LEAP_YEAR_INTERVAL_4 = 4
	const DAYS_PER_LEAP_YEAR_INTERVAL_100 = 100
	const DAYS_PER_LEAP_YEAR_INTERVAL_400 = 400
	const JULIAN_DAY_NUMBER_OFFSET = 32_045
	const a = Math.floor(
		(MONTH_ADJUSTMENT_NUMERATOR - month) / MONTH_ADJUSTMENT_DENOMINATOR
	)
	const y = year + YEAR_OFFSET - a
	const m = month + MONTH_ADJUSTMENT_DENOMINATOR * a - MONTH_OFFSET
	return (
		day +
		Math.floor(
			(DAY_CALCULATION_MULTIPLIER * m + DAY_CALCULATION_ADDEND) /
				DAY_CALCULATION_DIVISOR
		) +
		DAYS_PER_YEAR * y +
		Math.floor(y / DAYS_PER_LEAP_YEAR_INTERVAL_4) -
		Math.floor(y / DAYS_PER_LEAP_YEAR_INTERVAL_100) +
		Math.floor(y / DAYS_PER_LEAP_YEAR_INTERVAL_400) -
		JULIAN_DAY_NUMBER_OFFSET
	)
}

// Islamic (civil) to JDN
function islamicToJDN(year: number, month: number, day: number): number {
	const ISLAMIC_EPOCH = 1_948_439
	const MONTH_DURATION_DAYS = 29.5
	const MONTH_OFFSET = 1
	const DAYS_PER_ISLAMIC_YEAR = 354
	const YEAR_OFFSET = 1
	const LEAP_YEAR_CALCULATION_ADDEND = 3
	const LEAP_YEAR_CALCULATION_MULTIPLIER = 11
	const LEAP_YEAR_CALCULATION_DIVISOR = 30
	const JDN_OFFSET = 1
	return (
		day +
		Math.ceil(MONTH_DURATION_DAYS * (month - MONTH_OFFSET)) +
		(year - YEAR_OFFSET) * DAYS_PER_ISLAMIC_YEAR +
		Math.floor(
			(LEAP_YEAR_CALCULATION_ADDEND + LEAP_YEAR_CALCULATION_MULTIPLIER * year) /
				LEAP_YEAR_CALCULATION_DIVISOR
		) +
		ISLAMIC_EPOCH -
		JDN_OFFSET
	)
}

// JDN to Islamic (civil)
function jdnToIslamic(jd: number): {
	year: number
	month: number
	day: number
} {
	const HALF_DAY = 0.5
	const ISLAMIC_EPOCH_OFFSET = 1_948_439.5
	const FIRST_MONTH = 1
	const FIRST_DAY = 1
	// Islamic calendar conversion constants
	const ISLAMIC_YEAR_MULTIPLIER = 30
	const ISLAMIC_YEAR_ADDEND = 10_646
	const ISLAMIC_YEAR_DIVISOR = 10_631
	const ISLAMIC_MONTHS_PER_YEAR = 12
	const ISLAMIC_MONTH_OFFSET = 29
	const ISLAMIC_AVERAGE_DAYS_PER_MONTH = 29.5

	const jdAdjusted = Math.floor(jd) + HALF_DAY
	const year = Math.floor(
		(ISLAMIC_YEAR_MULTIPLIER * (jdAdjusted - ISLAMIC_EPOCH_OFFSET) +
			ISLAMIC_YEAR_ADDEND) /
			ISLAMIC_YEAR_DIVISOR
	)
	const month = Math.min(
		ISLAMIC_MONTHS_PER_YEAR,
		Math.ceil(
			(jdAdjusted -
				ISLAMIC_MONTH_OFFSET -
				islamicToJDN(year, FIRST_MONTH, FIRST_DAY)) /
				ISLAMIC_AVERAGE_DAYS_PER_MONTH
		) + 1
	)
	const day = jdAdjusted - islamicToJDN(year, month, FIRST_DAY) + 1
	return { year, month, day }
}

const RAMADAN_ISLAMIC_MONTH = 9
const ISLAMIC_CALENDAR_LOCALE = 'en-u-ca-islamic'

let islamicMonthFormatter: Intl.DateTimeFormat | null = null

function getIslamicMonthViaIntl(date: Date): number | null {
	if (
		typeof Intl === 'undefined' ||
		typeof Intl.DateTimeFormat !== 'function'
	) {
		return null
	}

	if (!islamicMonthFormatter) {
		try {
			islamicMonthFormatter = new Intl.DateTimeFormat(ISLAMIC_CALENDAR_LOCALE, {
				month: 'numeric',
			})
		} catch {
			islamicMonthFormatter = null
			return null
		}
	}

	if (!islamicMonthFormatter) {
		return null
	}

	try {
		const parts = islamicMonthFormatter.formatToParts(date)
		const monthPart = parts.find((part) => part.type === 'month')
		if (!monthPart) {
			return null
		}
		const value = Number.parseInt(monthPart.value, 10)
		if (Number.isNaN(value)) {
			return null
		}
		return value
	} catch {
		return null
	}
}

function isRamadanTabular(date: Date): boolean {
	try {
		const jd = gregorianToJDN(
			date.getUTCFullYear(),
			date.getUTCMonth() + 1,
			date.getUTCDate()
		)
		const islamic = jdnToIslamic(jd)
		return islamic.month === RAMADAN_ISLAMIC_MONTH
	} catch {
		return false
	}
}
