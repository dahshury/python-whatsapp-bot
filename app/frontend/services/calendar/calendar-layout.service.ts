import type { EventApi } from "@fullcalendar/core";
import { sortCalendarObjectsByTypeThenTitleInPlace } from "@processes/calendar/calendar-sorting.process";
import {
	getSlotTimes,
	SLOT_DURATION_HOURS,
} from "@shared/libs/calendar/calendar-config";
import { to24h } from "@shared/libs/utils";

// Debug flag - set to true to enable detailed logging
const DEBUG_REFLOW = false;

// Constants for time string manipulation
const TIME_STRING_HALF_LENGTH = 5;
const CONVERSATION_MARKER_TYPE = 2;
const MINUTES_PER_HOUR = 60;
const MIN_SLOT_DURATION_MINUTES = 60;
const SHORT_DURATION_MINUTES_PER_RESERVATION = 15;
const STANDARD_DURATION_MINUTES_PER_RESERVATION = 20;
const MIN_EVENTS_FOR_SHORT_DURATION = 6;

function debugLog(_label: string, _data: unknown): void {
	if (DEBUG_REFLOW) {
		// Logging is disabled when DEBUG_REFLOW is false
	}
}

export function computeSlotBase(dateStr: string, timeSlotRaw: string): string {
	try {
		const baseTime = to24h(String(timeSlotRaw || "00:00"));
		const parts = baseTime.split(":");
		const hh = Number.parseInt(String(parts[0] ?? "0"), 10);
		const mm = Number.parseInt(String(parts[1] ?? "0"), 10);
		const minutes =
			(Number.isFinite(hh) ? hh : 0) * MINUTES_PER_HOUR +
			(Number.isFinite(mm) ? mm : 0);
		const day = new Date(`${dateStr}T00:00:00`);
		const { slotMinTime } = getSlotTimes(day, false, "") || {
			slotMinTime: "00:00:00",
		};
		const tparts = String(slotMinTime || "00:00:00")
			.slice(0, TIME_STRING_HALF_LENGTH)
			.split(":");
		const sH = Number.parseInt(String(tparts[0] ?? "0"), 10);
		const sM = Number.parseInt(String(tparts[1] ?? "0"), 10);
		const minMinutes =
			(Number.isFinite(sH) ? sH : 0) * MINUTES_PER_HOUR +
			(Number.isFinite(sM) ? sM : 0);
		const duration = Math.max(
			MIN_SLOT_DURATION_MINUTES,
			(SLOT_DURATION_HOURS || 2) * MINUTES_PER_HOUR
		);
		const rel = Math.max(0, minutes - minMinutes);
		const slotIndex = Math.floor(rel / duration);
		const baseMinutes = minMinutes + slotIndex * duration;
		const hhOut = String(Math.floor(baseMinutes / MINUTES_PER_HOUR)).padStart(
			2,
			"0"
		);
		const mmOut = String(baseMinutes % MINUTES_PER_HOUR).padStart(2, "0");
		return `${hhOut}:${mmOut}`;
	} catch {
		return to24h(String(timeSlotRaw || "00:00"));
	}
}

// Step 2: Sort checkups before follow-ups (lower type first), then by title
export function sortCheckupsBeforeFollowupsInPlace(
	inSlot: Array<{ title?: string; extendedProps?: { type?: unknown } }>
): Array<{ title?: string; extendedProps?: { type?: unknown } }> {
	return sortCalendarObjectsByTypeThenTitleInPlace(inSlot);
}

// Collect events strictly by stamped metadata for a given slot
function getEventsInSlotStrict(
	all: EventApi[],
	dateStr: string,
	baseTime: string
): EventApi[] {
	const strict = all.filter((e: EventApi) => {
		const ext = (e?.extendedProps || {}) as {
			type?: unknown;
			cancelled?: boolean;
			slotDate?: string;
			slotTime?: string;
		};
		const t = Number(ext.type ?? 0);
		if (t === CONVERSATION_MARKER_TYPE) {
			return false; // exclude conversation markers
		}
		if (ext.cancelled === true) {
			return false; // exclude cancelled in normal mode
		}
		return ext.slotDate === dateStr && ext.slotTime === baseTime;
	});
	debugLog(
		"getEventsInSlotStrict(" +
			dateStr +
			", " +
			baseTime +
			"): found " +
			strict.length,
		{
			events: strict.map((e) => ({
				id: e.id,
				title: e.title,
				start: e.startStr,
				slotDate: (e.extendedProps as { slotDate?: string })?.slotDate,
				slotTime: (e.extendedProps as { slotTime?: string })?.slotTime,
				type: (e.extendedProps as { type?: unknown })?.type,
				cancelled: (e.extendedProps as { cancelled?: boolean })?.cancelled,
			})),
		}
	);
	return strict;
}

// Fallback: include events in the computed slot time window (by start time) and stamp metadata
function getEventsInSlotWindow(
	all: EventApi[],
	dateStr: string,
	baseTime: string
): EventApi[] {
	const toMinutes = (hhmm: string): number => {
		try {
			const [h, m] = String(hhmm || "00:00")
				.slice(0, TIME_STRING_HALF_LENGTH)
				.split(":")
				.map((v) => Number.parseInt(v, 10));
			return (
				(Number.isFinite(h ?? 0) ? (h ?? 0) : 0) * MINUTES_PER_HOUR +
				(Number.isFinite(m ?? 0) ? (m ?? 0) : 0)
			);
		} catch {
			return 0;
		}
	};
	const baseTotal = toMinutes(baseTime);
	const duration = Math.max(
		MIN_SLOT_DURATION_MINUTES,
		(SLOT_DURATION_HOURS || 2) * MINUTES_PER_HOUR
	);
	const endTotal = baseTotal + duration;
	debugLog(
		"getEventsInSlotWindow(" +
			dateStr +
			", " +
			baseTime +
			"): window=[" +
			baseTotal +
			"-" +
			endTotal +
			"]",
		{}
	);
	const windowMatches: EventApi[] = [];
	for (const e of all) {
		if (
			shouldIncludeEventInWindow(
				e,
				dateStr,
				baseTime,
				baseTotal,
				endTotal,
				toMinutes
			)
		) {
			windowMatches.push(e);
		}
	}
	debugLog(
		"getEventsInSlotWindow(" +
			dateStr +
			", " +
			baseTime +
			"): found " +
			windowMatches.length,
		{
			events: windowMatches.map((e) => ({
				id: e.id,
				title: e.title,
				start: e.startStr,
			})),
		}
	);
	return windowMatches;
}

// biome-ignore lint/nursery/useMaxParams: Multiple parameters needed for event filtering logic
function shouldIncludeEventInWindow(
	e: EventApi,
	dateStr: string,
	baseTime: string,
	baseTotal: number,
	endTotal: number,
	toMinutes: (hhmm: string) => number
): boolean {
	try {
		const ext = (e?.extendedProps || {}) as {
			type?: unknown;
			cancelled?: boolean;
		};
		const t = Number(ext.type ?? 0);
		if (t === CONVERSATION_MARKER_TYPE) {
			return false;
		}
		if (ext.cancelled === true) {
			return false;
		}
		const s = e.startStr || "";
		if (!s?.includes("T")) {
			return false;
		}
		const [d, time] = s.split("T");
		if (d !== dateStr) {
			return false;
		}
		const tm = toMinutes(String(time || "00:00"));
		if (tm >= baseTotal && tm < endTotal) {
			// Stamp metadata to lock this event into the computed slot
			try {
				e.setExtendedProp?.("slotDate", dateStr);
			} catch {
				// Silently ignore if slot date property setting fails
			}
			try {
				e.setExtendedProp?.("slotTime", baseTime);
			} catch {
				// Silently ignore if slot time property setting fails
			}
			debugLog(
				"  Added to window: " +
					e.id +
					" (" +
					e.title +
					") @ " +
					e.startStr +
					" (" +
					tm +
					"m)",
				{}
			);
			return true;
		}
	} catch {
		// Silently ignore event processing errors
	}
	return false;
}

// Step 1 and 3: Align top event to slot start, and enforce exact 1-minute gaps between events
export function setAlignedTimesWithOneMinuteGaps(
	inSlot: EventApi[],
	dateStr: string,
	baseTime: string,
	minutesPerReservation: number
): void {
	debugLog(
		"setAlignedTimesWithOneMinuteGaps(" +
			dateStr +
			", " +
			baseTime +
			"): " +
			inSlot.length +
			" events, " +
			minutesPerReservation +
			"min/ea",
		{}
	);
	const gapMinutes = 1;
	let offset = 0;

	// Parse base time into hours and minutes
	const timeParts = baseTime.split(":").map((n) => Number.parseInt(n, 10));
	const baseHour = timeParts[0] || 0;
	const baseMinute = timeParts[1] || 0;

	for (const ev of inSlot) {
		// Calculate start time with offset
		const totalMinutes =
			baseHour * MINUTES_PER_HOUR + baseMinute + Math.floor(offset);
		const startHour = Math.floor(totalMinutes / MINUTES_PER_HOUR);
		const startMinute = totalMinutes % MINUTES_PER_HOUR;

		// Calculate end time
		const endTotalMinutes = totalMinutes + minutesPerReservation;
		const endHour = Math.floor(endTotalMinutes / MINUTES_PER_HOUR);
		const endMinute = endTotalMinutes % MINUTES_PER_HOUR;

		// Create timezone-naive ISO strings (FullCalendar will interpret in configured timezone)
		const startStr =
			dateStr +
			"T" +
			String(startHour).padStart(2, "0") +
			":" +
			String(startMinute).padStart(2, "0") +
			":00";
		const endStr =
			dateStr +
			"T" +
			String(endHour).padStart(2, "0") +
			":" +
			String(endMinute).padStart(2, "0") +
			":00";

		debugLog(
			"  Setting " +
				ev.id +
				" (" +
				ev.title +
				"): start=" +
				startStr +
				", end=" +
				endStr +
				", offset=" +
				offset,
			{}
		);
		try {
			// Pass timezone-naive strings - FullCalendar interprets in configured timeZone
			(ev as EventApi).setDates(startStr, endStr);
		} catch {
			// Silently ignore setDates errors
		}
		debugLog(
			"  AFTER setDates " +
				ev.id +
				": startStr=" +
				(ev as EventApi).startStr +
				", start=" +
				((ev as EventApi).start?.toISOString() || "null"),
			{}
		);
		try {
			(ev as EventApi).setExtendedProp("slotDate", dateStr);
		} catch {
			// Silently ignore extended property errors
		}
		try {
			(ev as EventApi).setExtendedProp("slotTime", baseTime);
		} catch {
			// Silently ignore extended property errors
		}
		offset += minutesPerReservation + gapMinutes;
	}
}

export function reflowSlot(
	api: { getEvents?: () => EventApi[] },
	dateStr: string,
	timeSlotRaw: string,
	options?: { strictOnly?: boolean }
): void {
	try {
		debugLog(`reflowSlot(${dateStr}, ${timeSlotRaw}): START`, {});
		const baseTime = computeSlotBase(dateStr, timeSlotRaw);
		debugLog(`  Computed baseTime: ${baseTime}`, {});
		if (!api?.getEvents) {
			return;
		}
		const all = (api.getEvents?.() || []) as EventApi[];
		debugLog(`  Total events in calendar: ${all.length}`, {});
		const strict = getEventsInSlotStrict(all, dateStr, baseTime);
		const windowMatches = options?.strictOnly
			? []
			: getEventsInSlotWindow(all, dateStr, baseTime);
		const dedupedWindowMatches = windowMatches.filter(
			(e) => !strict.includes(e)
		);
		const inSlot: EventApi[] = [...strict, ...dedupedWindowMatches];
		debugLog(
			"  Final inSlot: " +
				inSlot.length +
				" (strict=" +
				strict.length +
				", window=" +
				dedupedWindowMatches.length +
				")",
			{
				events: inSlot.map((e) => ({
					id: e.id,
					title: e.title,
					start: e.startStr,
					type: (e.extendedProps as { type?: unknown })?.type,
				})),
			}
		);
		if (inSlot.length === 0) {
			return;
		}
		debugLog("  BEFORE sort:", {
			events: inSlot.map((e) => ({
				id: e.id,
				type: (e.extendedProps as { type?: unknown })?.type,
				title: e.title,
			})),
		});
		sortCheckupsBeforeFollowupsInPlace(
			inSlot as Array<{ title?: string; extendedProps?: { type?: unknown } }>
		);
		debugLog("  AFTER sort:", {
			events: inSlot.map((e) => ({
				id: e.id,
				type: (e.extendedProps as { type?: unknown })?.type,
				title: e.title,
			})),
		});
		const minutesPerReservation =
			inSlot.length >= MIN_EVENTS_FOR_SHORT_DURATION
				? SHORT_DURATION_MINUTES_PER_RESERVATION
				: STANDARD_DURATION_MINUTES_PER_RESERVATION;
		setAlignedTimesWithOneMinuteGaps(
			inSlot,
			dateStr,
			baseTime,
			minutesPerReservation
		);
		debugLog(`reflowSlot(${dateStr}, ${baseTime}): END`, {});
	} catch {
		// Silently ignore reflow errors
	}
}
