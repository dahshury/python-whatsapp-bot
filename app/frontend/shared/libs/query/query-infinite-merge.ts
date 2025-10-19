import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ConversationMessage } from "@/entities/conversation";
import { queryKeys } from "./query-keys";

/**
 * Merge new messages from websocket into existing infinite query pages.
 * Appends new messages to the first page if they're newer than the last message.
 */
export function mergeConversationMessagesIntoInfiniteCache(
	queryClient: QueryClient,
	waId: string,
	newMessages: ConversationMessage[]
): void {
	const hasNoMessages = !Array.isArray(newMessages) || newMessages.length === 0;
	if (!waId || hasNoMessages) {
		return;
	}

	// Find all infinite queries for this waId
	const queryCache = queryClient.getQueryCache();
	const queries = queryCache.findAll({
		queryKey: queryKeys.conversations.messages(waId),
		type: "active",
	});

	for (const query of queries) {
		const currentData = query.state.data as
			| InfiniteData<ConversationMessage[]>
			| undefined;
		if (!currentData?.pages) {
			continue;
		}

		// Append new messages to the first page (most recent)
		const firstPage = currentData.pages[0] || [];
		const lastInCache = firstPage.at(-1);
		const newestIncoming = newMessages.at(-1);

		// Only merge if the incoming message is newer (simple heuristic: different timestamp/content)
		const shouldMerge =
			!lastInCache ||
			lastInCache.time !== newestIncoming?.time ||
			lastInCache.message !== newestIncoming?.message;

		if (shouldMerge) {
			const updatedFirstPage = [...firstPage, ...newMessages];
			const updatedPages = [updatedFirstPage, ...currentData.pages.slice(1)];

			queryClient.setQueryData(query.queryKey, {
				...currentData,
				pages: updatedPages,
			});
		}
	}
}
