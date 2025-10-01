"use client";

import * as React from "react";
import type { ConversationMessage } from "@/types/conversation";

export function useConversationMessages(
	rawConversations: unknown,
	additionalMessages: Record<string, ConversationMessage[]>,
	selectedConversationId: string | null,
) {
	const conversations = rawConversations as unknown as Record<
		string,
		ConversationMessage[]
	>;

	const currentConversation = React.useMemo<ConversationMessage[]>(() => {
		return selectedConversationId
			? ((conversations[selectedConversationId] || []) as ConversationMessage[])
			: [];
	}, [conversations, selectedConversationId]);

	const additionalForCurrent = React.useMemo<ConversationMessage[]>(() => {
		return selectedConversationId
			? additionalMessages[selectedConversationId] || []
			: [];
	}, [additionalMessages, selectedConversationId]);

	const allMessages = React.useMemo<ConversationMessage[]>(() => {
		return [
			...currentConversation,
			...additionalForCurrent,
		] as ConversationMessage[];
	}, [currentConversation, additionalForCurrent]);

	const sortedMessages = React.useMemo<ConversationMessage[]>(() => {
		const arr = [...allMessages];
		arr.sort((a, b) => {
			const aTime = new Date(`${a.date} ${a.time}`);
			const bTime = new Date(`${b.date} ${b.time}`);
			return aTime.getTime() - bTime.getTime();
		});
		return arr as ConversationMessage[];
	}, [allMessages]);

	return {
		currentConversation,
		additionalForCurrent,
		allMessages,
		sortedMessages,
	} as const;
}
