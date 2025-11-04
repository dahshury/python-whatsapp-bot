import type { CalendarEvent } from '@/entities/event'

/**
 * Produce view-optimized events. For multiMonthYear, simplify and control editability.
 */
export function optimizeEventsForView(
  events: CalendarEvent[],
  currentView: string
): CalendarEvent[] {
  if (currentView === 'multiMonthYear') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return events.map((event) => {
      const eventStartDate = new Date(event.start)
      const isPastEvent = eventStartDate < today
      const isReservation = event.extendedProps?.type !== 2

      const allowDrag = !isPastEvent && isReservation

      return {
        ...event,
        // Allow drag/drop for future reservations only
        // FullCalendar accepts these props at the event level; keep them here even if TS type doesn't include them.
        ...(event.editable !== false
          ? { editable: allowDrag, eventStartEditable: allowDrag }
          : { editable: false, eventStartEditable: false }),
        eventDurationEditable: false,
        // Normalize important extended props
        extendedProps: {
          ...(event.extendedProps || {}),
          type: event.extendedProps?.type ?? 0,
          cancelled: event.extendedProps?.cancelled ?? false,
          reservationId: event.extendedProps?.reservationId,
        },
      } as unknown as CalendarEvent
    })
  }

  return events
}


