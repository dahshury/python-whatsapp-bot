import { useConversationsData, useReservationsData } from "@shared/libs/data/websocket-data-provider";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { useCallback } from "react";

export function useChatSidebar() {
	const { isOpen, open, close, selectedConversationId, setConversation } = useSidebarChatStore();
	const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close]);
	const { conversations, refresh: refreshConversations } = useConversationsData();
	const { reservations } = useReservationsData();
	const fetchConversations = useCallback(async () => {
		await refreshConversations();
	}, [refreshConversations]);
	return {
		isOpen,
		open,
		close,
		toggle,
		selectedConversationId,
		setConversation,
		conversations,
		reservations,
		fetchConversations,
	};
}
