import { useCallback } from "react";
import {
	useConversationsData,
	useReservationsData,
} from "@/lib/websocket-data-provider";
import { useSidebarChatStore } from "./sidebar-chat-store";

export function useChatSidebar() {
	const { isOpen, open, close, selectedConversationId, setConversation } =
		useSidebarChatStore();
	const toggle = useCallback(
		() => (isOpen ? close() : open()),
		[isOpen, open, close],
	);
	// Pull live data from the unified provider used by the sidebar
	const { conversations, refresh: refreshConversations } =
		useConversationsData();
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
