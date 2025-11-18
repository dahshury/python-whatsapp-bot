import type { ApiClient } from '@/shared/api'
import type { PhoneDto } from '../dto/phone.dto'

export const PhoneAdapter = (apiClient: ApiClient) => ({
	search: async (q: string): Promise<PhoneDto[]> => {
		const res = await apiClient.get<PhoneDto[]>(
			`/phone/search?q=${encodeURIComponent(q)}`
		)
		return (res?.data || []) as PhoneDto[]
	},
	create: async (dto: PhoneDto): Promise<PhoneDto> => {
		const res = await apiClient.post<PhoneDto>('/phone', dto)
		return (res?.data || dto) as PhoneDto
	},
})
