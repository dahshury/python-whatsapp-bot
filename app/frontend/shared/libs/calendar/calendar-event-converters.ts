type DataTableEvent = {
  id?: string | number;
  reservationId?: string;
  key?: string | number;
  start?: string | Date;
  startDate?: string | Date;
  date?: string | Date;
  begin?: string | Date;
  end?: string | Date;
  endDate?: string | Date;
  title?: string;
  name?: string;
  backgroundColor?: string;
  bgColor?: string;
  borderColor?: string;
  editable?: boolean;
  extendedProps?: {
    slotDate?: string;
    slotTime?: string;
    type?: string | number;
    cancelled?: boolean;
    reservationId?: string;
    [key: string]: unknown;
  };
  type?: string | number;
  cancelled?: boolean;
  [key: string]: unknown;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string | Date | undefined;
  end: string | Date | undefined;
  backgroundColor: string;
  borderColor: string;
  editable: boolean;
  extendedProps: {
    type: string | number;
    cancelled: boolean;
    reservationId?: string;
    slotDate?: string;
    slotTime?: string;
    [key: string]: unknown;
  };
};

export function convertDataTableEventToCalendarEvent(
  event: DataTableEvent
): CalendarEvent {
  if (!event) {
    return {
      id: "",
      title: "",
      start: undefined,
      end: undefined,
      backgroundColor: "",
      borderColor: "",
      editable: false,
      extendedProps: {
        type: 0,
        cancelled: false,
      },
    };
  }
  const start = event.start || event.startDate || event.date || event.begin;
  const end = event.end || event.endDate || start;
  const slotDate =
    event.extendedProps?.slotDate ||
    (typeof start === "string" ? String(start).split("T")[0] : undefined);
  const slotTime =
    event.extendedProps?.slotTime ||
    (typeof start === "string"
      ? (() => {
          // Extract time format (HH:MM) from ISO string
          const TIME_FORMAT_LENGTH = 5;
          return String(start).split("T")[1]?.slice(0, TIME_FORMAT_LENGTH);
        })()
      : undefined);
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
      ...((event.extendedProps?.reservationId ?? event.reservationId)
        ? {
            reservationId:
              event.extendedProps?.reservationId ?? event.reservationId,
          }
        : {}),
      ...(slotDate ? { slotDate } : {}),
      ...(slotTime ? { slotTime } : {}),
      ...event.extendedProps,
    },
  };
}
