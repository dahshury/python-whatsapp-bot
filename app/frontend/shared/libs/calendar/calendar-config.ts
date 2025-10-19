import { runtimeConfig } from "@shared/config";
export const TIMEZONE = runtimeConfig.timezone || "Asia/Riyadh";
export const SLOT_DURATION_HOURS = 2; // Streamlit used 2-hour slot intervals

// Day constants
const SUNDAY = 0;
const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;
const SATURDAY = 6;

// Business hours constants
const WEEKDAY_MIN_TIME = "11:00";
const WEEKDAY_MAX_TIME = "17:00";
const SATURDAY_MIN_TIME = "16:00";
const SATURDAY_MAX_TIME = "22:00";
const RAMADAN_MIN_TIME = "10:00";
const RAMADAN_MAX_TIME = "16:00";
const RAMADAN_MONTH = 9;
const BUSINESS_HOURS_START_YEAR = 2022;
const BUSINESS_HOURS_END_YEAR = 2031;
const ISLAMIC_EPOCH = 1_948_439;
const ISLAMIC_EPOCH_CALCULATION = 10_646;
const ISLAMIC_CYCLE_DAYS = 10_631;
const RAMADAN_RULES_WEEKDAYS = [
	SUNDAY,
	MONDAY,
	TUESDAY,
	WEDNESDAY,
	THURSDAY,
	SATURDAY,
];

type BusinessHoursRule = {
	daysOfWeek: number[];
	startTime: string;
	endTime: string;
	startRecur?: string;
	endRecur?: string;
};

type ValidRange = {
	start: Date;
};

export function getTimezone(): string {
	return TIMEZONE;
}

export function getBusinessHours(freeRoam: boolean): BusinessHoursRule[] {
	if (freeRoam) {
		return [];
	}
	// Business hours:
	// - Sun-Thu: 11:00-17:00
	// - Sat: 16:00-22:00 (evening only)
	// - Fri: closed (handled via hiddenDays)
	// - Ramadan (if configured via env): 10:00-16:00
	const ramadanRules = getRamadanBusinessHours();
	const normalRules = subtractRamadanFromNormal(
		[
			// Sun(0)-Thu(4): 11:00-17:00
			{
				daysOfWeek: [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY],
				startTime: WEEKDAY_MIN_TIME,
				endTime: WEEKDAY_MAX_TIME,
				startRecur: `${BUSINESS_HOURS_START_YEAR}-01-01`,
				endRecur: `${BUSINESS_HOURS_END_YEAR}-12-31`,
			},
			// Saturday(6): 16:00-22:00
			{
				daysOfWeek: [SATURDAY],
				startTime: SATURDAY_MIN_TIME,
				endTime: SATURDAY_MAX_TIME,
				startRecur: `${BUSINESS_HOURS_START_YEAR}-01-01`,
				endRecur: `${BUSINESS_HOURS_END_YEAR}-12-31`,
			},
		],
		ramadanRules
	);
	return [...ramadanRules, ...normalRules];
}

export function getValidRange(freeRoam: boolean): ValidRange | undefined {
	if (freeRoam) {
		return;
	}
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return { start: today };
}

export function getSlotTimes(date: Date, freeRoam: boolean, _view: string) {
	if (freeRoam) {
		return { slotMinTime: "00:00:00", slotMaxTime: "24:00:00" };
	}
	if (isRamadan(date)) {
		return {
			slotMinTime: `${RAMADAN_MIN_TIME}:00`,
			slotMaxTime: `${RAMADAN_MAX_TIME}:00`,
		};
	}
	const day = date.getDay(); // 0=Sun..6=Sat
	if (day >= SUNDAY && day <= THURSDAY) {
		return {
			slotMinTime: `${WEEKDAY_MIN_TIME}:00`,
			slotMaxTime: `${WEEKDAY_MAX_TIME}:00`,
		};
	}
	if (day === SATURDAY) {
		return {
			slotMinTime: `${SATURDAY_MIN_TIME}:00`,
			slotMaxTime: `${SATURDAY_MAX_TIME}:00`,
		};
	}
	// Friday hidden elsewhere
	return {
		slotMinTime: `${WEEKDAY_MIN_TIME}:00`,
		slotMaxTime: `${WEEKDAY_MAX_TIME}:00`,
	};
}

// Simple Ramadan check using approximate Hijri conversion boundaries is handled on backend.
// Here, treat Hijri month 9 via environment override window when available.
export function isRamadan(date: Date): boolean {
	// Automatic detection using Tabular Islamic (civil) calendar conversion
	try {
		const jd = gregorianToJDN(
			date.getUTCFullYear(),
			date.getUTCMonth() + 1,
			date.getUTCDate()
		);
		const islamic = jdnToIslamic(jd);
		return islamic.month === RAMADAN_MONTH;
	} catch {
		// Hijri conversion failed, assume not Ramadan
	}
	return false;
}

function getRamadanBusinessHours() {
	// Build dynamic Ramadan date ranges for 2022-2031 using automatic detection
	if (RAMADAN_RULES_CACHE) {
		return RAMADAN_RULES_CACHE;
	}
	const ranges: { start: string; end: string }[] = [];
	try {
		const start = new Date(
			Date.UTC(BUSINESS_HOURS_START_YEAR, DATE_UTC_JANUARY, 1)
		);
		const end = new Date(
			Date.UTC(BUSINESS_HOURS_END_YEAR, DATE_UTC_DECEMBER, DATE_UTC_LAST_DAY)
		);
		let inRange = false;
		let rangeStart: string | null = null;
		const cursor = new Date(start);
		while (cursor.getTime() <= end.getTime()) {
			const isR = isRamadan(cursor);
			const y = cursor.getUTCFullYear();
			const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
			const d = String(cursor.getUTCDate()).padStart(2, "0");
			const iso = `${y}-${m}-${d}`;
			if (isR && !inRange) {
				inRange = true;
				rangeStart = iso;
			} else if (!isR && inRange) {
				// Close previous range
				const prev = new Date(cursor);
				prev.setUTCDate(prev.getUTCDate() - 1);
				const py = prev.getUTCFullYear();
				const pm = String(prev.getUTCMonth() + 1).padStart(2, "0");
				const pd = String(prev.getUTCDate()).padStart(2, "0");
				const pend = `${py}-${pm}-${pd}`;
				if (rangeStart) {
					ranges.push({ start: rangeStart, end: pend });
				}
				inRange = false;
				rangeStart = null;
			}
			cursor.setUTCDate(cursor.getUTCDate() + 1);
		}
		if (inRange && rangeStart) {
			const py = end.getUTCFullYear();
			const pm = String(end.getUTCMonth() + 1).padStart(2, "0");
			const pd = String(end.getUTCDate()).padStart(2, "0");
			ranges.push({ start: rangeStart, end: `${py}-${pm}-${pd}` });
		}
	} catch {
		// Ramadan calculation failed, continue with empty ranges
	}
	RAMADAN_RULES_CACHE = ranges.map((r) => ({
		daysOfWeek: RAMADAN_RULES_WEEKDAYS,
		startTime: RAMADAN_MIN_TIME,
		endTime: RAMADAN_MAX_TIME,
		startRecur: r.start,
		endRecur: r.end,
	}));
	return RAMADAN_RULES_CACHE;
}

function mergeIntervals(
	intervals: { start: Date; end: Date }[]
): { start: Date; end: Date }[] {
	if (intervals.length === 0) {
		return [];
	}

	intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
	const merged: { start: Date; end: Date }[] = [];

	for (const iv of intervals) {
		if (merged.length === 0) {
			merged.push({ ...iv });
			continue;
		}

		const last = merged.at(-1);
		if (!last) {
			merged.push({ ...iv });
			continue;
		}

		if (iv.start.getTime() <= addDaysUTC(last.end, 1).getTime()) {
			if (iv.end.getTime() > last.end.getTime()) {
				merged[merged.length - 1] = { start: last.start, end: iv.end };
			}
		} else {
			merged.push({ ...iv });
		}
	}

	return merged;
}

function buildRuleExceptions(
	rule: BusinessHoursRule,
	windowStart: Date,
	windowEnd: Date,
	merged: { start: Date; end: Date }[]
): BusinessHoursRule[] {
	const result: BusinessHoursRule[] = [];
	let cursor = new Date(windowStart);

	for (const iv of merged) {
		const s =
			iv.start.getTime() < windowStart.getTime() ? windowStart : iv.start;
		const e = iv.end.getTime() > windowEnd.getTime() ? windowEnd : iv.end;

		if (cursor.getTime() < s.getTime()) {
			const prev = addDaysUTC(s, -1);
			if (cursor.getTime() <= prev.getTime()) {
				result.push({
					daysOfWeek: [...rule.daysOfWeek],
					startTime: rule.startTime,
					endTime: rule.endTime,
					startRecur: toISO(cursor),
					endRecur: toISO(prev),
				});
			}
		}

		const next = addDaysUTC(e, 1);
		if (next.getTime() > cursor.getTime()) {
			cursor = next;
		}
	}

	if (cursor.getTime() <= windowEnd.getTime()) {
		result.push({
			daysOfWeek: [...rule.daysOfWeek],
			startTime: rule.startTime,
			endTime: rule.endTime,
			startRecur: toISO(cursor),
			endRecur: toISO(windowEnd),
		});
	}

	return result;
}

function subtractRamadanFromNormal(
	normal: BusinessHoursRule[],
	ramadan: BusinessHoursRule[]
) {
	if (!ramadan || ramadan.length === 0) {
		return normal;
	}

	// Extract and filter intervals from Ramadan rules
	const intervals = ramadan
		.map((r) => ({
			start: r.startRecur ? toUTCDate(r.startRecur) : undefined,
			end: r.endRecur ? toUTCDate(r.endRecur) : undefined,
		}))
		.filter((x) => x.start && x.end) as { start: Date; end: Date }[];

	if (intervals.length === 0) {
		return normal;
	}

	// Merge overlapping Ramadan intervals
	const merged = mergeIntervals(intervals);

	// Subtract merged Ramadan intervals from each normal rule's recurrence window
	const result: BusinessHoursRule[] = [];
	for (const rule of normal) {
		const windowStart = rule.startRecur
			? toUTCDate(rule.startRecur)
			: toUTCDate(`${BUSINESS_HOURS_START_YEAR}-01-01`);
		const windowEnd = rule.endRecur
			? toUTCDate(rule.endRecur)
			: toUTCDate(`${BUSINESS_HOURS_END_YEAR}-12-31`);

		const exceptions = buildRuleExceptions(
			rule,
			windowStart,
			windowEnd,
			merged
		);
		result.push(...exceptions);
	}

	return result;
}

// Cache for Ramadan rules
let RAMADAN_RULES_CACHE: BusinessHoursRule[] | null = null;

// --- Date and Hijri conversion helpers ---
function toUTCDate(iso: string): Date {
	return new Date(`${iso}T00:00:00Z`);
}

function toISO(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function addDaysUTC(d: Date, delta: number): Date {
	const copy = new Date(d);
	copy.setUTCDate(copy.getUTCDate() + delta);
	return copy;
}

// Gregorian calendar constants
const GREGORIAN_EPOCH_OFFSET = 14;
const GREGORIAN_MONTH_ADJUSTMENT = 12;
const GREGORIAN_YEAR_BASE = 4800;
const GREGORIAN_MONTH_BASE = 3;
const GREGORIAN_LEAP_CYCLE = 4;
const GREGORIAN_CENTURY_CYCLE = 100;
const GREGORIAN_400_YEAR_CYCLE = 400;
const JULIAN_DAY_OFFSET = 32_045;
const MONTH_DAYS_COEFFICIENT = 153;
const MONTH_DAYS_DIVISOR = 5;
const DAYS_PER_YEAR = 365;
const ISLAMIC_DECIMAL_29_5 = 29.5;
const DECEMBER_MONTH_INDEX = 11;
const ISLAMIC_DAYS_PER_YEAR = 354;
const ISLAMIC_CYCLE_COEFFICIENT = 3;
const ISLAMIC_CYCLE_MULTIPLIER = 11;
const ISLAMIC_CYCLE_DIVISOR = 30;
const ISLAMIC_EPOCH_MULTIPLIER = 30;
const DATE_UTC_JANUARY = 0;
const DATE_UTC_DECEMBER = 11;
const DATE_UTC_LAST_DAY = 31;

// Gregorian to Julian Day Number
function gregorianToJDN(year: number, month: number, day: number): number {
	const a = Math.floor(
		(GREGORIAN_EPOCH_OFFSET - month) / GREGORIAN_MONTH_ADJUSTMENT
	);
	const y = year + GREGORIAN_YEAR_BASE - a;
	const m = month + GREGORIAN_MONTH_ADJUSTMENT * a - GREGORIAN_MONTH_BASE;
	return (
		day +
		Math.floor((MONTH_DAYS_COEFFICIENT * m + 2) / MONTH_DAYS_DIVISOR) +
		DAYS_PER_YEAR * y +
		Math.floor(y / GREGORIAN_LEAP_CYCLE) -
		Math.floor(y / GREGORIAN_CENTURY_CYCLE) +
		Math.floor(y / GREGORIAN_400_YEAR_CYCLE) -
		JULIAN_DAY_OFFSET
	);
}

// Islamic (civil) to JDN
function islamicToJDN(year: number, month: number, day: number): number {
	return (
		day +
		Math.ceil(ISLAMIC_DECIMAL_29_5 * (month - 1)) +
		(year - 1) * ISLAMIC_DAYS_PER_YEAR +
		Math.floor(
			(ISLAMIC_CYCLE_COEFFICIENT + ISLAMIC_CYCLE_MULTIPLIER * year) /
				ISLAMIC_CYCLE_DIVISOR
		) +
		ISLAMIC_EPOCH -
		1
	);
}

// JDN to Islamic (civil)
function jdnToIslamic(jd: number): {
	year: number;
	month: number;
	day: number;
} {
	const year = Math.floor(
		(ISLAMIC_EPOCH_MULTIPLIER * (jd - ISLAMIC_EPOCH) +
			ISLAMIC_EPOCH_CALCULATION) /
			ISLAMIC_CYCLE_DAYS
	);
	const month = Math.min(
		DECEMBER_MONTH_INDEX + 1,
		Math.ceil((jd - islamicToJDN(year, 1, 1)) / ISLAMIC_DECIMAL_29_5) + 1
	);
	const day = jd - islamicToJDN(year, month, 1) + 1;
	return { year, month, day };
}
