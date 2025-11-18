import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import { useCallback } from 'react'
import { useReservationsForDateRange } from '@/features/calendar/hooks/useCalendarReservations'

export function useChatSidebar() {
	const { isOpen, open, close, selectedConversationId, setConversation } =
		useSidebarChatStore()
	const toggle = useCallback(
		() => (isOpen ? close() : open()),
		[isOpen, open, close]
	)
	// Fetch reservations on-demand using TanStack Query (last 30 days + next 90 days)
	// This covers customer name resolution and reservation display in sidebar
	const { data: reservations = {} } = useReservationsForDateRange(
		undefined, // Use default (30 days ago)
		undefined, // Use default (90 days from now)
		false // Don't include cancelled reservations
	)

	return {
		isOpen,
		open,
		close,
		toggle,
		selectedConversationId,
		setConversation,
		reservations,
		// fetchConversations removed - use useConversationMessagesQuery hook instead
	}
}
