'use client'

import { useMemo } from 'react'
import type { ConversationMessage } from '@/entities/conversation'

export function useConversationActivity(
	messages: ConversationMessage[]
): boolean {
	return useMemo(() => {
		const list = messages || []
		if (!list.length) {
			return true
		}
		try {
			const lastUserMessage = [...list]
				.reverse()
				.find((m) => m && m.role === 'user')
			if (!(lastUserMessage?.date && lastUserMessage.time)) {
				return true
			}
			const lastMessageDateTime = new Date(
				`${lastUserMessage.date}T${lastUserMessage.time}`
			)
			const now = new Date()
			const MILLISECONDS_PER_SECOND = 1000
			const SECONDS_PER_MINUTE = 60
			const MINUTES_PER_HOUR = 60
			const MILLISECONDS_PER_HOUR =
				MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR
			const HOURS_DIFF_THRESHOLD = 24
			const hoursDiff =
				(now.getTime() - lastMessageDateTime.getTime()) / MILLISECONDS_PER_HOUR
			return hoursDiff > HOURS_DIFF_THRESHOLD
		} catch {
			return true
		}
	}, [messages])
}
