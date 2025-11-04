import { apiClient } from '@/shared/api'
import type { UserDto } from '../dto/user.dto'

export const UserAdapter = () => ({
	getById: async (id: string): Promise<UserDto | null> => {
		const res = await apiClient.get<UserDto>(`/users/${encodeURIComponent(id)}`)
		return (res?.data as UserDto) ?? null
	},
	getByWaId: async (waId: string): Promise<UserDto | null> => {
		const res = await apiClient.get<UserDto>(
			`/customers/${encodeURIComponent(waId)}`
		)
		return (res?.data as UserDto) ?? null
	},
})
