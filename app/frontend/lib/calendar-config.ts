export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Riyadh";
export const SLOT_DURATION_HOURS = 2; // Streamlit used 2-hour slot intervals

interface BusinessHoursRule {
	daysOfWeek: number[];
	startTime: string;
	endTime: string;
	startRecur?: string;
	endRecur?: string;
}

interface ValidRange {
	start: Date;
}

export function getTimezone(): string {
	return TIMEZONE;
}

export function getBusinessHours(freeRoam: boolean): BusinessHoursRule[] {
	if (freeRoam) return [];
	// Business hours:
	// - Sun-Thu: 11:00-17:00
	// - Sat: 16:00-21:00 (evening only)
	// - Fri: closed (handled via hiddenDays)
	// - Ramadan (if configured via env): 10:00-16:00
	const ramadanRules = getRamadanBusinessHours();
	const normalRules = subtractRamadanFromNormal(
		[
			// Sun(0)-Thu(4): 11:00-17:00
			{
				daysOfWeek: [0, 1, 2, 3, 4],
				startTime: "11:00",
				endTime: "17:00",
				startRecur: "2022-01-01",
				endRecur: "2031-12-31",
			},
			// Saturday(6): 16:00-21:00
			{
				daysOfWeek: [6],
				startTime: "16:00",
				endTime: "21:00",
				startRecur: "2022-01-01",
				endRecur: "2031-12-31",
			},
		],
		ramadanRules,
	);
	return [...ramadanRules, ...normalRules];
}

export function getValidRange(freeRoam: boolean): ValidRange | undefined {
	if (freeRoam) return undefined;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return { start: today };
}

export function getSlotTimes(date: Date, freeRoam: boolean, _view: string) {
	if (freeRoam) return { slotMinTime: "00:00:00", slotMaxTime: "24:00:00" };
	if (isRamadan(date))
		return { slotMinTime: "10:00:00", slotMaxTime: "16:00:00" };
	const day = date.getDay(); // 0=Sun..6=Sat
	if (day >= 0 && day <= 4)
		return { slotMinTime: "11:00:00", slotMaxTime: "17:00:00" };
	if (day === 6)
		return { slotMinTime: "16:00:00", slotMaxTime: "21:00:00" };
	// Friday hidden elsewhere
	return { slotMinTime: "11:00:00", slotMaxTime: "17:00:00" };
}

// Simple Ramadan check using approximate Hijri conversion boundaries is handled on backend.
// Here, treat Hijri month 9 via environment override window when available.
export function isRamadan(date: Date): boolean {
	// Automatic detection using Tabular Islamic (civil) calendar conversion
	try {
		const jd = gregorianToJDN(
			date.getUTCFullYear(),
			date.getUTCMonth() + 1,
			date.getUTCDate(),
		);
		const islamic = jdnToIslamic(jd);
		return islamic.month === 9; // Ramadan is month 9
	} catch {}
	return false;
}

function getRamadanBusinessHours() {
	// Build dynamic Ramadan date ranges for 2022-2031 using automatic detection
	if (RAMADAN_RULES_CACHE) return RAMADAN_RULES_CACHE;
	const ranges: { start: string; end: string }[] = [];
	try {
		const start = new Date(Date.UTC(2022, 0, 1));
		const end = new Date(Date.UTC(2031, 11, 31));
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
				if (rangeStart) ranges.push({ start: rangeStart, end: pend });
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
	} catch {}
	RAMADAN_RULES_CACHE = ranges.map((r) => ({
		daysOfWeek: [0, 1, 2, 3, 4, 6],
		startTime: "10:00",
		endTime: "16:00",
		startRecur: r.start,
		endRecur: r.end,
	}));
	return RAMADAN_RULES_CACHE;
}

function subtractRamadanFromNormal(
	normal: BusinessHoursRule[],
	ramadan: BusinessHoursRule[],
) {
	if (!ramadan || ramadan.length === 0) return normal;
	// Merge Ramadan intervals
	const intervals = ramadan
		.map((r) => ({
			start: r.startRecur ? toUTCDate(r.startRecur) : undefined,
			end: r.endRecur ? toUTCDate(r.endRecur) : undefined,
		}))
		.filter((x) => x.start && x.end) as { start: Date; end: Date }[];
	if (intervals.length === 0) return normal;
	intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
	const merged: { start: Date; end: Date }[] = [];
	for (const iv of intervals) {
		if (merged.length === 0) {
			merged.push({ ...iv });
			continue;
		}
		const lastIdx = merged.length - 1;
		const last = merged[lastIdx];
		if (!last) {
			merged.push({ ...iv });
			continue;
		}
		if (iv.start.getTime() <= addDaysUTC(last.end, 1).getTime()) {
			if (iv.end.getTime() > last.end.getTime()) {
				merged[lastIdx] = { start: last.start, end: iv.end };
			}
		} else {
			merged.push({ ...iv });
		}
	}

	// Subtract merged Ramadan intervals from each normal rule's recurrence window
	const result: BusinessHoursRule[] = [];
	for (const rule of normal) {
		const windowStart = rule.startRecur
			? toUTCDate(rule.startRecur)
			: toUTCDate("2022-01-01");
		const windowEnd = rule.endRecur
			? toUTCDate(rule.endRecur)
			: toUTCDate("2031-12-31");
		let cursor = new Date(windowStart);
		for (const iv of merged) {
			const s = iv.start.getTime() < windowStart.getTime() ? windowStart : iv.start;
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
			if (next.getTime() > cursor.getTime()) cursor = next;
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

// Gregorian to Julian Day Number
function gregorianToJDN(year: number, month: number, day: number): number {
	const a = Math.floor((14 - month) / 12);
	const y = year + 4800 - a;
	const m = month + 12 * a - 3;
	return (
		day +
		Math.floor((153 * m + 2) / 5) +
		365 * y +
		Math.floor(y / 4) -
		Math.floor(y / 100) +
		Math.floor(y / 400) -
		32045
	);
}

// Islamic (civil) to JDN
function islamicToJDN(year: number, month: number, day: number): number {
	const ISLAMIC_EPOCH = 1948439;
	return (
		day +
		Math.ceil(29.5 * (month - 1)) +
		(year - 1) * 354 +
		Math.floor((3 + 11 * year) / 30) +
		ISLAMIC_EPOCH -
		1
	);
}

// JDN to Islamic (civil)
function jdnToIslamic(jd: number): { year: number; month: number; day: number } {
	const year = Math.floor((30 * (jd - 1948439) + 10646) / 10631);
	const month = Math.min(12, Math.ceil((jd - islamicToJDN(year, 1, 1)) / 29.5) + 1);
	const day = jd - islamicToJDN(year, month, 1) + 1;
	return { year, month, day };
}
