import type { CalendarEvent } from "@/entities/event";

// Regex for validating date-only format (YYYY-MM-DD)
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function optimizeEvents(
	events: CalendarEvent[],
	currentView: string
): CalendarEvent[] {
	if (currentView === "multiMonthYear") {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return events.map((event) => {
			const eventStartDate = new Date(event.start);
			const isPastEvent = eventStartDate < today;
			const isReservation = event.extendedProps?.type !== 2;
			const allowDrag = !isPastEvent && isReservation;
			return {
				...event,
				editable: event.editable !== false ? allowDrag : false,
				eventStartEditable: event.editable !== false ? allowDrag : false,
				eventDurationEditable: false,
				extendedProps: {
					...(event.extendedProps || {}),
					type: event.extendedProps?.type ?? 0,
					cancelled: event.extendedProps?.cancelled ?? false,
					reservationId: event.extendedProps?.reservationId,
				},
			};
		});
	}
	return events;
}

export function sanitizeEvents(events: CalendarEvent[]): CalendarEvent[] {
	try {
		return (events || []).filter((e: CalendarEvent) => {
			const s = e?.start as unknown as string | undefined;
			if (!s || typeof s !== "string") {
				return false;
			}
			if (
				(e.display === "background" || e.allDay === true) &&
				DATE_ONLY_PATTERN.test(s)
			) {
				return true;
			}
			const d = new Date(s);
			return !Number.isNaN(d.getTime());
		});
	} catch {
		return [] as CalendarEvent[];
	}
}
