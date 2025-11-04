'use client'

import { useMemo } from 'react'
import type { ConversationMessage } from '@/entities/conversation'

export function useConversationMessages(
	rawConversations: unknown,
	additionalMessages: Record<string, ConversationMessage[]>,
	selectedConversationId: string | null
) {
	const conversations = rawConversations as unknown as Record<
		string,
		ConversationMessage[]
	>

	const currentConversation = useMemo<ConversationMessage[]>(
		() =>
			selectedConversationId
				? ((conversations[selectedConversationId] ||
						[]) as ConversationMessage[])
				: [],
		[conversations, selectedConversationId]
	)

	const additionalForCurrent = useMemo<ConversationMessage[]>(
		() =>
			selectedConversationId
				? additionalMessages[selectedConversationId] || []
				: [],
		[additionalMessages, selectedConversationId]
	)

	const allMessages = useMemo<ConversationMessage[]>(
		() =>
			[
				...currentConversation,
				...additionalForCurrent,
			] as ConversationMessage[],
		[currentConversation, additionalForCurrent]
	)

	const sortedMessages = useMemo<ConversationMessage[]>(() => {
		const arr = [...allMessages]
		arr.sort((a, b) => {
			const aTime = new Date(`${a.date} ${a.time}`)
			const bTime = new Date(`${b.date} ${b.time}`)
			return aTime.getTime() - bTime.getTime()
		})
		return arr as ConversationMessage[]
	}, [allMessages])

	return {
		currentConversation,
		additionalForCurrent,
		allMessages,
		sortedMessages,
	} as const
}
