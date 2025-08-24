export function convertDataTableEventToCalendarEvent(event: any): any {
  if (!event) return event;
  const start = event.start || event.startDate || event.date || event.begin;
  const end = event.end || event.endDate || start;
  return {
    id: String(event.id ?? event.reservationId ?? event.key ?? Math.random()),
    title: event.title ?? event.name ?? "",
    start,
    end,
    backgroundColor: event.backgroundColor ?? event.bgColor ?? "",
    borderColor: event.borderColor ?? event.bgColor ?? "",
    editable: event.editable !== false,
    extendedProps: {
      type: event.extendedProps?.type ?? event.type ?? 0,
      cancelled: event.extendedProps?.cancelled ?? event.cancelled ?? false,
      reservationId: event.extendedProps?.reservationId ?? event.reservationId,
      ...event.extendedProps,
    },
  };
}


