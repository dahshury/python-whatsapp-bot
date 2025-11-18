// Public API - Hooks only
export * from './hooks'
export type {
	CalendarIntegrationService,
	ReservationProcessingOptions,
} from './services/reservation-events.service'
// Event processor utility (used by shared calendar lib)
export { getReservationEventProcessor } from './services/reservation-events.service'

// Types (re-export from usecase for external consumers)
export type { ReservationsUseCase } from './usecase/reservations.usecase'
