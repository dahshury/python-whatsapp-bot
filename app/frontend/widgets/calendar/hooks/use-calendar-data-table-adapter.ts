import { convertDataTableEventToCalendarEvent } from "@shared/libs/calendar/calendar-event-converters";
import { useCallback } from "react";
import type { CalendarEvent } from "@/entities/event";

type UseCalendarDataTableAdapterProps = {
	addEvent: (event: CalendarEvent) => void;
	updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
	removeEvent: (id: string) => void;
};

type UseCalendarDataTableAdapterResult = {
	handleEventAdded: (event: unknown) => void;
	handleEventModified: (eventId: string, event: unknown) => void;
	handleEventCancelled: (eventId: string) => void;
};

// Helper to extract string value or empty string
const getStringOrEmpty = (value: unknown): string =>
	typeof value === "string" ? value : "";

// Helper to get end date, falling back to start date if needed
const getEndDate = (endValue: unknown, startValue: unknown): string => {
	if (typeof endValue === "string") {
		return endValue;
	}
	if (typeof startValue === "string") {
		return startValue;
	}
	return "";
};

// Helper to extract type property safely
const getEventType = (type: unknown): number => {
	if (typeof type === "number") {
		return type;
	}
	const parsed = Number(type);
	return Number.isNaN(parsed) ? 0 : parsed;
};

// Helper to extract reservation ID safely
const getReservationId = (reservationId: unknown): number | undefined => {
	if (typeof reservationId === "number") {
		return reservationId;
	}
	if (typeof reservationId === "string") {
		const parsed = Number(reservationId);
		return Number.isNaN(parsed) ? undefined : parsed;
	}
	return;
};

// Helper to extract phone ID safely
const getPhoneId = (phoneId: unknown): string | undefined => {
	if (typeof phoneId === "string") {
		return phoneId;
	}
	if (typeof phoneId === "number") {
		return String(phoneId);
	}
	return;
};

export function useCalendarDataTableAdapter({
	addEvent,
	updateEvent,
	removeEvent,
}: UseCalendarDataTableAdapterProps): UseCalendarDataTableAdapterResult {
	const handleEventAdded = useCallback(
		(event: unknown) => {
			if (event && typeof event === "object") {
				const calendarEvent = convertDataTableEventToCalendarEvent(
					event as Record<string, unknown>
				);

				addEvent({
					id: calendarEvent.id,
					title: calendarEvent.title,
					start: getStringOrEmpty(calendarEvent.start),
					end: getEndDate(calendarEvent.end, calendarEvent.start),
					extendedProps: {
						...calendarEvent.extendedProps,
						type: getEventType(calendarEvent.extendedProps?.type),
						reservationId: getReservationId(
							calendarEvent.extendedProps?.reservationId
						),
					},
				});
			}
		},
		[addEvent]
	);

	const handleEventModified = useCallback(
		(eventId: string, event: unknown) => {
			if (event && typeof event === "object") {
				const calendarEvent = convertDataTableEventToCalendarEvent(
					event as Record<string, unknown>
				);

				// Ensure waId/phone propagate so the grid sees the new phone immediately
				const phoneIdWaId = getPhoneId(
					(calendarEvent.extendedProps as Record<string, unknown>)?.waId ??
						(calendarEvent.extendedProps as Record<string, unknown>)?.wa_id
				);
				const phoneIdWaIdAlt = getPhoneId(
					(calendarEvent.extendedProps as Record<string, unknown>)?.wa_id ??
						(calendarEvent.extendedProps as Record<string, unknown>)?.waId
				);
				updateEvent(eventId, {
					id: calendarEvent.id,
					title: calendarEvent.title,
					start: getStringOrEmpty(calendarEvent.start),
					end: getEndDate(calendarEvent.end, calendarEvent.start),
					extendedProps: {
						...calendarEvent.extendedProps,
						type: getEventType(calendarEvent.extendedProps?.type),
						reservationId: getReservationId(
							calendarEvent.extendedProps?.reservationId
						),
						...(phoneIdWaId !== undefined && { waId: phoneIdWaId }),
						...(phoneIdWaIdAlt !== undefined && { wa_id: phoneIdWaIdAlt }),
					},
				});
			}
		},
		[updateEvent]
	);

	const handleEventCancelled = useCallback(
		(eventId: string) => {
			removeEvent(eventId);
		},
		[removeEvent]
	);

	return { handleEventAdded, handleEventModified, handleEventCancelled };
}
