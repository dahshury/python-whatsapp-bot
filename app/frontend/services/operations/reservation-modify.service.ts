/* eslint-disable */

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
import type { CalendarIntegrationService } from "../calendar/calendar-integration.service";
import type { FormattingService } from "../utils/formatting.service";
import type { WebSocketService } from "../websocket/websocket.service";

// Constants
const TIME_SLICE_LENGTH = 5;
const ERROR_TOAST_DELAY_MS = 3000;

export type ModificationData = {
	evId: string;
	waId: string;
	titleNew: string;
	dateStrNew: string;
	timeStrNew: string;
	typeNew: string | number;
	prevDate: string;
	prevStartStr: string;
};

class ReservationModifyService {
	private readonly calendarIntegration: CalendarIntegrationService;
	private readonly webSocketService: WebSocketService;
	private readonly formattingService: FormattingService;
	private readonly localEchoManager: LocalEchoManager;
	private readonly isLocalized: boolean;

	// biome-ignore lint/nursery/useMaxParams: Constructor requires 5 service dependencies
	constructor(
		calendarIntegration: CalendarIntegrationService,
		webSocketService: WebSocketService,
		formattingService: FormattingService,
		localEchoManager: LocalEchoManager,
		isLocalized: boolean
	) {
		this.calendarIntegration = calendarIntegration;
		this.webSocketService = webSocketService;
		this.formattingService = formattingService;
		this.localEchoManager = localEchoManager;
		this.isLocalized = isLocalized;
	}

	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void
	): Promise<OperationResult> {
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			"[ReservationModifyService] processModifications",
			{
				editedRows,
				gridRowToEventMapSize: gridRowToEventMap.size,
			}
		);
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		const indices = Object.keys(editedRows || {});
		for (const idxStr of indices) {
			const rowIdx = Number(idxStr);
			const change = editedRows[idxStr] || {};
			const original = gridRowToEventMap.get(rowIdx);
			if (!original) {
				continue;
			}

			const modificationData = this.prepareModificationData(change, original);
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.(
				"[ReservationModifyService] preparedModificationData",
				modificationData
			);

			try {
				const result = await this.executeModification(
					modificationData,
					original,
					onEventModified
				);
				if (result.success && result.operation) {
					successful.push(result.operation);
				} else {
					hasErrors = true;
				}
			} catch (e) {
				hasErrors = true;
				this.handleModificationError(e as Error);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Orchestration requires several steps
	private async executeModification(
		modificationData: ModificationData,
		original: CalendarEvent,
		onEventModified?: (eventId: string, event: CalendarEvent) => void
	): Promise<{ success: boolean; operation?: SuccessfulOperation }> {
		// Proactively suppress calendar eventChange during the entire save cycle
		// Use longer suppression to cover WebSocket round-trip time
		try {
			const SUPPRESS_EVENT_CHANGE_MS = 2500;
			(
				globalThis as unknown as { __suppressCalendarEventChangeUntil?: number }
			).__suppressCalendarEventChangeUntil =
				Date.now() + SUPPRESS_EVENT_CHANGE_MS;
		} catch {
			// ignore
		}
		// Optimistic UI updates
		this.applyOptimisticUpdates(modificationData);

		// Reflow previous slot first (use base slot time if known)
		try {
			const prevDate = modificationData.prevDate;
			const prevTime = (String(original?.extendedProps?.slotTime || "") ||
				modificationData.prevStartStr
					.split("T")[1]
					?.slice(0, TIME_SLICE_LENGTH) ||
				"00:00") as string;
			if (prevDate && prevTime) {
				// Ensure previous event metadata is present before reflow
				this.calendarIntegration.updateEventSlotMetadata(
					modificationData.evId,
					prevDate,
					prevTime
				);
				this.calendarIntegration.reflowSlot(prevDate, prevTime);
			}
		} catch {
			// Silently ignore reflow errors for previous slot
		}

		// Backend modification - normalize time to slot base
		const slotTime = this.formattingService.normalizeToSlotBase(
			modificationData.dateStrNew,
			modificationData.timeStrNew
		);

		// Pre-mark local echo BEFORE calling backend (WebSocket echo may arrive immediately)
		try {
			const preKeys = generateLocalOpKeys("reservation_updated", {
				id: original.extendedProps?.reservationId || modificationData.evId,
				wa_id: modificationData.waId,
				date: modificationData.dateStrNew,
				time: slotTime,
			});
			for (const k of preKeys) {
				this.localEchoManager.markLocalEcho(k);
			}
		} catch {
			// Silently ignore local echo pre-marking errors
		}
		// Robustly extract reservationId (may be number or string in calendar state)
		const reservationId = this.extractReservationId(original);
		const modifyParams: {
			date: string;
			time: string;
			title?: string;
			type?: number;
			reservationId?: number;
			approximate?: boolean;
		} = {
			date: modificationData.dateStrNew,
			time: slotTime,
			title: modificationData.titleNew,
			type: Number(modificationData.typeNew),
			approximate: !this.calendarIntegration.isTimeGridView(),
		};

		// Only add reservationId if it's defined
		if (typeof reservationId === "number") {
			modifyParams.reservationId = reservationId;
		}

		// Mark in-flight by event id to avoid DnD re-entry until we finish
		try {
			const state = (
				globalThis as unknown as {
					__reservationModifyInFlight?: Set<string>;
				}
			).__reservationModifyInFlight;
			if (state) {
				state.add(String(modificationData.evId));
			} else {
				(
					globalThis as unknown as {
						__reservationModifyInFlight?: Set<string>;
					}
				).__reservationModifyInFlight = new Set<string>([
					String(modificationData.evId),
				]);
			}
		} catch {
			// Ignore in-flight set initialization errors
		}

		const resp = await this.webSocketService.modifyReservation(
			modificationData.waId,
			modifyParams
		);
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			"[ReservationModifyService] modifyReservation() called",
			{
				waId: modificationData.waId,
				modifyParams,
				resp,
			}
		);

		if (!resp?.success) {
			// Backend rejected the modification - revert optimistic changes
			const errorMessage =
				resp?.message ||
				resp?.error ||
				i18n.getMessage("update_failed", this.isLocalized);
			toastService.reservationModificationFailed({
				customer: modificationData.titleNew,
				wa_id: modificationData.waId,
				date: modificationData.dateStrNew,
				time: modificationData.timeStrNew,
				isLocalized: this.isLocalized,
				error: errorMessage,
			});
			return { success: false };
		}

		// Notify callback
		const extendedProps: {
			type: number;
			cancelled: boolean;
			reservationId?: number;
		} = {
			type: Number(modificationData.typeNew),
			cancelled: false,
		};

		// Only add reservationId if it's defined
		if (typeof reservationId === "number") {
			extendedProps.reservationId = reservationId;
		}

		onEventModified?.(modificationData.evId, {
			id: modificationData.evId,
			title: modificationData.titleNew,
			start: `${modificationData.dateStrNew}T${slotTime}:00`,
			end: `${modificationData.dateStrNew}T${slotTime}:00`,
			extendedProps: {
				...extendedProps,
				// Ensure waId propagates so downstream grid can resolve phone immediately
				waId: modificationData.waId,
			},
		});

		// Reflow new slot to apply deterministic ordering and spacing (use normalized slot time)
		try {
			const baseTimeNew = this.formattingService.normalizeToSlotBase(
				modificationData.dateStrNew,
				modificationData.timeStrNew
			);
			// Ensure new event metadata is present before reflow
			this.calendarIntegration.updateEventSlotMetadata(
				modificationData.evId,
				modificationData.dateStrNew,
				baseTimeNew
			);
			this.calendarIntegration.reflowSlot(
				modificationData.dateStrNew,
				baseTimeNew
			);
		} catch {
			// Silently ignore reflow errors for new slot
		}

		// Track successful operation
		const operation: SuccessfulOperation = {
			type: "modify",
			id: modificationData.evId,
			data: {
				waId: modificationData.waId,
				date: modificationData.dateStrNew,
				time: slotTime,
				type: Number(modificationData.typeNew),
			},
		};

		// Store context and mark local echo
		this.storeModificationContext(modificationData, original);
		this.markLocalEchoForModification(resp, modificationData, original);

		// Show success notification
		try {
			toastService.reservationModified({
				customer: modificationData.titleNew,
				wa_id: modificationData.waId,
				date: modificationData.dateStrNew,
				time: slotTime,
				isLocalized: this.isLocalized,
			});
		} catch {
			// Silently ignore toast notification errors
		}

		return { success: true, operation };
	}

	private prepareModificationData(
		change: RowChange,
		original: CalendarEvent
	): ModificationData {
		let dateStrNew = original.start?.split("T")[0] || "";
		let timeStrNew =
			original.start?.split("T")[1]?.slice(0, TIME_SLICE_LENGTH) || "00:00";
		if (change.scheduled_time instanceof Date) {
			const s = change.scheduled_time;
			dateStrNew = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(
				s.getDate()
			).padStart(2, "0")}`;
			timeStrNew = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
		} else if (
			typeof change.scheduled_time === "string" &&
			change.scheduled_time.includes("T")
		) {
			const [dPart, tPart] = change.scheduled_time.split("T");
			dateStrNew = dPart as string;
			timeStrNew = this.formattingService.to24h(
				tPart ||
					original.start?.split("T")[1]?.slice(0, TIME_SLICE_LENGTH) ||
					"00:00"
			);
		} else {
			// Backward compatibility
			timeStrNew = this.formattingService.to24h(
				(change as unknown as { time?: string }).time ||
					original.start?.split("T")[1]?.slice(0, TIME_SLICE_LENGTH) ||
					"00:00"
			);
			dateStrNew = ((change as unknown as { date?: string }).date ||
				dateStrNew) as string;
		}
		const typeNew = this.formattingService.parseType(
			change.type ?? original.extendedProps?.type
		);
		const titleNew =
			change.name ||
			original.title ||
			original.extendedProps?.customerName ||
			original.extendedProps?.waId ||
			original.extendedProps?.wa_id ||
			original.id ||
			"";

		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			"[ReservationModifyService] prepareModificationData input",
			{
				change,
				originalId: original.id,
				originalWaId:
					original.extendedProps?.waId ||
					original.extendedProps?.wa_id ||
					original.id,
			}
		);

		// If the phone was edited in the grid, treat it as switching the reservation to a different customer
		const nextWaId = (() => {
			const editedPhone = (change as { phone?: unknown }).phone as
				| string
				| undefined;
			if (typeof editedPhone === "string" && editedPhone.trim() !== "") {
				return normalizePhoneForStorage(editedPhone);
			}
			return (
				original.extendedProps?.waId ||
				original.extendedProps?.wa_id ||
				original.id ||
				""
			).toString();
		})();

		return {
			evId: String(original.id),
			waId: nextWaId,
			titleNew,
			dateStrNew,
			timeStrNew,
			typeNew,
			prevDate: original.start?.split("T")[0] || "",
			prevStartStr: original.start || "",
		};
	}

	private applyOptimisticUpdates(modificationData: ModificationData): void {
		// Update event properties
		this.calendarIntegration.updateEventProperties(modificationData.evId, {
			title: modificationData.titleNew,
			type: Number(modificationData.typeNew),
			cancelled: false,
			waId: modificationData.waId,
		});

		// Update timing
		const startIso = `${modificationData.dateStrNew}T${modificationData.timeStrNew}:00`;
		this.calendarIntegration.updateEventTiming(
			modificationData.evId,
			modificationData.prevStartStr,
			startIso
		);
	}

	private storeModificationContext(
		modificationData: ModificationData,
		original: CalendarEvent
	): void {
		this.localEchoManager.storeModificationContext(modificationData.evId, {
			waId: modificationData.waId,
			prevDate: modificationData.prevDate,
			prevTime: modificationData.prevStartStr
				.split("T")[1]
				?.slice(0, TIME_SLICE_LENGTH),
			prevType: original.extendedProps?.type,
			name: modificationData.titleNew,
			newDate: modificationData.dateStrNew,
			newTime: modificationData.timeStrNew,
			newType: Number(modificationData.typeNew),
		});
	}

	private markLocalEchoForModification(
		resp: ApiResponse,
		modificationData: ModificationData,
		original: CalendarEvent
	): void {
		// Generate all possible key variants that buildLocalOpCandidates would check
		const keys = generateLocalOpKeys("reservation_updated", {
			id:
				resp?.id ||
				original.extendedProps?.reservationId ||
				modificationData.evId,
			wa_id: modificationData.waId,
			date: modificationData.dateStrNew,
			time: modificationData.timeStrNew,
		});

		// Mark all variants to ensure WebSocket echo is suppressed
		for (const key of keys) {
			this.localEchoManager.markLocalEcho(key);
		}
	}

	private handleModificationError(error: Error): void {
		toastService.error(
			i18n.getMessage("update_failed", this.isLocalized),
			error?.message ||
				i18n.getMessage("system_error_try_later", this.isLocalized),
			ERROR_TOAST_DELAY_MS
		);
	}

	private extractReservationId(original: CalendarEvent): number | undefined {
		try {
			const ext = (
				original as unknown as {
					extendedProps?: {
						reservationId?: unknown;
						reservation_id?: unknown;
					};
					id?: unknown;
				}
			).extendedProps;

			// Try primary field
			const primary = ext?.reservationId;
			if (typeof primary === "number") {
				return primary;
			}
			if (typeof primary === "string") {
				const n = Number(primary);
				if (Number.isFinite(n)) {
					return n;
				}
			}

			// Try alternative field
			const alt = ext?.reservation_id;
			if (typeof alt === "number") {
				return alt;
			}
			if (typeof alt === "string") {
				const n2 = Number(alt);
				if (Number.isFinite(n2)) {
					return n2;
				}
			}

			// Try id field as fallback
			const fromId = Number((original as unknown as { id?: unknown }).id);
			if (Number.isFinite(fromId)) {
				return fromId;
			}
		} catch {
			// Intentionally ignore parsing errors
		}
		return;
	}
}

export { ReservationModifyService };
