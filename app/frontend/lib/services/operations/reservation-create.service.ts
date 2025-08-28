/* eslint-disable */
import { reserveTimeSlot } from "@/lib/api";
import { toastService } from "@/lib/toast-service";
import { notificationManager } from "../notifications/notification-manager.service";
import { normalizePhoneForStorage } from "@/lib/utils/phone-utils";
import type {
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
	ApiResponse,
} from "../types/data-table-types";
import { CalendarIntegrationService } from "../calendar/calendar-integration.service";
import { FormattingService } from "../utils/formatting.service";
import { LocalEchoManager } from "../utils/local-echo.manager";

export class ReservationCreateService {
	constructor(
		private readonly calendarIntegration: CalendarIntegrationService,
		private readonly formattingService: FormattingService,
		private readonly localEchoManager: LocalEchoManager,
		private readonly isRTL: boolean,
	) {}

	async processAdditions(
		addedRows: Array<RowChange>,
		onEventAdded?: (event: CalendarEvent) => void,
	): Promise<OperationResult> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		for (const row of addedRows || []) {
			const creationData = this.prepareCreationData(row);

			// Validate required fields
			const validation = this.validateCreationData(creationData);
			if (!validation.isValid) {
				this.showValidationError(validation.missing);
				hasErrors = true;
				continue;
			}

			try {
				// Backend creation
				const resp = (await reserveTimeSlot({
					id: creationData.waId,
					title: creationData.name || creationData.waId,
					date: creationData.dStr,
					time: creationData.tStr,
					type: Number(creationData.type),
					ar: this.isRTL,
				})) as ApiResponse;

				if (!resp?.success) {
					throw new Error(this.extractErrorMessage(resp, creationData));
				}

				// Do not add locally; rely on WebSocket echo to add the event

				// Track successful operation
				successful.push({
					type: "create",
					id: creationData.waId,
					data: {
						date: creationData.dStr,
						time: creationData.tStr,
					},
				});

				// Success notification will come via WebSocket echo - no direct toast needed

				// Mark local echo (suppress duplicate WS-driven UI side effects)
				this.markLocalEchoForCreation(resp, creationData);
			} catch (e) {
				hasErrors = true;
				this.handleCreationError(e as Error, creationData);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	private prepareCreationData(row: RowChange) {
		const dStr = this.formattingService.formatDateOnly(row.date) || "";
		const tStr =
			this.formattingService.formatHHmmInZone(row.time, "Asia/Riyadh") ||
			this.formattingService.formatHHmm(row.time) ||
			this.formattingService.to24h((row.time || "").toString()) ||
			"";

		// Normalize phone number for backend - removes + prefix and cleans format
		const waId = normalizePhoneForStorage((row.phone || "").toString());

		// Additional validation - ensure we have a clean phone number
		if (!waId || waId.length < 7) {
			throw new Error("Invalid phone number format");
		}

		const type = this.formattingService.parseType(row.type);
		const name = (row.name || "").toString();

		return { dStr, tStr, waId, type, name };
	}

	private validateCreationData(
		data: ReturnType<typeof this.prepareCreationData>,
	) {
		const missing: string[] = [];
		if (!data.waId) missing.push("id/phone");
		if (!data.name) missing.push("name");
		if (!data.dStr) missing.push("date");
		if (!data.tStr) missing.push("time");

		return {
			isValid: missing.length === 0,
			missing,
		};
	}

	private showValidationError(missing: string[]): void {
		toastService.error(
			this.isRTL ? "حقول مطلوبة مفقودة" : "Missing required fields",
			(this.isRTL ? "يرجى إكمال: " : "Please fill: ") + missing.join(", "),
			3000,
		);
	}

	private extractErrorMessage(
		resp: ApiResponse,
		data: ReturnType<typeof this.prepareCreationData>,
	): string {
		const reason =
			(typeof resp?.message === "string" && resp.message) ||
			(typeof resp?.error === "string" && resp.error) ||
			(typeof resp?.detail === "string" && resp.detail) ||
			(resp && typeof resp === "object" ? JSON.stringify(resp) : "") ||
			"Unknown";

		return [
			this.isRTL ? "فشل إنشاء الحجز" : "Failed to create reservation",
			`${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
			reason ? (this.isRTL ? `السبب: ${reason}` : `reason: ${reason}`) : "",
		]
			.filter(Boolean)
			.join("\n");
	}

	private addEventToCalendar(
		resp: ApiResponse,
		data: ReturnType<typeof this.prepareCreationData>,
	) {
		const startIso = `${data.dStr}T${data.tStr}:00`;
		const eventId = String(
			resp?.id ||
				resp?.reservationId ||
				`${data.waId}-${data.dStr}-${data.tStr}`,
		);

		return this.calendarIntegration.addEvent({
			id: eventId,
			title: data.name || data.waId,
			start: startIso,
			end: startIso,
			extendedProps: {
				type: Number(data.type),
				cancelled: false,
				waId: data.waId,
				wa_id: data.waId,
				reservationId: Number(resp?.id || resp?.reservationId) || undefined,
			},
		});
	}

	private createEventObject(
		resp: ApiResponse,
		data: ReturnType<typeof this.prepareCreationData>,
	): CalendarEvent {
		const startIso = `${data.dStr}T${data.tStr}:00`;
		const eventId = String(
			resp?.id ||
				resp?.reservationId ||
				`${data.waId}-${data.dStr}-${data.tStr}`,
		);

		return {
			id: eventId,
			title: data.name || data.waId,
			start: startIso,
			end: startIso,
			extendedProps: {
				type: Number(data.type),
				cancelled: false,
				waId: data.waId,
				wa_id: data.waId,
				reservationId: Number(resp?.id || resp?.reservationId) || undefined,
			},
		};
	}

	private markLocalEchoForCreation(
		resp: ApiResponse,
		data: ReturnType<typeof this.prepareCreationData>,
	): void {
		const key1 = `reservation_created:${String(
			resp?.id || resp?.reservationId || "",
		)}:${data.dStr}:${data.tStr}`;
		const key2 = `reservation_created:${String(data.waId)}:${data.dStr}:${data.tStr}`;

		this.localEchoManager.markLocalEcho(key1);
		this.localEchoManager.markLocalEcho(key2);
	}

	private handleCreationError(
		error: Error,
		data: ReturnType<typeof this.prepareCreationData>,
	): void {
		const base = this.isRTL ? "فشل الإنشاء" : "Create Failed";
		const msg = error?.message || String(error) || "";
		const desc = [
			this.isRTL ? "معلومات الطلب" : "Request",
			`${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
			msg && (this.isRTL ? `السبب: ${msg}` : `reason: ${msg}`),
		]
			.filter(Boolean)
			.join("\n");

		toastService.error(base, desc, 6000);
	}
}
