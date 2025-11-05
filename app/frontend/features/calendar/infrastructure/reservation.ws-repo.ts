import type {
  CancelResult,
  ModifyResult,
  ReservationRepository,
} from "@/entities/reservation/core/reservation.repository";
import type {
  CancelReservationCommand,
  ModifyReservationCommand,
} from "@/entities/reservation/types";
import { cancelReservation } from "@/shared/api";
import { waitForWSConfirmation } from "@/shared/infrastructure/realtime/ack-waiter";
import {
  ensureQueueProcessor,
  sendWebSocketMessage,
} from "@/shared/infrastructure/realtime/ws-transport";

ensureQueueProcessor();

export class WSReservationRepository implements ReservationRepository {
  async modify(cmd: ModifyReservationCommand): Promise<ModifyResult> {
    const ok = await sendWebSocketMessage({
      type: "modify_reservation",
      data: {
        wa_id: cmd.waId,
        date: cmd.date,
        time_slot: cmd.time,
        customer_name: cmd.title,
        type: cmd.type,
        approximate: cmd.approximate,
        reservation_id: cmd.reservationId,
        ar: cmd.isLocalized,
      },
    });
    if (!ok) {
      return { success: false, message: "WebSocket unavailable" };
    }
    const ack = await waitForWSConfirmation({
      ...(cmd.reservationId != null
        ? { reservationId: cmd.reservationId }
        : {}),
      waId: cmd.waId,
      date: cmd.date,
      time: cmd.time,
      timeoutMs: 10_000,
      ...(typeof cmd.isLocalized === "boolean"
        ? { isLocalized: cmd.isLocalized }
        : {}),
    });
    return {
      success: ack.success,
      ...(typeof ack.message === "string" ? { message: ack.message } : {}),
    };
  }

  async cancel(cmd: CancelReservationCommand): Promise<CancelResult> {
    const ok = await sendWebSocketMessage({
      type: "cancel_reservation",
      data: { wa_id: cmd.waId, date: cmd.date, ar: cmd.isLocalized },
    });
    if (ok) {
      return { success: true };
    }
    // Fallback to HTTP
    const resp = await cancelReservation({
      id: String(cmd.waId),
      date: cmd.date,
      ...(typeof cmd.isLocalized === "boolean"
        ? { isLocalized: cmd.isLocalized }
        : {}),
    });
    const success = Boolean((resp as { success?: unknown })?.success);
    const message =
      (resp as { message?: string; error?: string })?.message ||
      (resp as { message?: string; error?: string })?.error;
    return { success, ...(message ? { message } : {}) };
  }
}
