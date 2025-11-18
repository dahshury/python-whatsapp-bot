import type { ApiResponse } from '@/shared/api'
import { ApiClient } from '@/shared/api'
import type { ConversationMessageDto } from '../dto/conversation.dto'

export const ConversationAdapter = () => ({
	getByWaId: async (waId: string): Promise<ConversationMessageDto[]> => {
		const api = new ApiClient()
		const res = (await api.get<ConversationMessageDto[]>(
			`/conversations/${encodeURIComponent(waId)}`
		)) as ApiResponse<ConversationMessageDto[]>
		return res?.data ?? []
	},
	save: async (
		waId: string,
		messages: ConversationMessageDto[]
	): Promise<ApiResponse<unknown>> => {
		const api = new ApiClient()
		return (await api.post(`/conversations/${encodeURIComponent(waId)}`, {
			messages,
		})) as ApiResponse<unknown>
	},
})
