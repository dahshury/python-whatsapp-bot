import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatKeys } from '@/shared/api/query-keys'
import type { ChatUseCase } from '../usecase/chat.usecase'

export const createUseChatMessages =
	(chat: ChatUseCase) => (conversationId: string) => {
		const queryClient = useQueryClient()
		const query = useQuery({
			queryKey: chatKeys.conversation(conversationId),
			queryFn: () => chat.listMessages(conversationId),
			enabled: Boolean(conversationId),
		})

		const mutation = useMutation({
			mutationFn: (content: string) =>
				chat.sendMessage(conversationId, content),
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: chatKeys.conversation(conversationId),
				})
			},
		})

		return { ...query, send: mutation.mutateAsync } as const
	}
