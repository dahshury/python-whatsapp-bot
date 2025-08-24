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
    const newTime = rawTime;
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
    const useApproximate = !(currentView || "").toLowerCase().includes("timegrid");

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
    // Mark this operation as local to suppress unread increments on WS echo
    try {
      (globalThis as any).__localOps = (globalThis as any).__localOps || new Set<string>();
      const key = `reservation_updated:${String(reservationId ?? event.id)}:${newDate ?? ""}:${newTime ?? ""}`;
      (globalThis as any).__localOps.add(key);
      // Auto-expire after a short window to avoid leaks
      setTimeout(() => {
        try { (globalThis as any).__localOps.delete(key); } catch {}
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
}): Promise<void> {
  const { eventId, events, isRTL } = args;
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return;
  const date = ev.start?.split("T")[0] ?? "";
  // Optimistic remove; WS will confirm
  const apiResp = cancelReservation({ id: eventId, date, isRTL });
  if (ev) {
    try {
      const api = (args as any)?.getCalendarApi?.() || null;
      if (api) {
        const e = api.getEventById(String(eventId));
        e?.remove();
      }
    } catch {}
  }
  const resp = await apiResp;
  // Toasts are handled by centralized realtime listener
  // If server rejected, we could refetch, but WS should keep us consistent
}


