export type VacationDateChecker = (dateStr: string) => boolean;

import { getSlotTimes, SLOT_DURATION_HOURS } from "./calendar-config";

export type CalendarCallbackHandlers = {
  isLocalized: boolean;
  currentView: string;
  isVacationDate: (d: string) => boolean;
  openEditor: (opts: { start: string; end?: string }) => void;
  handleOpenConversation: (id: string) => void;
  handleEventChange: (
    info: import("@fullcalendar/core").EventChangeArg
  ) => Promise<void>;
};

// FullCalendar callback info types
export type DateClickInfo = {
  date: Date;
  dateStr: string;
  allDay: boolean;
  view: {
    type: string;
    calendar?: {
      getOption: <T>(option: string) => T;
    };
  };
};

type SelectInfo = {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  allDay: boolean;
  view: {
    type: string;
  };
};

type EventClickInfo = {
  event: {
    id: string;
    title: string;
    start: Date | null;
    end?: Date | null;
  };
  el: HTMLElement;
  view: {
    type: string;
  };
};

export type CalendarCallbacks = {
  // FullCalendar-compatible callback shapes expected by components
  dateClick: (info: DateClickInfo) => void;
  select: (info: SelectInfo) => void;
  eventClick: (info: EventClickInfo) => void;
};

type CreateCalendarCallbacksOptions = {
  handlers: CalendarCallbackHandlers;
  freeRoam: boolean;
  timezone: string;
  currentDate: Date | string | undefined;
  handleVacationDateClick?: (date: Date) => void;
  setCurrentDate?: (
    date: Date,
    options?: {
      updateSlotFocus?: boolean;
    }
  ) => void;
  currentView?: string;
};

export function createCalendarCallbacks(
  options: CreateCalendarCallbacksOptions
): CalendarCallbacks {
  const {
    handlers,
    freeRoam,
    timezone: _timezone,
    currentDate: _currentDate,
    handleVacationDateClick,
    setCurrentDate,
    currentView,
  } = options;
  const getDateOnly = (value: string | Date): string => {
    const d = typeof value === "string" ? new Date(value) : value;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const atMidday = (dateOnly: string): Date => new Date(`${dateOnly}T12:00:00`);
  // const toMinutes = (time: string | undefined): number | null => {
  // 	if (!time) return null;
  // 	const [h, m] = time.split(":");
  // 	const hh = parseInt(h || "0", 10);
  // 	const mm = parseInt(m || "0", 10);
  // 	if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  // 	return hh * 60 + mm;
  // };

  return {
    // Handle clicking a day cell
    dateClick: (info: DateClickInfo) => {
      const clickedDate: Date =
        info?.date instanceof Date
          ? info.date
          : new Date(info?.date || Date.now());

      // If recording vacation, delegate to vacation handler
      if (handleVacationDateClick) {
        handleVacationDateClick(clickedDate);
        return;
      }

      const dateOnly = info?.dateStr
        ? (info.dateStr as string).split("T")[0]
        : getDateOnly(clickedDate);

      // Skip vacation days
      if (handlers.isVacationDate(dateOnly as string)) {
        return;
      }

      const viewType: string =
        info?.view?.type || (currentView as string) || "";
      const isTimeGrid = viewType?.toLowerCase().includes("timegrid");

      // Compute slot times for the clicked date and currently displayed range
      const targetSlotTimes = getSlotTimes(
        atMidday(dateOnly || ""),
        freeRoam,
        viewType
      );
      const currentDateForSlots: Date = (() => {
        try {
          if (typeof _currentDate === "string") {
            return new Date(_currentDate);
          }
          if (_currentDate instanceof Date) {
            return _currentDate;
          }
        } catch {
          // Date parsing failed; fall back to clicked date
        }
        return clickedDate;
      })();
      const currentSlotTimes = getSlotTimes(
        atMidday(getDateOnly(currentDateForSlots)),
        freeRoam,
        viewType
      );

      // If in a time grid view and the displayed business hour window differs
      // from the clicked date's business hours, update the displayed range only
      if (
        isTimeGrid &&
        !freeRoam &&
        (currentSlotTimes.slotMinTime !== targetSlotTimes.slotMinTime ||
          currentSlotTimes.slotMaxTime !== targetSlotTimes.slotMaxTime)
      ) {
        if (setCurrentDate) {
          setCurrentDate(clickedDate);
        }
        return; // Do not open editor; just update displayed slot range
      }

      // Sync currentDate to the clicked date (no-op if already equal)
      if (setCurrentDate) {
        setCurrentDate(clickedDate);
      }

      // Open editor: include time (with computed end) for timeGrid, date-only otherwise
      if (isTimeGrid) {
        // Ensure clicks outside business hours snap to the day's slotMinTime
        let startStr: string =
          info?.dateStr || `${dateOnly}T${targetSlotTimes.slotMinTime}`;
        try {
          const timePart =
            startStr.split("T")[1] || targetSlotTimes.slotMinTime;
          const timeParts = timePart
            .split(":")
            .map((v: string) => Number.parseInt(v || "0", 10));
          const [hh = 0, mm = 0, _ss = 0] = timeParts;
          const [minH = 0, minM = 0] = targetSlotTimes.slotMinTime
            .split(":")
            .map((v: string) => Number.parseInt(v || "0", 10));
          const [maxH = 24, maxM = 0] = targetSlotTimes.slotMaxTime
            .split(":")
            .map((v: string) => Number.parseInt(v || "0", 10));
          const currentMin = hh * 60 + mm;
          const allowedMin = minH * 60 + minM;
          const allowedMax = maxH * 60 + maxM;
          if (currentMin < allowedMin || currentMin >= allowedMax) {
            startStr = `${dateOnly}T${targetSlotTimes.slotMinTime}`;
          }
        } catch {
          startStr = `${dateOnly}T${targetSlotTimes.slotMinTime}`;
        }
        const startDate = new Date(startStr);
        // If not in free roam and the clicked time is in the past, allow if within current in-progress slot
        if (!freeRoam && startDate.getTime() < Date.now()) {
          try {
            const timePart = (startStr.split("T")[1] ||
              targetSlotTimes.slotMinTime) as string;
            const [ch, cm] = timePart
              .split(":")
              .map((v) => Number.parseInt(String(v || "0"), 10));
            const clickedMinutes =
              (Number.isFinite(ch) ? (ch as number) : 0) * 60 +
              (Number.isFinite(cm) ? (cm as number) : 0);
            const [minH, minM] = targetSlotTimes.slotMinTime
              .split(":")
              .map((v: string) => Number.parseInt(String(v || "0"), 10));
            const minMinutes =
              (Number.isFinite(minH) ? (minH as number) : 0) * 60 +
              (Number.isFinite(minM) ? (minM as number) : 0);
            const duration = Math.max(60, (SLOT_DURATION_HOURS || 2) * 60);
            const rel = Math.max(0, clickedMinutes - minMinutes);
            const slotIndex = Math.floor(rel / duration);
            const baseMinutes = minMinutes + slotIndex * duration;
            const endMinutes = baseMinutes + duration;
            const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
            const endM = String(endMinutes % 60).padStart(2, "0");
            const slotEnd = new Date(
              `${dateOnly}T${endH}:${endM}:00`
            ).getTime();
            if (Date.now() >= slotEnd) {
              return; // fully ended
            }
          } catch {
            // Computation failed; conservative: block
            return;
          }
        }
        const MS_PER_SECOND = 1000;
        const SECONDS_PER_MINUTE = 60;
        const MINUTES_PER_HOUR = 60;
        const MS_PER_HOUR =
          MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
        const endDate = new Date(
          startDate.getTime() + SLOT_DURATION_HOURS * MS_PER_HOUR
        );
        handlers.openEditor({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        });
      } else {
        // For date-only views, prevent opening editor on past calendar dates when not in free roam
        if (!freeRoam) {
          const todayMidnight = new Date();
          todayMidnight.setHours(0, 0, 0, 0);
          const clickedMidnight = new Date(`${dateOnly}T00:00:00`);
          if (clickedMidnight.getTime() < todayMidnight.getTime()) {
            return;
          }
        }
        handlers.openEditor({ start: dateOnly || "" });
      }
    },

    // Handle drag-select range in time grid
    select: (info: SelectInfo) => {
      // If recording vacation, treat selection same as a click on the start date
      if (handleVacationDateClick) {
        const startStr: string | undefined = info?.startStr;
        const d = startStr ? new Date(startStr) : new Date();
        handleVacationDateClick(d);
        return;
      }
      const startStr: string | undefined = info?.startStr;
      const endStr: string | undefined = info?.endStr;

      if (startStr) {
        const startDateOnly = startStr.split("T")[0];
        if (handlers.isVacationDate(startDateOnly as string)) {
          return;
        }
      }

      // Prevent past selection when not in free roam, but allow if within the current in-progress slot
      if (!freeRoam && startStr) {
        const start = new Date(startStr);
        if (start.getTime() < Date.now()) {
          try {
            const dateOnly = startStr.split("T")[0] as string;
            const slotTimes = getSlotTimes(
              new Date(`${dateOnly}T12:00:00`),
              freeRoam,
              info?.view?.type || ""
            );
            const timePart = (startStr.split("T")[1] ||
              slotTimes.slotMinTime) as string;
            const [ch, cm] = timePart
              .split(":")
              .map((v) => Number.parseInt(String(v || "0"), 10));
            const clickedMinutes =
              (Number.isFinite(ch) ? (ch as number) : 0) * 60 +
              (Number.isFinite(cm) ? (cm as number) : 0);
            const [minH, minM] = slotTimes.slotMinTime
              .split(":")
              .map((v: string) => Number.parseInt(String(v || "0"), 10));
            const minMinutes =
              (Number.isFinite(minH) ? (minH as number) : 0) * 60 +
              (Number.isFinite(minM) ? (minM as number) : 0);
            const duration = Math.max(60, (SLOT_DURATION_HOURS || 2) * 60);
            const rel = Math.max(0, clickedMinutes - minMinutes);
            const slotIndex = Math.floor(rel / duration);
            const baseMinutes = minMinutes + slotIndex * duration;
            const endMinutes = baseMinutes + duration;
            const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
            const endM = String(endMinutes % 60).padStart(2, "0");
            const slotEnd = new Date(
              `${dateOnly}T${endH}:${endM}:00`
            ).getTime();
            if (Date.now() >= slotEnd) {
              return; // fully ended
            }
          } catch {
            // Computation failed; conservative: block
            return;
          }
        }
      }

      handlers.openEditor({ start: startStr || "", end: endStr });
    },

    // Event click (used primarily in dual calendar)
    eventClick: (info: EventClickInfo) => {
      const id: string | undefined = info?.event?.id;
      if (id) {
        handlers.handleOpenConversation(id);
      }
    },
  };
}
