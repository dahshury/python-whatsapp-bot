import type { EventApi } from "@fullcalendar/core";
import type { CalendarEvent } from "@/entities/event";

const LONG_PRESS_DELAY_MS = 3000;
const DRAG_DETECTION_THRESHOLD_PX = 8;

function isTouchLikePointer(pointerType?: string) {
  return pointerType === "touch" || pointerType === "pen";
}

export function attachContextMenu(
  el: HTMLElement,
  eventApi: EventApi,
  onContextMenu?: (
    event: CalendarEvent,
    position: { x: number; y: number }
  ) => void
) {
  if (!onContextMenu) {
    return;
  }

  let activePointerId: number | null = null;
  let lastPointerType: string | undefined;
  let longPressTimer: number | null = null;
  let allowNonMouseContextMenu = false;
  let suppressContextMenu = false;
  let startX = 0;
  let startY = 0;

  const clearLongPressTimer = () => {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const pointerDownHandler = (e: PointerEvent) => {
    lastPointerType = e.pointerType || lastPointerType;
    activePointerId = e.pointerId;
    suppressContextMenu = false;
    allowNonMouseContextMenu = e.pointerType === "mouse";
    startX = e.clientX;
    startY = e.clientY;

    clearLongPressTimer();

    if (!allowNonMouseContextMenu) {
      const currentPointerId = e.pointerId;
      longPressTimer = window.setTimeout(() => {
        if (
          !suppressContextMenu &&
          activePointerId === currentPointerId &&
          isTouchLikePointer(lastPointerType)
        ) {
          allowNonMouseContextMenu = true;
        }
      }, LONG_PRESS_DELAY_MS);
    }
  };

  const pointerMoveHandler = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId || suppressContextMenu) {
      return;
    }
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance >= DRAG_DETECTION_THRESHOLD_PX) {
      suppressContextMenu = true;
      allowNonMouseContextMenu = false;
      clearLongPressTimer();
    }
  };

  const pointerLeaveHandler = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) {
      return;
    }
    suppressContextMenu = true;
    allowNonMouseContextMenu = false;
    clearLongPressTimer();
  };

  const pointerUpOrCancelHandler = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) {
      return;
    }
    activePointerId = null;
    clearLongPressTimer();
    if (suppressContextMenu) {
      allowNonMouseContextMenu = false;
    }
  };

  el.addEventListener("pointerdown", pointerDownHandler);
  el.addEventListener("pointermove", pointerMoveHandler);
  el.addEventListener("pointerup", pointerUpOrCancelHandler);
  el.addEventListener("pointercancel", pointerUpOrCancelHandler);
  el.addEventListener("pointerleave", pointerLeaveHandler);

  const handler = (e: MouseEvent) => {
    const pointerType = lastPointerType;
    const isTouchPointer = isTouchLikePointer(pointerType);

    // Determine if context menu should be shown
    let shouldShowContextMenu = false;
    if (!suppressContextMenu) {
      if (pointerType === "mouse") {
        shouldShowContextMenu = true;
      } else if (isTouchPointer) {
        shouldShowContextMenu = allowNonMouseContextMenu;
      } else {
        shouldShowContextMenu =
          allowNonMouseContextMenu || pointerType === undefined;
      }
    }

    e.preventDefault();
    e.stopPropagation();

    if (!shouldShowContextMenu) {
      return;
    }

    allowNonMouseContextMenu = false;
    suppressContextMenu = false;
    clearLongPressTimer();
    activePointerId = null;

    try {
      const calendarEvent: CalendarEvent = {
        id: String(eventApi.id),
        title: String(eventApi.title || ""),
        start: String(eventApi.startStr || ""),
        end: String(eventApi.endStr || eventApi.startStr || ""),
        backgroundColor: eventApi.backgroundColor || "",
        borderColor: eventApi.borderColor || "",
        editable: true,
        extendedProps: {
          type: eventApi.extendedProps?.type || 0,
          cancelled: eventApi.extendedProps?.cancelled,
          ...(eventApi.extendedProps || {}),
        },
      };
      onContextMenu(calendarEvent, { x: e.clientX, y: e.clientY });
    } catch {
      // Ignore errors in context menu event handling
    }
  };
  el.addEventListener("contextmenu", handler);
}
