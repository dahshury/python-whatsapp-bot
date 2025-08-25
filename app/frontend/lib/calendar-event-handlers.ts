import { cancelReservation, modifyReservation } from "@/lib/api";
// Toasts are centralized in WebSocketDataProvider to avoid duplicates

export async function handleEventChange(args: {
  info: any;
  isVacationDate: (date: string) => boolean;
  isRTL: boolean;
  currentView: string;
  onRefresh: () => Promise<void>;
  getCalendarApi?: () => any;
  updateEvent: (id: string, event: any) => void;
  resolveEvent?: (id: string) => { extendedProps?: any } | undefined;
}): Promise<void> {
  const { info, getCalendarApi, updateEvent, currentView, isVacationDate, resolveEvent } = args;
  try {
    const event = info?.event;
    if (!event) return;

    // Convert to backend payload (match Streamlit behavior)
    const resolved = resolveEvent ? resolveEvent(String(event.id)) : undefined;
    const waId = event.extendedProps?.waId
      || event.extendedProps?.wa_id
      || resolved?.extendedProps?.waId
      || resolved?.extendedProps?.wa_id
      || event.id;
    const newDate = event.startStr?.split("T")[0];
    // Derive HH:mm deterministically from startStr to avoid timezone skew
    const rawTime = (event.startStr?.split("T")[1] || "00:00").slice(0, 5);
    let newTime = rawTime;
    const type = event.extendedProps?.type ?? 0;
    const reservationId: number | undefined = (event.extendedProps?.reservationId
      || event.extendedProps?.reservation_id) as number | undefined;
    const title = event.title;

    // Skip if target date is a vacation day (let UI revert)
    if (newDate && isVacationDate && isVacationDate(newDate)) {
      if (info?.revert) info.revert();
      return;
    }

    // Decide approximation by view: exact for timeGrid, approximate otherwise
    const isTimeGrid = (currentView || "").toLowerCase().includes("timegrid");
    // Use approximate mode for month/year views so backend adjusts to nearest valid slot
    const useApproximate = !isTimeGrid;

    // For month/year views we keep the dropped time as-is and rely on approximate=true
    // to let the backend adjust to the nearest valid slot of that day.

    // Mark this move locally to suppress immediate WS echo thrash
    try {
      (globalThis as any).__calendarLocalMoves = (globalThis as any).__calendarLocalMoves || new Map<string, number>();
      (globalThis as any).__calendarLocalMoves.set(String(event.id), Date.now());
    } catch {}

    // Capture previous state for rich success toast after WS confirmation
    try {
      const prevStartStr: string | undefined = info?.oldEvent?.startStr;
      const prevDate = prevStartStr ? prevStartStr.split("T")[0] : undefined;
      const prevTime = prevStartStr ? (prevStartStr.split("T")[1] || "00:00").slice(0, 5) : undefined;
      const prevType: number | undefined = (info?.oldEvent?.extendedProps?.type ?? event.extendedProps?.type) as number | undefined;
      const prevName: string | undefined = (info?.oldEvent?.title || event.title) as string | undefined;
      (globalThis as any).__calendarLastModifyContext = (globalThis as any).__calendarLastModifyContext || new Map<string, any>();
      (globalThis as any).__calendarLastModifyContext.set(String(event.id), {
        waId,
        prevDate,
        prevTime,
        prevType,
        name: prevName,
        // Also stash intended new values for fallback comparison
        newDate,
        newTime,
        newType: type,
      });
    } catch {}

    // Optimistic update: apply to calendar immediately; server confirmation will arrive via WS
    const respPromise = modifyReservation(waId, {
      date: newDate,
      time: newTime,
      title,
      type,
      approximate: useApproximate,
      reservationId,
    });

    // Update local view immediately; preserve extendedProps as-is in state to avoid losing waId
    updateEvent(event.id, {
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr || event.startStr,
    });
    if (getCalendarApi) void getCalendarApi();
    const resp = await respPromise;
    if (!resp?.success) {
      try {
        const message = (resp && (resp.message || resp.error)) || "";
        const toaster = (await import("sonner")).toast;
        toaster.error(message || "Slot fully booked");
      } catch {}
      if (info?.revert) info.revert();
    }
    // Mark this operation as local to suppress unread increments on WS echo (cover id/wa_id and time variants)
    try {
      (globalThis as any).__localOps = (globalThis as any).__localOps || new Set<string>();
      const idPart = String(reservationId ?? event.id ?? "");
      const waPart = String(event.extendedProps?.waId || event.extendedProps?.wa_id || event.id || "");
      const datePart = String(newDate || "");
      const time12 = String(newTime || "");
      const time24 = (() => {
        try {
          const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time12);
          if (!m) return time12;
          let h = parseInt(m[1], 10);
          const mm = m[2];
          const ap = m[3].toUpperCase();
          if (ap === "PM" && h < 12) h += 12;
          if (ap === "AM" && h === 12) h = 0;
          return `${String(h).padStart(2, "0")}:${mm}`;
        } catch { return time12; }
      })();
      const keys = [
        `reservation_updated:${idPart}:${datePart}:${time12}`,
        `reservation_updated:${idPart}:${datePart}:${time24}`,
        `reservation_updated:${waPart}:${datePart}:${time12}`,
        `reservation_updated:${waPart}:${datePart}:${time24}`,
      ];
      for (const k of keys) { (globalThis as any).__localOps.add(k); }
      setTimeout(() => {
        try { for (const k of keys) { (globalThis as any).__localOps.delete(k); } } catch {}
      }, 5000);
    } catch {}
  } catch (_e) {
    // Revert on error
    if (info?.revert) info.revert();
  }
}

export async function handleOpenConversation(args: {
  eventId: string;
  openConversation: (id: string) => void;
}): Promise<void> {
  const { eventId, openConversation } = args;
  // Do not fetch on click; use in-memory data and just open the sidebar
  openConversation(eventId);
}

export async function handleCancelReservation(args: {
  eventId: string;
  events: any[];
  isRTL: boolean;
  onRefresh: () => Promise<void>;
  getCalendarApi?: () => any;
  onEventCancelled?: (eventId: string) => void;
}): Promise<void> {
  const { eventId, events, isRTL, getCalendarApi, onEventCancelled } = args;
  // Resolve from state first, then FullCalendar for freshest extendedProps (tolerate number/string ids)
  const stateEv = events.find((e) => String(e.id) === String(eventId));
  let api: any | null = null;
  let fcEvent: any | null = null;
  try {
    api = typeof getCalendarApi === "function" ? getCalendarApi() : null;
    fcEvent = api?.getEventById?.(String(eventId)) || null;
  } catch {}

  const startStr: string | undefined = stateEv?.start || fcEvent?.startStr || fcEvent?.start?.toISOString?.();
  const date = (startStr || "").split("T")[0] || "";
  let waId: string = (
    (stateEv?.extendedProps?.waId || stateEv?.extendedProps?.wa_id || fcEvent?.extendedProps?.waId || fcEvent?.extendedProps?.wa_id || "")
  ).toString();
  // Fallback: some events might carry waId as the event id itself
  if (!waId) waId = String(eventId);

  if (!waId || !date) {
    try {
      const toaster = (await import("sonner")).toast;
      toaster.error(isRTL ? "فشل الإلغاء" : "Cancel Failed", {
        description: isRTL ? "بيانات غير كاملة (الهاتف/التاريخ)" : "Missing waId/date to cancel",
        duration: 3000,
      });
    } catch {}
    return;
  }

  // Optimistic: mark as cancelled immediately; rely on WS and removal on success
  try { fcEvent?.setExtendedProp?.("cancelled", true); } catch {}

  try {
    const resp = await cancelReservation({ id: waId, date, isRTL });
    if (!resp?.success) {
      try {
        const toaster = (await import("sonner")).toast;
        const message = (resp && (resp.message || resp.error)) || "";
        toaster.error(isRTL ? "فشل الإلغاء" : "Cancel Failed", {
          description: message || (isRTL ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later"),
          duration: 3000,
        });
      } catch {}
      try { fcEvent?.setExtendedProp?.("cancelled", false); } catch {}
      return;
    }

    // Remove event from calendar on success (align with grid UX)
    try { fcEvent?.remove?.(); } catch {}
    try { onEventCancelled?.(String(eventId)); } catch {}

    // Local echo suppression to avoid duplicate WS toasts
    const markLocalEcho = (key: string) => {
      try {
        (globalThis as any).__localOps = (globalThis as any).__localOps || new Set<string>();
        (globalThis as any).__localOps.add(key);
        setTimeout(() => {
          try { (globalThis as any).__localOps.delete(key); } catch {}
        }, 4000);
      } catch {}
    };
    const reservationId = String((stateEv?.extendedProps?.reservationId || fcEvent?.extendedProps?.reservationId || eventId) ?? "");
    const key1 = `reservation_cancelled:${reservationId}:${date}:`;
    const key2 = `reservation_cancelled:${String(waId)}:${date}:`;
    markLocalEcho(key1);
    markLocalEcho(key2);
  } catch (_e) {
    try {
      const toaster = (await import("sonner")).toast;
      toaster.error(isRTL ? "فشل الإلغاء" : "Cancel Failed", {
        description: isRTL ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later",
        duration: 3000,
      });
    } catch {}
    try { fcEvent?.setExtendedProp?.("cancelled", false); } catch {}
  }
}


