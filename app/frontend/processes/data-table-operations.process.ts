import { LocalEchoManager } from "@shared/libs/utils/local-echo.manager";
import type {
	CalendarApi,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from "@/entities/event";
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
	private readonly isLocalized: boolean;
	private readonly refreshCustomerData?: (() => Promise<void>) | undefined;

	constructor(options: {
		calendarApi: CalendarApi;
		gridRowToEventMap?: Map<number, CalendarEvent>;
		slotDurationHours?: number;
		isLocalized: boolean;
		refreshCustomerData?: (() => Promise<void>) | undefined;
	}) {
		// Initialize core services
		this.isLocalized = options.isLocalized;
		this.refreshCustomerData = options.refreshCustomerData;

		const webSocketService = new WebSocketService();
		const formattingService = new FormattingService();
		const localEchoManager = new LocalEchoManager();

		// Initialize calendar integration
		this.calendarIntegration = new CalendarIntegrationService(
			options.calendarApi,
			localEchoManager
		);

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

		this.createService = new ReservationCreateService(
			formattingService,
			localEchoManager,
			this.isLocalized
		);
	}

	/**
	 * Process reservation cancellations
	 */
	processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void,
		_onEventAdded?: (event: CalendarEvent) => void
	): Promise<OperationResult> {
		return this.cancelService.processCancellations(
			deletedRows,
			gridRowToEventMap,
			onEventCancelled
		);
	}

	/**
	 * Process reservation modifications
	 */
	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void
	): Promise<OperationResult> {
		return await this.modifyService.processModifications(
			editedRows,
			gridRowToEventMap,
			onEventModified
		);
	}

	/**
	 * Process reservation additions
	 */
	async processAdditions(
		addedRows: RowChange[],
		onEventAdded?: (event: CalendarEvent) => void,
		_onEventCancelled?: (eventId: string) => void
	): Promise<OperationResult> {
		return await this.createService.processAdditions(addedRows, onEventAdded);
	}

	/**
	 * Update calendar after operations complete
	 */
	updateCalendarWithOperations(
		successfulOperations: SuccessfulOperation[],
		_onEventAdded?: (event: CalendarEvent) => void
	): void {
		try {
			// Reflow slots for all operations (create/modify/cancel) to ensure deterministic sorting
			// and spacing immediately after changes.
			try {
				const seen = new Set<string>();
				for (const op of successfulOperations || []) {
					if (!op) {
						continue;
					}
					const date = (op as { data?: { date?: string } })?.data?.date;
					const time = (op as { data?: { time?: string } })?.data?.time;
					if (!(date && time)) {
						continue;
					}
					const key = `${date}T${time}`;
					if (seen.has(key)) {
						continue;
					}
					seen.add(key);
					// Reflow affected slot after create/modify/cancel to ensure sorting
					try {
						this.calendarIntegration.reflowSlot(date, time);
					} catch (_error) {
						// Silently ignore slot reflow errors - not critical for UI
					}
				}
			} catch (_error) {
				// Silently ignore group processing errors
			}

			this.calendarIntegration.updateSize();
			if (typeof this.refreshCustomerData === "function") {
				this.refreshCustomerData();
			}
		} catch (_error) {
			// Silently ignore calendar update errors
		}
	}
}

// Re-export types for external consumption
export type {
	CalendarApi,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from "@/entities/event";
