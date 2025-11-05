"use client";

import { useQuery } from "@tanstack/react-query";
import type { ConversationMessage } from "@/entities/conversation";
import { callPythonBackend } from "@/shared/libs/backend";

type ConversationMessagesResponse = {
  success: boolean;
  data: Record<string, ConversationMessage[]>;
};

/**
 * Hook for fetching conversation messages on-demand for a specific customer.
 * Only fetches when waId is provided.
 * Uses TanStack Query for caching and state management.
 */
export function useConversationMessagesQuery(waId: string | null) {
  return useQuery({
    queryKey: ["conversation-messages", waId],
    queryFn: async (): Promise<ConversationMessage[]> => {
      if (!waId) {
        return [];
      }

      const response = await callPythonBackend<ConversationMessagesResponse>(
        `/conversations/${encodeURIComponent(waId)}?limit=0`
      );

      if (!(response.success && response.data)) {
        return [];
      }

      // Extract messages for this specific waId
      const messages = response.data[waId] || [];
      return messages.map((msg) => ({
        role: msg.role || "user",
        message: msg.message || "",
        date: msg.date || "",
        time: msg.time || "",
      }));
    },
    enabled: Boolean(waId),
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}
