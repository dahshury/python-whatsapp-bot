/* eslint-disable */

import { cancelReservation } from "@shared/libs/api";
import { i18n } from "@shared/libs/i18n";
import { generateLocalOpKeys } from "@shared/libs/realtime-utils";
import { toastService } from "@shared/libs/toast/toast-service";
import type { LocalEchoManager } from "@shared/libs/utils/local-echo.manager";
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	SuccessfulOperation,
} from "@/entities/event";
import type { CalendarIntegrationService } from "../calendar/calendar-integration.service";
import type { WebSocketService } from "../websocket/websocket.service";

// Constants
const TIME_SLICE_LENGTH = 5;
const TOAST_DURATION_MS = 3000;

type CancellationContext = {
	resp: ApiResponse;
	mapped: CalendarEvent;
	eventId: string;
	date: string;
	time: string;
	waId: string;
};

export class ReservationCancelService {
	private readonly calendarIntegration: CalendarIntegrationService;
	private readonly localEchoManager: LocalEchoManager;
	private readonly isLocalized: boolean;
	private readonly webSocketService: WebSocketService | undefined;

	constructor(
		calendarIntegration: CalendarIntegrationService,
		localEchoManager: LocalEchoManager,
		isLocalized: boolean,
		webSocketService?: WebSocketService | undefined
	) {
		this.calendarIntegration = calendarIntegration;
		this.localEchoManager = localEchoManager;
		this.isLocalized = isLocalized;
		this.webSocketService = webSocketService;
	}

	async processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void
	): Promise<OperationResult> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		for (const rowIdx of deletedRows || []) {
			const mapped = gridRowToEventMap.get(rowIdx);
			if (!mapped) {
				continue;
			}

			const result = await this.processSingleCancellation(
				mapped,
				onEventCancelled
			);
			if (result.success && result.operation) {
				successful.push(result.operation);
			} else {
				hasErrors = true;
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	private async processSingleCancellation(
		mapped: CalendarEvent,
		onEventCancelled?: (eventId: string) => void
	): Promise<{ success: boolean; operation?: SuccessfulOperation }> {
		const eventId = String(mapped.id);
		const waId = this.extractWaId(mapped);
		const date = mapped.start?.split("T")[0] || "";
		const time = this.extractTimeFromEvent(mapped);

		try {
			// Optimistic UI update
			this.calendarIntegration.markEventCancelled(eventId);

			// Pre-mark local echo BEFORE calling backend (WebSocket echo may arrive immediately)
			this.preMarkCancellationEcho(mapped, eventId, waId, date, time);

			// Backend cancellation via WebSocket, fallback to HTTP
			const resp = await this.performCancellationRequest(waId, date);

			if (!resp?.success) {
				throw new Error(resp?.message || resp?.error || "Cancel failed");
			}

			// Post-cancellation operations
			this.handleSuccessfulCancellation(
				eventId,
				mapped,
				time,
				date,
				waId,
				resp
			);

			// Notify callback
			onEventCancelled?.(eventId);

			return {
				success: true,
				operation: {
					type: "cancel",
					id: eventId,
					data: { waId, ...(date && { date }) },
				},
			};
		} catch (e) {
			this.handleCancellationError(e as Error);
			return { success: false };
		}
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
			if (slot) {
				return String(slot).slice(0, TIME_SLICE_LENGTH);
			}
			const s = mapped?.start || "";
			if (s?.includes("T")) {
				return s.split("T")[1]?.slice(0, TIME_SLICE_LENGTH) || "";
			}
			return "";
		} catch {
			return "";
		}
	}

	private extractSlotBaseTime(
		mapped: CalendarEvent,
		time: string
	): string | null {
		try {
			// Prefer existing slotTime metadata
			if (mapped?.extendedProps?.slotTime) {
				return String(mapped.extendedProps.slotTime).slice(
					0,
					TIME_SLICE_LENGTH
				);
			}
			// Fallback: use the raw time from the event (don't normalize to avoid slot jumping)
			if (time) {
				return time;
			}
			return null;
		} catch (_e) {
			return null;
		}
	}

	// biome-ignore lint/nursery/useMaxParams: Multiple parameters for context passing
	private preMarkCancellationEcho(
		mapped: CalendarEvent,
		eventId: string,
		waId: string,
		date: string,
		time: string
	): void {
		try {
			if (date && time) {
				const preKeys = generateLocalOpKeys("reservation_cancelled", {
					id: mapped.extendedProps?.reservationId || eventId,
					wa_id: waId,
					date,
					time,
				});
				for (const k of preKeys) {
					this.localEchoManager.markLocalEcho(k);
				}
			}
		} catch {
			// Silently ignore local echo pre-marking errors
		}
	}

	private async performCancellationRequest(
		waId: string,
		date: string
	): Promise<ApiResponse> {
		if (this.webSocketService) {
			return (
				this.webSocketService as unknown as {
					cancelReservation: (
						waId: string,
						date: string,
						opts?: { isLocalized?: boolean }
					) => Promise<ApiResponse>;
				}
			).cancelReservation(waId, date, {
				isLocalized: this.isLocalized,
			});
		}
		return (await cancelReservation({
			id: waId,
			date,
			isLocalized: this.isLocalized,
		})) as unknown as ApiResponse;
	}

	// biome-ignore lint/nursery/useMaxParams: Multiple parameters for cancellation context
	private handleSuccessfulCancellation(
		eventId: string,
		mapped: CalendarEvent,
		time: string,
		date: string,
		waId: string,
		resp: ApiResponse
	): void {
		// Remove from calendar
		this.calendarIntegration.removeEvent(eventId);

		// Reflow remaining events in the affected slot using slot base time when available
		const baseTime = this.extractSlotBaseTime(mapped, time);
		if (date && baseTime) {
			try {
				this.calendarIntegration.reflowSlot(date, baseTime);
			} catch (_e) {
				// Silently ignore reflow errors
			}
		}
		this.markLocalEchoForCancellation({
			resp,
			mapped,
			eventId,
			date,
			time,
			waId,
		});
	}

	private markLocalEchoForCancellation(context: CancellationContext): void {
		// Generate all possible key variants that buildLocalOpCandidates would check
		const keys = generateLocalOpKeys("reservation_cancelled", {
			id:
				context.resp?.id ||
				context.mapped.extendedProps?.reservationId ||
				context.eventId,
			wa_id: context.waId,
			date: context.date,
			time: context.time,
		});

		// Mark all variants to ensure WebSocket echo is suppressed
		for (const key of keys) {
			this.localEchoManager.markLocalEcho(key);
		}
	}

	private handleCancellationError(error: Error): void {
		toastService.error(
			i18n.getMessage("cancel_failed", this.isLocalized),
			error?.message ||
				i18n.getMessage("system_error_try_later", this.isLocalized),
			TOAST_DURATION_MS
		);
	}
}
