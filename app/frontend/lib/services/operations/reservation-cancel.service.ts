/* eslint-disable */
import { cancelReservation } from "@/lib/api";
import { toastService } from "@/lib/toast-service";
import type { CalendarIntegrationService } from "../calendar/calendar-integration.service";
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	SuccessfulOperation,
} from "../types/data-table-types";

import type { LocalEchoManager } from "../utils/local-echo.manager";

export class ReservationCancelService {
	constructor(
		private readonly calendarIntegration: CalendarIntegrationService,
		private readonly localEchoManager: LocalEchoManager,
		private readonly isLocalized: boolean,
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
			const date = mapped.start?.split("T")[0] || "";
			const time = this.extractTimeFromEvent(mapped);

			try {
				// Optimistic UI update
				this.calendarIntegration.markEventCancelled(eventId);

				// Backend cancellation
				const resp = (await cancelReservation({
					id: waId,
					date,
					isLocalized: this.isLocalized,
				})) as unknown as ApiResponse;

				if (!resp?.success) {
					throw new Error(resp?.message || resp?.error || "Cancel failed");
				}

				// Remove from calendar
				this.calendarIntegration.removeEvent(eventId);

				// Reflow remaining events in the affected slot using slot base time when available
				const baseTime = ((): string | null => {
					try {
						// Prefer existing slotTime metadata
						if (mapped?.extendedProps?.slotTime) {
							const slotTime = String(mapped.extendedProps.slotTime).slice(
								0,
								5,
							);
							console.log(
								`🔄 Using existing slotTime: ${slotTime} for event ${eventId}`,
							);
							return slotTime;
						}
						// Fallback: use the raw time from the event (don't normalize to avoid slot jumping)
						if (time) {
							console.log(
								`🔄 Using raw time: ${time} for event ${eventId} on ${date}`,
							);
							return time;
						}
						return null;
					} catch (e) {
						console.error(
							`❌ Error computing baseTime for event ${eventId}:`,
							e,
						);
						return null;
					}
				})();
				if (date && baseTime) {
					console.log(
						`🔄 Reflowing slot ${date} ${baseTime} after cancelling ${eventId}`,
					);
					try {
						this.calendarIntegration.reflowSlot(date, baseTime);
					} catch (e) {
						console.error(`❌ Error reflowing slot:`, e);
					}
				}

				// Notify callback
				onEventCancelled?.(eventId);

				// Track successful operation
				successful.push({
					type: "cancel",
					id: eventId,
					data: { waId, ...(date && { date }) },
				});

				// Success notification will come via WebSocket echo - no direct toast needed

				// Mark local echo to suppress WebSocket notifications
				if (date) {
					this.markLocalEchoForCancellation(resp, mapped, eventId, date, waId);
				}
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
		try {
			const slot = mapped?.extendedProps?.slotTime;
			if (slot) return String(slot).slice(0, 5);
			const s = mapped?.start || "";
			if (s?.includes("T")) return s.split("T")[1]?.slice(0, 5) || "";
			return "";
		} catch {
			return "";
		}
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
			this.isLocalized ? "فشل الإلغاء" : "Cancel Failed",
			error?.message ||
				(this.isLocalized ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later"),
			3000,
		);
	}
}
