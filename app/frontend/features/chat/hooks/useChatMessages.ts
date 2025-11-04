import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChatUseCase } from '../usecase/chat.usecase'

export const createUseChatMessages =
	(chat: ChatUseCase) => (conversationId: string) => {
		const queryClient = useQueryClient()
		const query = useQuery({
			queryKey: ['chat', conversationId],
			queryFn: () => chat.listMessages(conversationId),
			enabled: Boolean(conversationId),
		})

		const mutation = useMutation({
			mutationFn: (content: string) =>
				chat.sendMessage(conversationId, content),
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: ['chat', conversationId],
				})
			},
		})

		return { ...query, send: mutation.mutateAsync } as const
	}
