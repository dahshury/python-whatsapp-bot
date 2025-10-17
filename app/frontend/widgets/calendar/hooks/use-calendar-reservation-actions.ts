import { orchestrateCancelReservation } from "@processes/calendar/calendar-events.process";
import { useCallback } from "react";
import type { CalendarEvent } from "@/entities/event";
import type { CalendarCoreRef } from "@/widgets/calendar/calendar-core";

type UseCalendarReservationActionsProps = {
	calendarRef: React.RefObject<CalendarCoreRef | null> | undefined;
	events: CalendarEvent[];
	removeEvent: (id: string) => void;
	isLocalized: boolean;
};

type UseCalendarReservationActionsResult = {
	handleCancelReservation: (eventId: string) => Promise<void>;
};

export function useCalendarReservationActions({
	calendarRef,
	events,
	removeEvent,
	isLocalized,
}: UseCalendarReservationActionsProps): UseCalendarReservationActionsResult {
	const handleCancelReservation = useCallback(
		async (eventId: string) => {
			const api = calendarRef?.current?.getApi?.();
			if (!api) {
				return;
			}
			await orchestrateCancelReservation({
				calendarApi: api as unknown as import("@/entities/event").CalendarApi,
				eventId,
				events,
				onEventCancelled: (id: string) => {
					try {
						removeEvent(id);
					} catch {
						// Error handling
					}
				},
				isLocalized,
			});
		},
		[events, isLocalized, calendarRef, removeEvent]
	);

	return { handleCancelReservation };
}
