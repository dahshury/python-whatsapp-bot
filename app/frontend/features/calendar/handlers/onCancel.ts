import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { WSReservationRepository } from "@/features/calendar/infrastructure/reservation.ws-repo";
import { ReservationService } from "@/features/calendar/services/reservation.service";
import type {
  CalendarEventData,
  FullCalendarApi,
} from "@/features/calendar/types/fullcalendar";

export async function handleCancelReservation(args: {
  eventId: string;
  events: CalendarEventData[];
  isLocalized: boolean;
  onRefresh: () => Promise<void>;
  getCalendarApi?: () => FullCalendarApi;
  onEventCancelled?: (eventId: string) => void;
}): Promise<void> {
  const { eventId, events, isLocalized, getCalendarApi, onEventCancelled } =
    args;

  const TOAST_MS = 3000;

  let api: FullCalendarApi | undefined;
  let fcEvent: {
    startStr?: string;
    start?: Date;
    extendedProps?: Record<string, unknown>;
    setExtendedProp?: (k: string, v: unknown) => void;
    remove?: () => void;
  } | null = null;
  try {
    api = typeof getCalendarApi === "function" ? getCalendarApi() : undefined;
    fcEvent = api?.getEventById?.(String(eventId)) || null;
  } catch {
    // no-op
  }

  const stateEv = events.find((e) => String(e.id) === String(eventId));
  const startStr: string | undefined =
    stateEv?.start || fcEvent?.startStr || fcEvent?.start?.toISOString?.();
  const date = (startStr || "").split("T")[0] || "";

  let waId = String(
    (stateEv?.extendedProps as { waId?: unknown; wa_id?: unknown } | undefined)
      ?.waId ||
      (
        stateEv?.extendedProps as
          | { waId?: unknown; wa_id?: unknown }
          | undefined
      )?.wa_id ||
      (
        fcEvent?.extendedProps as
          | { waId?: unknown; wa_id?: unknown }
          | undefined
      )?.waId ||
      (
        fcEvent?.extendedProps as
          | { waId?: unknown; wa_id?: unknown }
          | undefined
      )?.wa_id ||
      ""
  );
  if (!waId) {
    waId = String(eventId);
  }

  if (!(waId && date)) {
    toastService.error(
      i18n.getMessage("cancel_failed", isLocalized),
      i18n.getMessage("cancel_incomplete_data", isLocalized),
      TOAST_MS
    );
    return;
  }

  // Optimistic mark as cancelled
  try {
    const prevDepth =
      (globalThis as { __suppressEventChangeDepth?: number })
        .__suppressEventChangeDepth || 0;
    (
      globalThis as { __suppressEventChangeDepth?: number }
    ).__suppressEventChangeDepth = prevDepth + 1;
    fcEvent?.setExtendedProp?.("cancelled", true);
    (
      globalThis as { __suppressEventChangeDepth?: number }
    ).__suppressEventChangeDepth = prevDepth;
  } catch {
    // no-op
  }

  const service = new ReservationService(new WSReservationRepository());
  try {
    const resp = await service.cancel({ waId, date, isLocalized });
    if (!resp?.success) {
      const message = resp?.message ?? "";
      toastService.error(
        i18n.getMessage("cancel_failed", isLocalized),
        message || i18n.getMessage("cancel_system_error", isLocalized),
        TOAST_MS
      );
      try {
        const prevDepth =
          (globalThis as { __suppressEventChangeDepth?: number })
            .__suppressEventChangeDepth || 0;
        (
          globalThis as { __suppressEventChangeDepth?: number }
        ).__suppressEventChangeDepth = prevDepth + 1;
        fcEvent?.setExtendedProp?.("cancelled", false);
        (
          globalThis as { __suppressEventChangeDepth?: number }
        ).__suppressEventChangeDepth = prevDepth;
      } catch {
        // no-op
      }
      return;
    }

    // Success: remove from calendar and notify callback
    try {
      const prevDepth =
        (globalThis as { __suppressEventChangeDepth?: number })
          .__suppressEventChangeDepth || 0;
      (
        globalThis as { __suppressEventChangeDepth?: number }
      ).__suppressEventChangeDepth = prevDepth + 1;
      fcEvent?.remove?.();
      (
        globalThis as { __suppressEventChangeDepth?: number }
      ).__suppressEventChangeDepth = prevDepth;
    } catch {
      // no-op
    }
    try {
      onEventCancelled?.(String(eventId));
    } catch {
      // no-op
    }
  } catch {
    toastService.error(
      i18n.getMessage("cancel_failed", isLocalized),
      i18n.getMessage("cancel_system_error", isLocalized),
      TOAST_MS
    );
    try {
      const prevDepth =
        (globalThis as { __suppressEventChangeDepth?: number })
          .__suppressEventChangeDepth || 0;
      (
        globalThis as { __suppressEventChangeDepth?: number }
      ).__suppressEventChangeDepth = prevDepth + 1;
      fcEvent?.setExtendedProp?.("cancelled", false);
      (
        globalThis as { __suppressEventChangeDepth?: number }
      ).__suppressEventChangeDepth = prevDepth;
    } catch {
      // no-op
    }
  }
}
