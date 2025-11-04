import { ApiClient } from '@/shared/api'
import type { CalendarEventDto, ReservationDto } from '../dto/event.dto'

export const EventAdapter = () => ({
	getReservationById: async (
		id: string | number
	): Promise<ReservationDto | null> => {
		const api = new ApiClient()
		const res = await api.get<ReservationDto>(
			`/reservations/${encodeURIComponent(String(id))}`
		)
		return res?.data || null
	},
	createReservation: async (
		payload: ReservationDto
	): Promise<ReservationDto> => {
		const api = new ApiClient()
		const res = await api.post<ReservationDto>('/reservations', payload)
		return (res?.data as ReservationDto) || payload
	},
	listEvents: async (): Promise<CalendarEventDto[]> => {
		const api = new ApiClient()
		const res = await api.get<CalendarEventDto[]>('/events')
		return res?.data || []
	},
})
