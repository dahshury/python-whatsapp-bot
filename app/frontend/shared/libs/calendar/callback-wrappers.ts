import type {
  DateSelectArg,
  CalendarApi as FC_CalendarApi,
} from "@fullcalendar/core";
import type { DateClickInfo } from "./calendar-callbacks";

/**
 * Creates a stable wrapper for FullCalendar's dateClick callback, binding the current view type.
 */
export function createDateClickWrapper(getCurrentView: () => string) {
  return (callback: (info: DateClickInfo) => void) =>
    (info: { date: Date; dateStr: string; allDay: boolean }) => {
      const wrappedInfo = {
        ...info,
        view: { type: getCurrentView() },
      };
      callback(wrappedInfo);
    };
}

/**
 * Creates a stable wrapper for FullCalendar's select callback, binding the current view type.
 * Produces a minimal DateSelectArg-compatible shape consumed by downstream handlers.
 */
export function createSelectWrapper(getCurrentView: () => string) {
  return (callback: (info: DateSelectArg) => void) =>
    (info: {
      start: Date;
      end: Date;
      startStr: string;
      endStr: string;
      allDay: boolean;
    }) => {
      const wrappedInfo = {
        ...info,
        view: {
          type: getCurrentView(),
          calendar: null as unknown as FC_CalendarApi,
          title: getCurrentView(),
          activeStart: new Date(),
          activeEnd: new Date(),
          currentStart: new Date(),
          currentEnd: new Date(),
          isDefault: false,
          getOption: () => null,
        },
        jsEvent: new MouseEvent("click"),
        resource: null,
      } as unknown as DateSelectArg;
      callback(wrappedInfo);
    };
}
