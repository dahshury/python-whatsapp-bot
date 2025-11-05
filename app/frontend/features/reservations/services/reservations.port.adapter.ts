import type { CalendarEvent, OperationResult } from "@/entities/event";
import {
  cancelReservation,
  modifyReservation as httpModifyReservation,
  reserveTimeSlot,
} from "@/shared/api";
import type {
  CreateReservationRequest,
  CreateReservationResponse,
  ModifyReservationRequest,
  ReservationsPort,
  ReservationUpdate,
} from "@/shared/ports";
import { ReservationsWsService } from "./reservations.ws.service";

export class ReservationsPortAdapter implements ReservationsPort {
  private readonly wsService = new ReservationsWsService();

  async create(
    reservation: CreateReservationRequest
  ): Promise<CreateReservationResponse> {
    const wsOk = await this.wsService.sendMessage({
      type: "create_reservation",
      data: {
        wa_id: reservation.waId,
        date: reservation.date,
        time_slot: reservation.time,
        title: reservation.title,
        notes: reservation.notes,
      },
    });
    if (wsOk) {
      // Rely on realtime updates to reflect creation
      return {
        event: {
          id: "",
          title: reservation.title || reservation.waId,
          date: reservation.date,
          time: reservation.time,
        } as unknown as CalendarEvent,
        success: true,
      };
    }
    const resp = (await reserveTimeSlot({
      id: reservation.waId,
      title: reservation.title || reservation.waId,
      date: reservation.date,
      time: reservation.time,
      type: 0,
      ar: false,
    })) as { success?: boolean };
    return {
      event: {
        id: "",
        title: reservation.title || reservation.waId,
        date: reservation.date,
        time: reservation.time,
      } as unknown as CalendarEvent,
      success: Boolean(resp?.success),
    };
  }

  async modify(
    eventId: string,
    changes: ModifyReservationRequest
  ): Promise<OperationResult> {
    const waId = ""; // Not always required for WS path; kept for API parity
    const payload: {
      date: string;
      time: string;
      title?: string;
      reservationId?: number;
    } = {
      date: String(changes.date || ""),
      time: String(changes.time || ""),
    };
    if (changes.title) {
      payload.title = changes.title;
    }
    if (Number.isFinite(Number(eventId))) {
      payload.reservationId = Number(eventId);
    }

    // Preserve approximate flag used by calendar freeRoam/timeGrid view to avoid slot snapping server-side
    const wsResp = await this.wsService.modifyReservation(waId, {
      ...payload,
      approximate: true,
    });
    if (wsResp?.success) {
      return { hasErrors: false, successfulOperations: [] };
    }
    const httpResp = (await httpModifyReservation(waId, {
      ...payload,
      approximate: true,
    })) as unknown as OperationResult;
    return httpResp;
  }

  async cancel(eventId: string): Promise<OperationResult> {
    const wsOk = await this.wsService.sendMessage({
      type: "cancel_reservation",
      data: { reservation_id: eventId },
    });
    if (wsOk) {
      return { hasErrors: false, successfulOperations: [] };
    }
    const httpResp = (await cancelReservation({
      id: String(eventId),
      date: "",
    })) as unknown as OperationResult;
    return httpResp;
  }

  subscribe(callback: (update: ReservationUpdate) => void): () => void {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as
          | { type?: string; data?: Record<string, unknown> }
          | undefined;
        const t = detail?.type;
        const d = detail?.data || {};
        if (t === "reservation_created") {
          callback({ type: "created", event: d as unknown as CalendarEvent });
        } else if (t === "reservation_updated") {
          callback({ type: "modified", event: d as unknown as CalendarEvent });
        } else if (t === "reservation_cancelled") {
          callback({
            type: "cancelled",
            eventId: String((d as { id?: string }).id || ""),
          });
        }
      } catch {
        // Silently ignore errors in WebSocket event handler (non-critical)
      }
    };
    try {
      window.addEventListener("realtime", handler as EventListener);
    } catch {
      // Silently ignore errors when adding event listener (may already exist)
    }
    return () => {
      try {
        window.removeEventListener("realtime", handler as EventListener);
      } catch {
        // Silently ignore errors when removing event listener (listener may not exist)
      }
    };
  }
}
