import type {
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from '@/entities/event'

export type ReservationProcessingOptions = {
	freeRoam: boolean
	isLocalized: boolean
	vacationPeriods: Array<{ start: string | Date; end: string | Date }>
	ageByWaId?: Record<string, number | null>
}

export type CalendarIntegration = {
	reflowSlot: (date: string, time: string) => void
	updateSize: () => void
	updateEventProperties: (
		eventId: string,
		props: { title?: string; type?: number; cancelled?: boolean }
	) => void
	updateEventTiming: (
		eventId: string,
		prevStartIso: string,
		nextStartIso: string
	) => void
	markEventCancelled: (eventId: string) => void
	removeEvent: (eventId: string) => void
	isTimeGridView: () => boolean
}

export type ReservationsUseCase = {
	// Event processing
	generateCalendarEvents(
		reservationsByUser: Record<
			string,
			Array<{
				date: string
				time_slot: string
				customer_name?: string
				title?: string
				[key: string]: unknown
			}>
		>,
		conversationsByUser: Record<
			string,
			Array<{ id?: string; text?: string; ts?: string }>
		>,
		options: ReservationProcessingOptions
	): CalendarEvent[]

	// Operations
	processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void
	): Promise<OperationResult>

	processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void
	): Promise<OperationResult>

	processAdditions(
		addedRows: RowChange[],
		onEventAdded?: (event: CalendarEvent) => void
	): Promise<OperationResult>

	updateCalendarWithOperations(
		successfulOperations: SuccessfulOperation[]
	): void
}
