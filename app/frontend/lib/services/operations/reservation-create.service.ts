/* eslint-disable */
import { reserveTimeSlot } from "@/lib/api";
import { toastService } from "@/lib/toast-service";
import { i18n } from "@/lib/i18n";
import { normalizePhoneForStorage } from "@/lib/utils/phone-utils";
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from "../types/data-table-types";
import type { FormattingService } from "../utils/formatting.service";
import type { LocalEchoManager } from "../utils/local-echo.manager";

export class ReservationCreateService {
	constructor(
		private readonly formattingService: FormattingService,
		private readonly localEchoManager: LocalEchoManager,
		private readonly isLocalized: boolean,
	) {}

	async processAdditions(
		addedRows: Array<RowChange>,
		_onEventAdded?: (event: CalendarEvent) => void,
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
				// Normalize time to slot base on the backend's slot granularity
				const slotTime = this.formattingService.normalizeToSlotBase(
					creationData.dStr,
					creationData.tStr,
				);

				// Backend creation
				const resp = (await reserveTimeSlot({
					id: creationData.waId,
					title: creationData.name || creationData.waId,
					date: creationData.dStr,
					time: slotTime,
					type: Number(creationData.type),
					ar: this.isLocalized,
				})) as unknown as ApiResponse;

				if (!resp?.success) {
					throw new Error(this.extractErrorMessage(resp, creationData));
				}

				// Track successful operation
				successful.push({
					type: "create",
					id: creationData.waId,
					data: {
						date: creationData.dStr,
						time: slotTime,
					},
				});

				// Mark local echo (suppress duplicate WS-driven UI side effects)
				this.markLocalEchoForCreation(resp, {
					...creationData,
					tStr: slotTime,
				});
			} catch (e) {
				hasErrors = true;
				this.handleCreationError(e as Error, creationData);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	private prepareCreationData(row: RowChange) {
		let dStr = "";
		let tStr = "";
		const st = row.scheduled_time as unknown;
		if (st instanceof Date) {
			// Use timezone-aware formatting
			dStr = this.formattingService.formatDateOnly(st) || "";
			tStr =
				this.formattingService.formatHHmmInZone(st, "Asia/Riyadh") ||
				this.formattingService.formatHHmm(st) ||
				"";
		} else if (typeof st === "string" && st.includes("T")) {
			const dateObj = new Date(st);
			dStr =
				this.formattingService.formatDateOnly(dateObj) ||
				st.split("T")[0] ||
				"";
			tStr =
				this.formattingService.formatHHmmInZone(dateObj, "Asia/Riyadh") ||
				this.formattingService.formatHHmm(dateObj) ||
				"";
		} else {
			// Backward compatibility
			dStr =
				this.formattingService.formatDateOnly(
					(row as unknown as { date?: string }).date,
				) || "";
			tStr =
				this.formattingService.formatHHmmInZone(
					(row as unknown as { time?: string }).time,
					"Asia/Riyadh",
				) ||
				this.formattingService.formatHHmm(
					(row as unknown as { time?: string }).time,
				) ||
				this.formattingService.to24h(
					String((row as unknown as { time?: string }).time || ""),
				) ||
				"";
		}

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
		if (!data.dStr || !data.tStr) missing.push("scheduled_time");

		return {
			isValid: missing.length === 0,
			missing,
		};
	}

	private showValidationError(missing: string[]): void {
		toastService.error(
			this.isLocalized ? "حقول مطلوبة مفقودة" : "Missing required fields",
			(this.isLocalized ? "يرجى إكمال: " : "Please fill: ") + missing.join(", "),
			3000,
		);
	}

	private extractErrorMessage(
		resp: ApiResponse,
		data: ReturnType<typeof this.prepareCreationData>,
	): string {
		const rawReason =
			(typeof resp?.message === "string" && resp.message) ||
			(typeof resp?.error === "string" && resp.error) ||
			(typeof resp?.detail === "string" && resp.detail) ||
			(resp && typeof resp === "object" ? JSON.stringify(resp) : "") ||
			"Unknown";

		const reason = this.localizeReason(rawReason);

		return [
			this.isLocalized ? "فشل إنشاء الحجز" : "Failed to create reservation",
			`${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
			reason ? (this.isLocalized ? `السبب: ${reason}` : `reason: ${reason}`) : "",
		]
			.filter(Boolean)
			.join("\n");
	}

	private localizeReason(msg: string): string {
		try {
			const text = String(msg || "");
			const lower = text.toLowerCase();
			// Map common backend messages to localized i18n keys
			if (
				lower.includes("not available") ||
				lower.includes("fully booked") ||
				lower.includes("no available slots")
			) {
				return i18n.getMessage("slot_fully_booked", this.isLocalized === true);
			}
			return text;
		} catch {
			return String(msg || "");
		}
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
		const base = this.isLocalized ? "فشل الإنشاء" : "Create Failed";
		const msg = this.localizeReason(error?.message || String(error) || "");
		const desc = [
			this.isLocalized ? "معلومات الطلب" : "Request",
			`${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
			msg && (this.isLocalized ? `السبب: ${msg}` : `reason: ${msg}`),
		]
			.filter(Boolean)
			.join("\n");

		toastService.error(base, desc, 6000);
	}
}
