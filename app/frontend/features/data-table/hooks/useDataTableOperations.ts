import type { CalendarApi } from '@/entities/event'
import { useReservations } from '@/features/reservations'

export function useDataTableOperations(
	calendarApi: CalendarApi | null,
	isLocalized: boolean,
	refreshCustomerData?: () => Promise<void>
) {
	return useReservations(calendarApi, isLocalized, refreshCustomerData)
}
