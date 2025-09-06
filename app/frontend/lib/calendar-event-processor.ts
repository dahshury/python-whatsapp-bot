import { getSlotTimes, SLOT_DURATION_HOURS } from "@/lib/calendar-config";
import type { CalendarEvent as CalendarEventFull } from "@/types/calendar";
import type { CalendarEvent as EditorEvent } from "@/types/data-table-editor";
import { to24h } from "./utils";

/**
 * Filter out cancelled reservations from calendar events unless free roam is enabled.
 * This is used by calendar views to hide cancellations while still allowing
 * the data table to optionally include them.
 */
export function filterEventsForCalendar(
	events: CalendarEventFull[],
	freeRoam?: boolean,
): CalendarEventFull[] {
	if (freeRoam) return events;
	return events.filter((e) => e.extendedProps?.cancelled !== true);
}

export function processEventsForFreeRoam(
	events: CalendarEventFull[],
	freeRoam: boolean,
): CalendarEventFull[] {
	if (!freeRoam) return events;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return events.map((e) => {
		const startDate = new Date(e.start);
		const isPast = startDate < today;
		// Keep past reservations non-editable in free roam
		const editable =
			e.extendedProps?.type === 2
				? e.editable !== false
				: !isPast && e.editable !== false;
		return { ...e, editable };
	});
}

// Ensure events are aligned to the start of their slot and sequenced without gaps caused by cancellations
export function alignAndSortEventsForCalendar(
	events: CalendarEventFull[],
	freeRoam: boolean,
): CalendarEventFull[] {
	try {
		if (!Array.isArray(events) || events.length === 0) return events;
		// Group by date + slot base time
		const groups = new Map<string, CalendarEventFull[]>();
		for (const ev of events) {
			const dateStr = String((ev.start || "").toString().split("T")[0] || "");
			const hhmm = String(
				(ev.start || "").toString().split("T")[1] || "00:00",
			).slice(0, 5);
			const base = toSlotBase(dateStr, hhmm, freeRoam);
			const key = `${dateStr}_${base}`;
			const arr = groups.get(key) || [];
			arr.push(ev);
			groups.set(key, arr);
		}

		const result: CalendarEventFull[] = [];
		const orderedKeys = Array.from(groups.keys()).sort((a, b) => {
			const [da, ta] = a.split("_");
			const [db, tb] = b.split("_");
			if (da !== db) return da.localeCompare(db);
			return to24h(ta).localeCompare(to24h(tb));
		});

		for (const key of orderedKeys) {
			const [dateStr, baseTime] = key.split("_");
			const slotEvents = groups.get(key) || [];
			// Sort by type then title for deterministic order
			slotEvents.sort((a, b) => {
				const t1 = Number(
					(a as { extendedProps?: { type?: unknown } })?.extendedProps?.type ??
						0,
				);
				const t2 = Number(
					(b as { extendedProps?: { type?: unknown } })?.extendedProps?.type ??
						0,
				);
				if (t1 !== t2) return t1 - t2;
				const n1 = String((a as { title?: string })?.title || "");
				const n2 = String((b as { title?: string })?.title || "");
				return n1.localeCompare(n2);
			});
			// Re-sequence visible events only (cancelled removed earlier), so lengths reflect view
			const minutesPerReservation = slotEvents.length >= 6 ? 15 : 20;
			const gapMinutes = 1;
			let offset = 0;
			const base = to24h(baseTime);
			for (const ev of slotEvents) {
				const startTime = addMinutesToClock(base, Math.floor(offset));
				const endTime = addMinutesToClock(
					base,
					Math.floor(offset + minutesPerReservation),
				);
				result.push({
					...ev,
					// Emit timezone-naive strings; FullCalendar interprets them in configured timeZone
					start: `${dateStr}T${startTime}`,
					end: `${dateStr}T${endTime}`,
					extendedProps: {
						...(ev.extendedProps || {}),
						slotDate: dateStr,
						slotTime: base,
						type: Number(
							(ev as { extendedProps?: { type?: unknown } })?.extendedProps
								?.type ?? 0,
						),
					},
				});
				offset += minutesPerReservation + gapMinutes;
			}
		}

		// Global stable sort by start to satisfy calendar and avoid unsorted passing
		return result.sort((a, b) =>
			String(a.start).localeCompare(String(b.start)),
		);
	} catch {
		return events;
	}
}

// Local helper mirroring reservation-event-processor logic
function toSlotBase(
	dateStr: string,
	timeStr: string,
	freeRoam: boolean,
): string {
	try {
		const baseTime = to24h(String(timeStr || "00:00"));
		const [hh, mm] = baseTime.split(":").map((v) => parseInt(v, 10));
		const minutes =
			(Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
		const day = new Date(`${dateStr}T00:00:00`);
		const { slotMinTime } = getSlotTimes(day, freeRoam, "");
		const [sH, sM] = String(slotMinTime || "00:00:00")
			.slice(0, 5)
			.split(":")
			.map((v) => parseInt(v || "0", 10));
		const minMinutes =
			(Number.isFinite(sH) ? sH : 0) * 60 + (Number.isFinite(sM) ? sM : 0);
		const duration = Math.max(60, (SLOT_DURATION_HOURS || 2) * 60);
		const rel = Math.max(0, minutes - minMinutes);
		const slotIndex = Math.floor(rel / duration);
		const baseMinutes = minMinutes + slotIndex * duration;
		const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, "0");
		const mmOut = String(baseMinutes % 60).padStart(2, "0");
		return `${hhOut}:${mmOut}`;
	} catch {
		return to24h(String(timeStr || "00:00"));
	}
}

// Add minutes to an HH:MM clock string and return HH:MM:SS (no timezone)
function addMinutesToClock(baseTime: string, minutesToAdd: number): string {
	try {
		const [h, m] = baseTime.split(":").map((v) => parseInt(v || "0", 10));
		let total =
			(Number.isFinite(h) ? h : 0) * 60 +
			(Number.isFinite(m) ? m : 0) +
			minutesToAdd;
		if (total < 0) total = 0;
		if (total > 24 * 60 - 1) total = 24 * 60 - 1;
		const hh = String(Math.floor(total / 60)).padStart(2, "0");
		const mm = String(total % 60).padStart(2, "0");
		return `${hh}:${mm}:00`;
	} catch {
		return `${baseTime}:00`;
	}
}

export function filterEventsForDataTable(
	events: CalendarEventFull[],
	_currentView?: string,
	freeRoam?: boolean,
): CalendarEventFull[] {
	// Exclude cancelled unless freeRoam explicitly enabled
	if (freeRoam) return events;
	return events.filter((e) => e.extendedProps?.cancelled !== true);
}

export function transformEventsForDataTable(
	events: CalendarEventFull[],
): EditorEvent[] {
	return events.map((e) => ({
		id: e.id,
		title: e.title,
		start: e.start,
		end: e.end,
		type: e.extendedProps?.cancelled ? "cancellation" : "reservation",
		extendedProps: {
			type: e.extendedProps?.type ?? 0,
			cancelled: e.extendedProps?.cancelled ?? false,
			reservationId: (() => {
				const rid: unknown = e.extendedProps?.reservationId as unknown;
				const n = typeof rid === "string" ? Number(rid) : (rid as number);
				return Number.isFinite(n) ? (n as number) : undefined;
			})(),
			customerName: (e as { extendedProps?: { customerName?: string } })
				.extendedProps?.customerName,
			phone: (e as { extendedProps?: { phone?: string } }).extendedProps?.phone,
			waId:
				(e as { extendedProps?: { waId?: string; wa_id?: string } })
					.extendedProps?.waId ||
				(e as { extendedProps?: { waId?: string; wa_id?: string } })
					.extendedProps?.wa_id,
			status: (e as { extendedProps?: { status?: string } }).extendedProps
				?.status,
		},
	}));
}
