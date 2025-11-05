import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import type { CalendarApi, CalendarEvent } from "@/entities/event";
import type { MutateReservationParams } from "@/features/reservations/hooks";
import { normalizeToSlotBase } from "@/shared/libs/calendar/slot-utils";
import type { CalendarEvent as DataTableCalendarEvent } from "@/widgets/data-table-editor/types";

export type EventChangeInfo = {
  event: {
    id: string;
    title?: string;
    start?: Date;
    end?: Date;
    startStr?: string;
    endStr?: string;
    extendedProps?: Record<string, unknown>;
  };
  oldEvent?: {
    id: string;
    title?: string;
    start?: Date;
    end?: Date;
    startStr?: string;
    endStr?: string;
    extendedProps?: Record<string, unknown>;
  };
  revert?: () => void;
};

export function filterEventsForCalendar(
  events: CalendarEvent[],
  freeRoam: boolean
): CalendarEvent[] {
  if (freeRoam) {
    return events;
  }
  return events.filter((event) => event.extendedProps?.cancelled !== true);
}

export function alignAndSortEventsForCalendar(
  events: CalendarEvent[],
  _freeRoam: boolean,
  currentView?: string
): CalendarEvent[] {
  const isTimeGridView = currentView
    ? (currentView || "").toLowerCase().includes("timegrid")
    : false;

  if (!isTimeGridView) {
    // For non-timegrid views, simple timestamp sort
    return [...(events || [])].sort((a, b) => {
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      return dateA.getTime() - dateB.getTime();
    });
  }

  // For timegrid views, ensure precise time-based sorting
  return [...(events || [])].sort((a, b) => {
    // Parse start dates - handle both Date objects and ISO strings
    const startA = typeof a.start === "string" ? new Date(a.start) : a.start;
    const startB = typeof b.start === "string" ? new Date(b.start) : b.start;

    // Validate dates
    if (!(startA instanceof Date) || Number.isNaN(startA.getTime())) {
      return 1; // Put invalid dates at the end
    }
    if (!(startB instanceof Date) || Number.isNaN(startB.getTime())) {
      return -1; // Put invalid dates at the end
    }

    // Sort by date first (year, month, day)
    const yearA = startA.getFullYear();
    const yearB = startB.getFullYear();
    if (yearA !== yearB) {
      return yearA - yearB;
    }

    const monthA = startA.getMonth();
    const monthB = startB.getMonth();
    if (monthA !== monthB) {
      return monthA - monthB;
    }

    const dayA = startA.getDate();
    const dayB = startB.getDate();
    if (dayA !== dayB) {
      return dayA - dayB;
    }

    // Same date - get slot info for proper grouping
    const slotDateA = a.extendedProps?.slotDate || "";
    const slotTimeA = a.extendedProps?.slotTime || "";
    const slotDateB = b.extendedProps?.slotDate || "";
    const slotTimeB = b.extendedProps?.slotTime || "";

    // If in different slots, sort by actual start time
    if (slotDateA !== slotDateB || slotTimeA !== slotTimeB) {
      // Sort by time (hours, then minutes, then seconds)
      const hourA = startA.getHours();
      const hourB = startB.getHours();
      if (hourA !== hourB) {
        return hourA - hourB;
      }

      const minuteA = startA.getMinutes();
      const minuteB = startB.getMinutes();
      if (minuteA !== minuteB) {
        return minuteA - minuteB;
      }

      const secondA = startA.getSeconds();
      const secondB = startB.getSeconds();
      if (secondA !== secondB) {
        return secondA - secondB;
      }

      // Same time but different slots - compare slot times
      return String(slotTimeA).localeCompare(String(slotTimeB));
    }

    // Same slot - sort by type first (checkups=0, followups=1), then alphabetically
    const typeA = Number(a.extendedProps?.type ?? 0);
    const typeB = Number(b.extendedProps?.type ?? 0);

    // Skip conversation events (type 2)
    if (typeA === 2 && typeB !== 2) {
      return 1;
    }
    if (typeB === 2 && typeA !== 2) {
      return -1;
    }

    // Sort by type first
    if (typeA !== typeB) {
      return typeA - typeB;
    }

    // Same type - sort alphabetically by title
    const titleA = String(a.title || "").toLowerCase();
    const titleB = String(b.title || "").toLowerCase();
    return titleA.localeCompare(titleB);
  });
}

export function processEventsForFreeRoam(
  events: CalendarEvent[],
  _freeRoam: boolean
): CalendarEvent[] {
  return events;
}

export function filterEventsForDataTable(
  events: CalendarEvent[],
  _context: "data-table",
  freeRoam: boolean
): CalendarEvent[] {
  return (events || []).filter((event) => {
    const isConversation =
      (event as unknown as { type?: string })?.type === "conversation";
    if (isConversation) {
      return false;
    }
    const cancelled = event.extendedProps?.cancelled === true;
    if (cancelled && !freeRoam) {
      return false;
    }
    return true;
  });
}

export function transformEventsForDataTable(
  events: CalendarEvent[]
): DataTableCalendarEvent[] {
  return (events || []).map((ev) => ({
    id: ev.id,
    title: ev.title,
    start: ev.start,
    ...(ev.end ? { end: ev.end } : {}),
    extendedProps: { ...(ev.extendedProps || {}) },
    type:
      (
        ev as unknown as {
          type?: "reservation" | "conversation" | "cancellation";
        }
      ).type || "reservation",
  }));
}

// Track ongoing drag operations to prevent duplicate mutations
const ongoingDrags = new Set<string>();

export async function orchestrateCalendarDrag(params: {
  calendarApi: CalendarApi;
  info: EventChangeInfo;
  isVacationDate: (date: string) => boolean;
  currentView: string;
  updateEvent: (
    id: string,
    event: { id: string; title?: string; start?: string; end?: string }
  ) => void;
  resolveEvent: (
    id: string
  ) => { extendedProps?: Record<string, unknown> } | undefined;
  isLocalized: boolean;
  mutateReservation: (payload: MutateReservationParams) => Promise<unknown>;
}): Promise<void> {
  const {
    calendarApi,
    info,
    isVacationDate,
    currentView,
    updateEvent,
    resolveEvent,
    isLocalized,
  } = params;
  const event = info?.event;
  if (!event) {
    return;
  }

  // Prevent duplicate drag operations for the same event
  const dragKey = `${event.id}_${event.startStr || ""}`;
  if (ongoingDrags.has(dragKey)) {
    return;
  }
  ongoingDrags.add(dragKey);

  // Resolve waId and reservationId from state or extended props
  const resolved = resolveEvent ? resolveEvent(String(event.id)) : undefined;
  const waId = String(
    (event.extendedProps as { waId?: unknown; wa_id?: unknown } | undefined)
      ?.waId ||
      (event.extendedProps as { waId?: unknown; wa_id?: unknown } | undefined)
        ?.wa_id ||
      (
        resolved?.extendedProps as
          | { waId?: unknown; wa_id?: unknown }
          | undefined
      )?.waId ||
      (
        resolved?.extendedProps as
          | { waId?: unknown; wa_id?: unknown }
          | undefined
      )?.wa_id ||
      event.id
  );
  const newDate = (event.startStr || "").split("T")[0] || "";
  const SLOT_TIME_PREFIX_LENGTH = 5;
  const rawTime = ((event.startStr || "").split("T")[1] || "00:00").slice(
    0,
    SLOT_TIME_PREFIX_LENGTH
  );
  const newTime = normalizeToSlotBase(newDate, rawTime);
  const title = event.title;
  const type =
    Number(
      (event.extendedProps as { type?: unknown } | undefined)?.type ?? 0
    ) || 0;

  let reservationId: number | undefined = (
    event.extendedProps as
      | { reservationId?: unknown; reservation_id?: unknown }
      | undefined
  )?.reservationId as number | undefined;
  if (reservationId == null) {
    reservationId = (
      event.extendedProps as { reservation_id?: unknown } | undefined
    )?.reservation_id as number | undefined;
  }
  if (reservationId == null) {
    const maybeNum = Number(event.id);
    if (Number.isFinite(maybeNum)) {
      reservationId = maybeNum;
    }
  }

  // Vacation date guard
  if (newDate && isVacationDate(newDate)) {
    info.revert?.();
    return;
  }

  const isTimeGrid = (currentView || "").toLowerCase().includes("timegrid");
  const approximate = !isTimeGrid;

  const previousStartStr = info?.oldEvent?.startStr || "";
  const previousDate = previousStartStr.split("T")[0] || newDate;
  const previousTimeRaw = (
    previousStartStr.split("T")[1] ||
    rawTime ||
    "00:00"
  ).slice(0, SLOT_TIME_PREFIX_LENGTH);
  const previousSlotTime = previousStartStr
    ? normalizeToSlotBase(previousDate, previousTimeRaw)
    : newTime;

  // Get old slot info from event's extended props before the move
  const oldSlotDate = String(
    (resolved?.extendedProps as { slotDate?: unknown } | undefined)?.slotDate ||
      (event.extendedProps as { slotDate?: unknown } | undefined)?.slotDate ||
      previousDate
  );
  const oldSlotTime = String(
    (resolved?.extendedProps as { slotTime?: unknown } | undefined)?.slotTime ||
      (event.extendedProps as { slotTime?: unknown } | undefined)?.slotTime ||
      previousSlotTime
  );

  const mutationPayload: MutateReservationParams & {
    previousDate?: string;
    previousTimeSlot?: string;
  } = {
    waId,
    date: newDate,
    time: newTime,
    approximate,
    isLocalized,
  };
  mutationPayload.previousDate = previousDate;
  mutationPayload.previousTimeSlot = previousSlotTime;
  if (typeof title === "string" && title.trim().length > 0) {
    mutationPayload.title = title;
  }
  if (Number.isFinite(type)) {
    mutationPayload.type = Number(type);
  }
  if (reservationId != null) {
    mutationPayload.reservationId = reservationId;
  }

  // Register this as a local move to suppress WebSocket echo
  try {
    const localMoves = (
      globalThis as { __calendarLocalMoves?: Map<string, number> }
    ).__calendarLocalMoves;
    if (localMoves) {
      // Register both reservation ID and wa_id to catch any echo format
      if (reservationId != null) {
        localMoves.set(String(reservationId), Date.now());
      }
      localMoves.set(waId, Date.now());
      localMoves.set(String(event.id), Date.now());
    }
  } catch {
    // Local move registration failed - may get duplicate notifications
  }

  try {
    await params.mutateReservation(mutationPayload);

    // Clean up drag tracking on success
    ongoingDrags.delete(dragKey);

    // Update the event in React state with new times
    updateEvent(String(event.id), {
      id: String(event.id),
      ...(typeof title === "string" ? { title } : {}),
      start: event.startStr || "",
      ...(event.endStr ? { end: event.endStr } : {}),
    });

    // All calendar API operations happen with suppression to prevent cascading event change handlers
    const REFLOW_BATCH_DELAY_MS = 50; // Delay to batch reflows and allow state to settle
    setTimeout(() => {
      try {
        // Increment suppression depth to prevent event change handlers from firing
        const currentDepth =
          (globalThis as { __suppressEventChangeDepth?: number })
            .__suppressEventChangeDepth || 0;
        (
          globalThis as { __suppressEventChangeDepth?: number }
        ).__suppressEventChangeDepth = currentDepth + 1;

        try {
          // Update extended properties within suppression
          const eventApi = calendarApi.getEventById?.(String(event.id));
          if (eventApi) {
            eventApi.setExtendedProp?.("slotDate", newDate);
            eventApi.setExtendedProp?.("slotTime", newTime);
          }

          // Import and execute reflows within suppression
          import("../lib/reflow-slot")
            .then(({ reflowSlot }) => {
              // Reflow the old slot (where the event was dragged from)
              if (
                oldSlotDate &&
                oldSlotTime &&
                (oldSlotDate !== newDate || oldSlotTime !== newTime)
              ) {
                reflowSlot(
                  calendarApi as unknown as { getEvents?: () => unknown[] },
                  oldSlotDate,
                  oldSlotTime
                );
              }

              // Reflow the new slot (where the event was dropped)
              if (newDate && newTime) {
                reflowSlot(
                  calendarApi as unknown as { getEvents?: () => unknown[] },
                  newDate,
                  newTime
                );
              }
            })
            .catch(() => {
              // Silently ignore import errors
            })
            .finally(() => {
              // Decrement suppression depth after all operations complete
              setTimeout(() => {
                try {
                  const d =
                    (globalThis as { __suppressEventChangeDepth?: number })
                      .__suppressEventChangeDepth || 0;
                  if (d > 0) {
                    (
                      globalThis as { __suppressEventChangeDepth?: number }
                    ).__suppressEventChangeDepth = d - 1;
                  }
                } catch {
                  // Silently ignore cleanup errors
                }
              }, 10);
            });
        } catch {
          // On error, still decrement suppression
          const d =
            (globalThis as { __suppressEventChangeDepth?: number })
              .__suppressEventChangeDepth || 0;
          if (d > 0) {
            (
              globalThis as { __suppressEventChangeDepth?: number }
            ).__suppressEventChangeDepth = d - 1;
          }
        }
      } catch {
        // Silently ignore errors when reflowing slots (non-critical)
      }
    }, REFLOW_BATCH_DELAY_MS);
  } catch (error) {
    // Clean up drag tracking on error
    ongoingDrags.delete(dragKey);

    info.revert?.();
    const message =
      error instanceof Error
        ? error.message
        : i18n.getMessage("slot_fully_booked", isLocalized);
    try {
      toastService.reservationModificationFailed({
        customer: String(title || ""),
        wa_id: String(waId),
        date: String(newDate),
        time: newTime,
        isLocalized: Boolean(isLocalized),
        error: message,
      });
    } catch {
      // no-op
    }
  }
}
