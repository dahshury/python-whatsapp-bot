import type { CalendarEvent as CalendarEventFull } from "@/types/calendar";
import type { CalendarEvent as EditorEvent } from "@/types/data-table-editor";

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
    const editable = e.extendedProps?.type === 2 ? e.editable !== false : !isPast && e.editable !== false;
    return { ...e, editable };
  });
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
      reservationId: e.extendedProps?.reservationId,
      customerName: (e as any).extendedProps?.customerName,
      phone: (e as any).extendedProps?.phone,
      waId: (e as any).extendedProps?.waId || (e as any).extendedProps?.wa_id,
      status: (e as any).extendedProps?.status,
    },
  }));
}


