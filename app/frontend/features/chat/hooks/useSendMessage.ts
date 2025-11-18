import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConversationMessage } from '@/entities/conversation'
import { chatKeys } from '@/shared/api/query-keys'
import type { ChatMessageDto, ChatUseCase } from '../usecase/chat.usecase'

type SendMessageVariables = {
	content: string
	signal?: AbortSignal
}

const formatDate = (date: Date) => {
	try {
		return date.toISOString().slice(0, 10)
	} catch {
		return new Date().toISOString().slice(0, 10)
	}
}

const formatTime = (date: Date) => {
	try {
		const hours = date.getHours().toString().padStart(2, '0')
		const minutes = date.getMinutes().toString().padStart(2, '0')
		return `${hours}:${minutes}`
	} catch {
		return '00:00'
	}
}

export const createUseSendMessage =
	(chat: ChatUseCase) => (conversationId: string) => {
		const queryClient = useQueryClient()

		const mutation = useMutation<ChatMessageDto, unknown, SendMessageVariables>(
			{
				mutationFn: (variables: SendMessageVariables) => {
					const options: { signal?: AbortSignal } = {}
					if (variables.signal) {
						options.signal = variables.signal
					}
					return chat.sendMessage(conversationId, variables.content, options)
				},
				onSuccess: (_response, variables) => {
					if (!conversationId) {
						return
					}
					const now = new Date()
					const optimisticMessage: ConversationMessage = {
						role: 'secretary',
						message: variables.content,
						date: formatDate(now),
						time: formatTime(now),
					}
					queryClient.setQueryData<ConversationMessage[]>(
						chatKeys.messages(conversationId),
						(previous) => [...(previous ?? []), optimisticMessage]
					)
				},
				onSettled: async () => {
					if (!conversationId) {
						return
					}
					await queryClient.invalidateQueries({
						queryKey: chatKeys.conversation(conversationId),
					})
					await queryClient.invalidateQueries({
						queryKey: chatKeys.messages(conversationId),
					})
				},
			}
		)

		const sendMessage = (
			content: string,
			options?: { signal?: AbortSignal }
		) => {
			const variables: SendMessageVariables = { content }
			if (options?.signal) {
				variables.signal = options.signal
			}
			return mutation.mutateAsync(variables)
		}

		return {
			sendMessage,
			isPending: mutation.isPending,
			isError: mutation.isError,
			error: mutation.error,
		} as const
	}
