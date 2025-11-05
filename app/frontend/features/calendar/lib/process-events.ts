import type { CalendarEvent } from "@/entities/event";
import { filterEventsForCalendar } from "../services/calendar-events.service";

export function processEventsForCalendar(
  allEvents: CalendarEvent[],
  freeRoam: boolean
): CalendarEvent[] {
  const base = filterEventsForCalendar(allEvents, freeRoam);
  if (!freeRoam) {
    return base;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return base.map((event: CalendarEvent) => {
    const eventStartDate = new Date(event.start);
    const typeVal = (event.extendedProps as { type?: number } | undefined)
      ?.type;
    if (typeVal !== 2 && eventStartDate < today) {
      return {
        ...event,
        editable: false,
        eventStartEditable: false,
        eventDurationEditable: false,
        className: event.className
          ? [...event.className, "past-reservation-freeroam"]
          : ["past-reservation-freeroam"],
      };
    }
    return event;
  });
}
