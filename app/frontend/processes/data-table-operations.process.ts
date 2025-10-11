import { LocalEchoManager } from "@shared/libs/utils/local-echo.manager";
import type { CalendarApi, CalendarEvent, OperationResult, RowChange, SuccessfulOperation } from "@/entities/event";
import { CalendarIntegrationService } from "../services/calendar/calendar-integration.service";
import { ReservationCancelService } from "../services/operations/reservation-cancel.service";
import { ReservationCreateService } from "../services/operations/reservation-create.service";
import { ReservationModifyService } from "../services/operations/reservation-modify.service";
import { FormattingService } from "../services/utils/formatting.service";
import { WebSocketService } from "../services/websocket/websocket.service";

/**
 * Main service orchestrator for data table operations
 * Uses dependency injection and follows clean architecture principles
 */
export class DataTableOperationsService {
	private readonly cancelService: ReservationCancelService;
	private readonly modifyService: ReservationModifyService;
	private readonly createService: ReservationCreateService;
	private readonly calendarIntegration: CalendarIntegrationService;

	constructor(
		calendarApi: CalendarApi,
		private readonly isLocalized: boolean,
		private readonly refreshCustomerData?: () => Promise<void>
	) {
		// Initialize core services
		const webSocketService = new WebSocketService();
		const formattingService = new FormattingService();
		const localEchoManager = new LocalEchoManager();

		// Initialize calendar integration
		this.calendarIntegration = new CalendarIntegrationService(calendarApi, localEchoManager);

		// Initialize operation services with dependency injection
		this.cancelService = new ReservationCancelService(
			this.calendarIntegration,
			localEchoManager,
			this.isLocalized,
			webSocketService
		);

		this.modifyService = new ReservationModifyService(
			this.calendarIntegration,
			webSocketService,
			formattingService,
			localEchoManager,
			this.isLocalized
		);

		this.createService = new ReservationCreateService(formattingService, localEchoManager, this.isLocalized);
	}

	/**
	 * Process reservation cancellations
	 */
	async processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void,
		_onEventAdded?: (event: CalendarEvent) => void
	): Promise<OperationResult> {
		return this.cancelService.processCancellations(deletedRows, gridRowToEventMap, onEventCancelled);
	}

	/**
	 * Process reservation modifications
	 */
	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void
	): Promise<OperationResult> {
		return this.modifyService.processModifications(editedRows, gridRowToEventMap, onEventModified);
	}

	/**
	 * Process reservation additions
	 */
	async processAdditions(
		addedRows: Array<RowChange>,
		onEventAdded?: (event: CalendarEvent) => void,
		_onEventCancelled?: (eventId: string) => void
	): Promise<OperationResult> {
		return this.createService.processAdditions(addedRows, onEventAdded);
	}

	/**
	 * Update calendar after operations complete
	 */
	updateCalendarWithOperations(
		successfulOperations: SuccessfulOperation[],
		_onEventAdded?: (event: CalendarEvent) => void
	): void {
		try {
			// Reflow slots for newly created reservations to ensure deterministic sorting
			// and spacing immediately after additions (drag/modify/cancel already reflow elsewhere).
			try {
				const seen = new Set<string>();
				for (const op of successfulOperations || []) {
					if (!op || op.type !== "create") continue;
					const date = (op as { data?: { date?: string } })?.data?.date;
					const time = (op as { data?: { time?: string } })?.data?.time;
					if (!date || !time) continue;
					const key = `${date}T${time}`;
					if (seen.has(key)) continue;
					seen.add(key);
					// Best-effort: reflow the affected slot; if the event isn't mounted yet,
					// this still stabilizes ordering of existing events. The WS echo path also reflows.
					try {
						this.calendarIntegration.reflowSlot(date, time);
					} catch {}
				}
			} catch {}

			this.calendarIntegration.updateSize();
			if (typeof this.refreshCustomerData === "function") {
				void this.refreshCustomerData();
			}
		} catch {}
	}
}

// Re-export types for external consumption
export type { CalendarApi, CalendarEvent, OperationResult, RowChange, SuccessfulOperation } from "@/entities/event";
