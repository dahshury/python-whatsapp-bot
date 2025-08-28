import type {
	CalendarApi,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from "./types/data-table-types";
import { WebSocketService } from "./websocket/websocket.service";
import { FormattingService } from "./utils/formatting.service";
import { LocalEchoManager } from "./utils/local-echo.manager";
import { CalendarIntegrationService } from "./calendar/calendar-integration.service";
import { ReservationCancelService } from "./operations/reservation-cancel.service";
import { ReservationModifyService } from "./operations/reservation-modify.service";
import { ReservationCreateService } from "./operations/reservation-create.service";

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
		private readonly isRTL: boolean,
		private readonly slotDurationHours: number,
		private readonly freeRoam: boolean,
		private readonly refreshCustomerData?: () => Promise<void>,
	) {
		// Initialize core services
		const webSocketService = new WebSocketService();
		const formattingService = new FormattingService();
		const localEchoManager = new LocalEchoManager();

		// Initialize calendar integration
		this.calendarIntegration = new CalendarIntegrationService(
			calendarApi,
			localEchoManager,
		);

		// Initialize operation services with dependency injection
		this.cancelService = new ReservationCancelService(
			this.calendarIntegration,
			localEchoManager,
			isRTL,
		);

		this.modifyService = new ReservationModifyService(
			this.calendarIntegration,
			webSocketService,
			formattingService,
			localEchoManager,
			isRTL,
		);

		this.createService = new ReservationCreateService(
			this.calendarIntegration,
			formattingService,
			localEchoManager,
			isRTL,
		);
	}

	/**
	 * Process reservation cancellations
	 */
	async processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void,
		_onEventAdded?: (event: CalendarEvent) => void,
	): Promise<OperationResult> {
		return this.cancelService.processCancellations(
			deletedRows,
			gridRowToEventMap,
			onEventCancelled,
		);
	}

	/**
	 * Process reservation modifications
	 */
	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void,
	): Promise<OperationResult> {
		return this.modifyService.processModifications(
			editedRows,
			gridRowToEventMap,
			onEventModified,
		);
	}

	/**
	 * Process reservation additions
	 */
	async processAdditions(
		addedRows: Array<RowChange>,
		onEventAdded?: (event: CalendarEvent) => void,
		_onEventCancelled?: (eventId: string) => void,
	): Promise<OperationResult> {
		return this.createService.processAdditions(addedRows, onEventAdded);
	}

	/**
	 * Update calendar after operations complete
	 */
	updateCalendarWithOperations(
		_successfulOperations: SuccessfulOperation[],
		_onEventAdded?: (event: CalendarEvent) => void,
	): void {
		try {
			this.calendarIntegration.updateSize();
			if (typeof this.refreshCustomerData === "function") {
				void this.refreshCustomerData();
			}
		} catch {}
	}
}

// Re-export types for external consumption
export type {
	RowChange,
	SuccessfulOperation,
	CalendarEvent,
	CalendarApi,
	OperationResult,
} from "./types/data-table-types";
