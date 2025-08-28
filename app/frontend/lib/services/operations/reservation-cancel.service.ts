/* eslint-disable */
import { cancelReservation } from "@/lib/api";
import { toastService } from "@/lib/toast-service";
import type {
	CalendarEvent,
	OperationResult,
	SuccessfulOperation,
	ApiResponse,
} from "../types/data-table-types";
import { CalendarIntegrationService } from "../calendar/calendar-integration.service";
import { LocalEchoManager } from "../utils/local-echo.manager";
import { notificationManager } from "../notifications/notification-manager.service";

export class ReservationCancelService {
	constructor(
		private readonly calendarIntegration: CalendarIntegrationService,
		private readonly localEchoManager: LocalEchoManager,
		private readonly isRTL: boolean,
	) {}

	async processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void,
	): Promise<OperationResult> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		for (const rowIdx of deletedRows || []) {
			const mapped = gridRowToEventMap.get(rowIdx);
			if (!mapped) continue;

			const eventId = String(mapped.id);
			const waId = this.extractWaId(mapped);
			const date = mapped.start?.split("T")[0];
			const time = this.extractTimeFromEvent(mapped);

			try {
				// Optimistic UI update
				this.calendarIntegration.markEventCancelled(eventId);

				// Backend cancellation
				const resp = await cancelReservation({
					id: waId,
					date,
					isRTL: this.isRTL,
				});

				if (!resp?.success) {
					throw new Error(resp?.message || resp?.error || "Cancel failed");
				}

				// Remove from calendar
				this.calendarIntegration.removeEvent(eventId);

				// Notify callback
				onEventCancelled?.(eventId);

				// Track successful operation
				successful.push({
					type: "cancel",
					id: eventId,
					data: { waId, date },
				});

				// Success notification will come via WebSocket echo - no direct toast needed

				// Mark local echo to suppress WebSocket notifications
				this.markLocalEchoForCancellation(resp, mapped, eventId, date, waId);
			} catch (e) {
				hasErrors = true;
				this.handleCancellationError(e as Error);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	private extractWaId(mapped: CalendarEvent): string {
		return (
			mapped.extendedProps?.waId ||
			mapped.extendedProps?.wa_id ||
			mapped.id ||
			""
		).toString();
	}

	private extractTimeFromEvent(mapped: CalendarEvent): string {
		if (mapped.start) {
			const startDate = new Date(mapped.start);
			return startDate.toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
		}
		return "";
	}

	private markLocalEchoForCancellation(
		resp: ApiResponse,
		mapped: CalendarEvent,
		eventId: string,
		date: string,
		waId: string,
	): void {
		const key1 = `reservation_cancelled:${String(
			resp?.id || mapped.extendedProps?.reservationId || eventId,
		)}:${date}:`;
		const key2 = `reservation_cancelled:${String(waId)}:${date}:`;

		this.localEchoManager.markLocalEcho(key1);
		this.localEchoManager.markLocalEcho(key2);
	}

	private handleCancellationError(error: Error): void {
		toastService.error(
			this.isRTL ? "فشل الإلغاء" : "Cancel Failed",
			error?.message ||
				(this.isRTL ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later"),
			3000,
		);
	}
}
