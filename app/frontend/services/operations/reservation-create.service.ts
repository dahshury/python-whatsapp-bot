/* eslint-disable */

import { reserveTimeSlot } from "@shared/libs/api";
import { i18n } from "@shared/libs/i18n";
import { generateLocalOpKeys } from "@shared/libs/realtime-utils";
import { toastService } from "@shared/libs/toast/toast-service";
import type { LocalEchoManager } from "@shared/libs/utils/local-echo.manager";
import { normalizePhoneForStorage } from "@shared/libs/utils/phone-utils";
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from "@/entities/event";
import type { FormattingService } from "../utils/formatting.service";

// Constants
const MIN_PHONE_LENGTH = 7;
const SHORT_TOAST_DURATION_MS = 3000;
const LONG_TOAST_DURATION_MS = 6000;

export class ReservationCreateService {
	private readonly formattingService: FormattingService;
	private readonly localEchoManager: LocalEchoManager;
	private readonly isLocalized: boolean;

	constructor(
		formattingService: FormattingService,
		localEchoManager: LocalEchoManager,
		isLocalized: boolean
	) {
		this.formattingService = formattingService;
		this.localEchoManager = localEchoManager;
		this.isLocalized = isLocalized;
	}

	async processAdditions(
		addedRows: RowChange[],
		_onEventAdded?: (event: CalendarEvent) => void
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
					creationData.tStr
				);

				// Mark local echo BEFORE API call (WebSocket arrives immediately)
				this.markLocalEchoForCreationPreApi({
					...creationData,
					tStr: slotTime,
				});

				// Backend creation: require strictly 0 or 1; show validation error otherwise
				const parsed = Number(creationData.type);
				if (!(parsed === 0 || parsed === 1)) {
					throw new Error(
						this.isLocalized
							? "نوع الحجز غير صالح. يجب أن يكون كشف أو مراجعة."
							: "Invalid reservation type. Must be Check-up or Follow-up."
					);
				}
				const typeNumber = parsed as 0 | 1;
				const resp = (await reserveTimeSlot({
					id: creationData.waId,
					title: creationData.name || creationData.waId,
					date: creationData.dStr,
					time: slotTime,
					type: typeNumber,
					reservation_type: typeNumber,
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
					(row as unknown as { date?: string }).date
				) || "";
			tStr =
				this.formattingService.formatHHmmInZone(
					(row as unknown as { time?: string }).time,
					"Asia/Riyadh"
				) ||
				this.formattingService.formatHHmm(
					(row as unknown as { time?: string }).time
				) ||
				this.formattingService.to24h(
					String((row as unknown as { time?: string }).time || "")
				) ||
				"";
		}

		// Normalize phone number for backend - removes + prefix and cleans format
		const waId = normalizePhoneForStorage((row.phone || "").toString());

		// Additional validation - ensure we have a clean phone number
		if (!waId || waId.length < MIN_PHONE_LENGTH) {
			throw new Error("Invalid phone number format");
		}

		const type = this.formattingService.parseType(row.type);
		const name = (row.name || "").toString();

		return { dStr, tStr, waId, type, name };
	}

	private validateCreationData(
		data: ReturnType<typeof this.prepareCreationData>
	) {
		const missing: string[] = [];
		if (!data.waId) {
			missing.push("id/phone");
		}
		if (!data.name) {
			missing.push("name");
		}
		if (!(data.dStr && data.tStr)) {
			missing.push("scheduled_time");
		}

		return {
			isValid: missing.length === 0,
			missing,
		};
	}

	private showValidationError(missing: string[]): void {
		toastService.error(
			i18n.getMessage("missing_required_fields", this.isLocalized),
			i18n.getMessage("please_fill_prefix", this.isLocalized) +
				missing.join(", "),
			SHORT_TOAST_DURATION_MS
		);
	}

	private extractErrorMessage(
		resp: ApiResponse,
		data: ReturnType<typeof this.prepareCreationData>
	): string {
		const rawReason =
			(typeof resp?.message === "string" && resp.message) ||
			(typeof resp?.error === "string" && resp.error) ||
			(typeof resp?.detail === "string" && resp.detail) ||
			(resp && typeof resp === "object" ? JSON.stringify(resp) : "") ||
			"Unknown";

		const reason = this.localizeReason(rawReason);

		return [
			i18n.getMessage("create_failed_verbose", this.isLocalized),
			`${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
			reason
				? `${i18n.getMessage("reason_label", this.isLocalized)}: ${reason}`
				: "",
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

	private markLocalEchoForCreationPreApi(
		data: ReturnType<typeof this.prepareCreationData>
	): void {
		// Mark local echo BEFORE API call using wa_id pattern
		// WebSocket arrives immediately so we can't wait for reservation ID
		const keys = generateLocalOpKeys("reservation_created", {
			id: "", // Will be empty, but we'll use wa_id instead
			wa_id: data.waId,
			date: data.dStr,
			time: data.tStr,
		});

		// Keys marked before API call to prevent WebSocket echo notifications

		// Mark all variants to ensure WebSocket echo is suppressed
		for (const key of keys) {
			this.localEchoManager.markLocalEcho(key);
		}
	}

	private handleCreationError(
		error: Error,
		data: ReturnType<typeof this.prepareCreationData>
	): void {
		const base = i18n.getMessage("create_failed", this.isLocalized);
		const msg = this.localizeReason(error?.message || String(error) || "");
		const desc = [
			i18n.getMessage("request_label", this.isLocalized),
			`${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
			msg && `${i18n.getMessage("reason_label", this.isLocalized)}: ${msg}`,
		]
			.filter(Boolean)
			.join("\n");

		toastService.error(base, desc, LONG_TOAST_DURATION_MS);
	}
}
