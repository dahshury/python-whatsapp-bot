/* eslint-disable */
import { toastService } from "@/lib/toast-service";
import type { CalendarIntegrationService } from "../calendar/calendar-integration.service";
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from "../types/data-table-types";
import type { FormattingService } from "../utils/formatting.service";
import type { LocalEchoManager } from "../utils/local-echo.manager";
import type { WebSocketService } from "../websocket/websocket.service";

class ReservationModifyService {
	constructor(
		private readonly calendarIntegration: CalendarIntegrationService,
		private readonly webSocketService: WebSocketService,
		private readonly formattingService: FormattingService,
		private readonly localEchoManager: LocalEchoManager,
		private readonly isLocalized: boolean,
	) {}

	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void,
	): Promise<OperationResult> {
		let hasErrors = false;
		const successful: SuccessfulOperation[] = [];

		const indices = Object.keys(editedRows || {});
		for (const idxStr of indices) {
			const rowIdx = Number(idxStr);
			const change = editedRows[idxStr] || {};
			const original = gridRowToEventMap.get(rowIdx);
			if (!original) continue;

			const modificationData = this.prepareModificationData(change, original);

			try {
				// Optimistic UI updates
				this.applyOptimisticUpdates(modificationData);

				// Reflow previous slot first (use base slot time if known)
				try {
					const prevDate = modificationData.prevDate;
					const prevTime = (String(original?.extendedProps?.slotTime || "") ||
						modificationData.prevStartStr.split("T")[1]?.slice(0, 5) ||
						"00:00") as string;
					if (prevDate && prevTime) {
						console.log("[CAL] reflow prev slot", {
							prevDate,
							prevTime,
							evId: modificationData.evId,
						});
						this.calendarIntegration.reflowSlot(prevDate, prevTime);
					}
				} catch {}

				// Backend modification - normalize time to slot base
				const slotTime = this.formattingService.normalizeToSlotBase(
					modificationData.dateStrNew,
					modificationData.timeStrNew,
				);
				const reservationId = original.extendedProps?.reservationId;
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
				if (typeof reservationId === 'number') {
					modifyParams.reservationId = reservationId;
				}

				const resp = await this.webSocketService.modifyReservation(
					modificationData.waId,
					modifyParams,
				);

				if (!resp?.success) {
					// Backend rejected the modification - revert optimistic changes
					hasErrors = true;

					// Show specific backend error notification
					const errorMessage = resp?.message || resp?.error || "Modify failed";
					toastService.reservationModificationFailed({
						customer: modificationData.titleNew,
						wa_id: modificationData.waId,
						date: modificationData.dateStrNew,
						time: modificationData.timeStrNew,
						isLocalized: this.isLocalized,
						error: errorMessage,
					});

					// TODO: Add revert logic for optimistic updates if needed
					// Continue to next modification without throwing
					continue;
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
				if (typeof original.extendedProps?.reservationId === 'number') {
					extendedProps.reservationId = original.extendedProps.reservationId;
				}

				onEventModified?.(modificationData.evId, {
					id: modificationData.evId,
					title: modificationData.titleNew,
					start: `${modificationData.dateStrNew}T${slotTime}:00`,
					end: `${modificationData.dateStrNew}T${slotTime}:00`,
					extendedProps,
				});

				// Reflow new slot to apply deterministic ordering and spacing (use normalized slot time)
				try {
					const baseTimeNew = this.formattingService.normalizeToSlotBase(
						modificationData.dateStrNew,
						modificationData.timeStrNew,
					);
					console.log("[CAL] reflow new slot", {
						date: modificationData.dateStrNew,
						baseTimeNew,
						evId: modificationData.evId,
					});
					this.calendarIntegration.reflowSlot(
						modificationData.dateStrNew,
						baseTimeNew,
					);
				} catch {}

				// Track successful operation
				successful.push({
					type: "modify",
					id: modificationData.evId,
					data: {
						waId: modificationData.waId,
						date: modificationData.dateStrNew,
						time: slotTime,
						type: Number(modificationData.typeNew),
					},
				});

				// Show success toast via centralized notification manager
				// Success notification will come via WebSocket echo - no direct toast needed

				// Store context and mark local echo
				this.storeModificationContext(modificationData, original);
				this.markLocalEchoForModification(resp, modificationData, original);
			} catch (e) {
				hasErrors = true;
				this.handleModificationError(e as Error);
			}
		}

		return { hasErrors, successfulOperations: successful };
	}

	private prepareModificationData(change: RowChange, original: CalendarEvent) {
		const evId = String(original.id);
		const waId = (
			original.extendedProps?.waId ||
			original.extendedProps?.wa_id ||
			original.id ||
			""
		).toString();

		const prevStartStr = original.start;
		const prevDate = prevStartStr.split("T")[0];

		let dateStrNew = prevDate as string;
		let timeStrNew = prevStartStr.split("T")[1]?.slice(0, 5) || "00:00";
		if (change.scheduled_time instanceof Date) {
			const s = change.scheduled_time;
			dateStrNew = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
			timeStrNew = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
		} else if (
			typeof change.scheduled_time === "string" &&
			change.scheduled_time.includes("T")
		) {
			const [dPart, tPart] = change.scheduled_time.split("T");
			dateStrNew = dPart as string;
			timeStrNew = this.formattingService.to24h(
				tPart || prevStartStr.split("T")[1]?.slice(0, 5) || "00:00",
			);
		} else {
			// Backward compatibility
			timeStrNew = this.formattingService.to24h(
				(change as unknown as { time?: string }).time ||
					prevStartStr.split("T")[1]?.slice(0, 5) ||
					"00:00",
			);
			dateStrNew = ((change as unknown as { date?: string }).date ||
				prevDate) as string;
		}
		const typeNew = this.formattingService.parseType(
			change.type ?? original.extendedProps?.type,
		);
		const titleNew =
			change.name ||
			original.title ||
			original.extendedProps?.customerName ||
			waId;

		return {
			evId,
			waId,
			prevStartStr,
			prevDate,
			timeStrNew,
			dateStrNew,
			typeNew,
			titleNew,
		};
	}

	private applyOptimisticUpdates(
		modificationData: ReturnType<typeof this.prepareModificationData>,
	): void {
		// Update event properties
		this.calendarIntegration.updateEventProperties(modificationData.evId, {
			title: modificationData.titleNew,
			type: Number(modificationData.typeNew),
			cancelled: false,
		});

		// Update timing
		const startIso = `${modificationData.dateStrNew}T${modificationData.timeStrNew}:00`;
		this.calendarIntegration.updateEventTiming(
			modificationData.evId,
			modificationData.prevStartStr,
			startIso,
		);
	}

	private storeModificationContext(
		modificationData: ReturnType<typeof this.prepareModificationData>,
		original: CalendarEvent,
	): void {
		this.localEchoManager.storeModificationContext(modificationData.evId, {
			waId: modificationData.waId,
			prevDate: modificationData.prevDate,
			prevTime: modificationData.prevStartStr.split("T")[1]?.slice(0, 5),
			prevType: original.extendedProps?.type,
			name: modificationData.titleNew,
			newDate: modificationData.dateStrNew,
			newTime: modificationData.timeStrNew,
			newType: Number(modificationData.typeNew),
		});
	}

	private markLocalEchoForModification(
		resp: ApiResponse,
		modificationData: ReturnType<typeof this.prepareModificationData>,
		original: CalendarEvent,
	): void {
		const key1 = `reservation_updated:${String(
			resp?.id ||
				original.extendedProps?.reservationId ||
				modificationData.evId,
		)}:${modificationData.dateStrNew}:${modificationData.timeStrNew}`;
		const key2 = `reservation_updated:${String(modificationData.waId)}:${modificationData.dateStrNew}:${modificationData.timeStrNew}`;

		this.localEchoManager.markLocalEcho(key1);
		this.localEchoManager.markLocalEcho(key2);
	}

	private handleModificationError(error: Error): void {
		toastService.error(
			this.isLocalized ? "فشل التعديل" : "Update Failed",
			error?.message ||
				(this.isLocalized ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later"),
			3000,
		);
	}
}

export { ReservationModifyService };
