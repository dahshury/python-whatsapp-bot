import type { CalendarEvent } from "@/entities/event";

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Filter out events with invalid/missing start values.
 * Allow background/allDay events that use date-only strings.
 */
export function sanitizeEvents(events: CalendarEvent[]): CalendarEvent[] {
  try {
    const isDateOnly = (value: string) => DATE_ONLY_REGEX.test(value);
    return (events || []).filter((e: CalendarEvent) => {
      const s = (e as CalendarEvent | undefined)?.start;
      if (!s || typeof s !== "string") {
        return false;
      }
      if ((e.display === "background" || e.allDay === true) && isDateOnly(s)) {
        return true;
      }
      const d = new Date(s);
      return !Number.isNaN(d.getTime());
    });
  } catch {
    return [] as CalendarEvent[];
  }
}
