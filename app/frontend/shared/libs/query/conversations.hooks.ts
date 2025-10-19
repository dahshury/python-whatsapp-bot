"use client";

import {
	fetchConversationMessages,
	fetchConversations,
} from "@shared/libs/api";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ConversationMessage } from "@/entities/conversation";
import { queryKeys } from "./query-keys";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const STALE_TIME_SECONDS = 30;
const GC_TIME_MINUTES = 5;
const STALE_TIME_30S = STALE_TIME_SECONDS * MILLISECONDS_PER_SECOND;
const GC_TIME_5M =
	GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export function useConversations(options?: {
	waId?: string;
	fromDate?: string;
	toDate?: string;
	limit?: number;
	recent?: string;
}) {
	return useQuery({
		queryKey: queryKeys.conversations.list(options),
		queryFn: ({ signal }) => fetchConversations(options, signal),
		staleTime: STALE_TIME_30S,
		gcTime: GC_TIME_5M,
	});
}

// Paged by date desc using fromDate cursor
export function useConversationMessagesInfinite(
	waId: string,
	options?: { fromDate?: string; toDate?: string; limit?: number }
) {
	const enabled = waId.length !== 0;
	return useInfiniteQuery({
		queryKey: queryKeys.conversations.messages(waId, options),
		queryFn: async ({ pageParam, signal }) => {
			const pageOptions = {
				...options,
				...(pageParam ? { fromDate: String(pageParam) } : {}),
			};
			const resp = (await fetchConversationMessages(
				waId,
				pageOptions,
				signal
			)) as unknown as {
				data?: Record<string, ConversationMessage[]>;
			};
			const list = resp?.data?.[waId] ?? [];
			return list as ConversationMessage[];
		},
		getNextPageParam: (lastPage) => {
			const last = lastPage?.at?.(-1);
			return last?.date ? String(last.date) : undefined;
		},
		initialPageParam: options?.fromDate,
		enabled,
		staleTime: STALE_TIME_30S,
		gcTime: GC_TIME_5M,
	});
}
