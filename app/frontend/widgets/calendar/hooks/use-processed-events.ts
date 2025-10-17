import { useMemo } from "react";
import type { CalendarEvent } from "@/entities/event";
import {
	alignAndSortEventsForCalendar,
	filterEventsForCalendar,
	processEventsForFreeRoam,
} from "@/processes/calendar/calendar-events.process";

export function useProcessedEvents(
	events: CalendarEvent[] | undefined,
	freeRoam: boolean
): CalendarEvent[] {
	return useMemo(() => {
		const source = Array.isArray(events) ? events : [];
		const filtered = filterEventsForCalendar(source, freeRoam);
		const aligned = alignAndSortEventsForCalendar(filtered, freeRoam);
		return processEventsForFreeRoam(aligned, freeRoam);
	}, [events, freeRoam]);
}
