import { ApiClient } from '@/shared/api'
import type { ChatMessageDto, ChatUseCase } from '../usecase/chat.usecase'

export const ChatService = (): ChatUseCase => ({
	listMessages: async (conversationId: string): Promise<ChatMessageDto[]> => {
		const api = new ApiClient()
		const data = await api.get<ChatMessageDto[]>(
			`/conversations/${encodeURIComponent(conversationId)}/messages`
		)
		return data?.data || []
	},

	sendMessage: async (
		conversationId: string,
		content: string
	): Promise<ChatMessageDto> => {
		const api = new ApiClient()
		const data = await api.post<ChatMessageDto>(
			`/conversations/${encodeURIComponent(conversationId)}/messages`,
			{ content }
		)
		if (!data?.data) {
			throw new Error('Failed to send message')
		}
		return data.data
	},
})
