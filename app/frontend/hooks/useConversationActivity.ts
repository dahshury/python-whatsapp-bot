"use client";

import * as React from "react";
import type { ConversationMessage } from "@/types/conversation";

export function useConversationActivity(
	messages: ConversationMessage[],
): boolean {
	return React.useMemo(() => {
		const list = messages || [];
		if (!list.length) return true;
		try {
			const lastUserMessage = [...list]
				.reverse()
				.find((m) => m && m.role === "user");
			if (!lastUserMessage || !lastUserMessage.date || !lastUserMessage.time)
				return true;
			const lastMessageDateTime = new Date(
				`${lastUserMessage.date}T${lastUserMessage.time}`,
			);
			const now = new Date();
			const hoursDiff =
				(now.getTime() - lastMessageDateTime.getTime()) / (1000 * 60 * 60);
			return hoursDiff > 24;
		} catch {
			return true;
		}
	}, [messages]);
}
