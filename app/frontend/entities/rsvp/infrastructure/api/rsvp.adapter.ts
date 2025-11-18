import { ApiClient } from '@/shared/api'
import type { RsvpDto } from '../dto/rsvp.dto'

export const RsvpAdapter = () => {
	const api = new ApiClient()
	return {
		getById: async (id: string | number): Promise<RsvpDto | null> => {
			const res = await api.get<RsvpDto>(
				`/rsvps/${encodeURIComponent(String(id))}`
			)
			return res?.data || null
		},
		save: async (payload: RsvpDto): Promise<RsvpDto> => {
			const res = await api.post<RsvpDto>('/rsvps', payload)
			return (res?.data as RsvpDto) || payload
		},
		update: async (payload: RsvpDto): Promise<RsvpDto> => {
			const res = await api.put<RsvpDto>(
				`/rsvps/${encodeURIComponent(String(payload.id || ''))}`,
				payload
			)
			return (res?.data as RsvpDto) || payload
		},
	}
}
