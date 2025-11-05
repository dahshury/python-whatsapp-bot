import type { EventApi } from "@fullcalendar/core";
import type { CalendarEvent } from "@/entities/event";
import { attachContextMenu } from "./contextMenu";
import { normalizeListViewTimeCell } from "./dom/normalizeListViewTimeCell";

type EventDidMountOptions = {
  eventApi: EventApi;
  el: HTMLElement;
  viewType: string;
  onEventMouseDown?: () => void;
  onContextMenu?: (
    event: CalendarEvent,
    position: { x: number; y: number }
  ) => void;
  onEventDidMount?: (info: {
    event: {
      id: string;
      title: string;
      start: Date;
      end?: Date;
      extendedProps?: Record<string, unknown>;
    };
    el: HTMLElement;
  }) => void;
};

export function eventDidMountHandler(opts: EventDidMountOptions) {
  const {
    eventApi,
    el,
    viewType,
    onEventMouseDown,
    onContextMenu,
    onEventDidMount,
  } = opts;

  // Data attributes for styling
  if (eventApi?.extendedProps?.cancelled) {
    el.setAttribute("data-cancelled", "true");
  }

  // Type-based classes
  if (eventApi?.extendedProps?.type === 2) {
    el.classList.add("conversation-event");
  }
  if (eventApi?.extendedProps?.type === 1) {
    el.classList.add("reservation-type-1");
  } else if (eventApi?.extendedProps?.type === 0) {
    el.classList.add("reservation-type-0");
  }

  // Notify parent on mousedown start of interaction
  if (onEventMouseDown) {
    el.addEventListener("mousedown", onEventMouseDown);
  }

  // Assign waId attribute for styling/testing
  try {
    const waId = String(
      (eventApi.extendedProps as { waId?: string; wa_id?: string })?.waId ||
        (eventApi.extendedProps as { waId?: string; wa_id?: string })?.wa_id ||
        ""
    ).trim();
    if (waId) {
      el.setAttribute("data-wa-id", waId);
    }
  } catch {
    // Ignore errors accessing event extendedProps
  }

  // List view normalization
  try {
    if (
      String(viewType || "")
        .toLowerCase()
        .includes("list")
    ) {
      const row = el.closest(".fc-list-event") as HTMLElement | null;
      normalizeListViewTimeCell(row);
    }
  } catch {
    // Ignore errors in list view normalization
  }

  // Context menu (skip for multimonth - caller can decide)
  if (onContextMenu) {
    attachContextMenu(el, eventApi, onContextMenu);
  }

  // Call-through
  if (onEventDidMount) {
    const safeStart =
      eventApi.start ??
      (eventApi.startStr ? new Date(eventApi.startStr) : new Date());
    onEventDidMount({
      event: {
        id: String(eventApi.id),
        title: String(eventApi.title || ""),
        start: safeStart,
        ...(eventApi.end ? { end: eventApi.end } : {}),
        extendedProps: { ...(eventApi.extendedProps || {}) },
      },
      el,
    });
  }
}
