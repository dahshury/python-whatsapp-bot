"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import { chatKeys } from "@/shared/api/query-keys";
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: waId ? chatKeys.messages(waId) : ["conversation-messages", null],
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

  // Invalidate query when realtime conversation_new_message events arrive
  useEffect(() => {
    if (!waId) {
      return;
    }

    const handler = (ev: Event) => {
      try {
        const customEvent = ev as CustomEvent;
        const detail = customEvent.detail || {};
        if (
          detail?.type === "conversation_new_message" &&
          detail?.data?.wa_id === waId
        ) {
          // Invalidate the query to refetch and show the new message
          queryClient.invalidateQueries({
            queryKey: chatKeys.messages(waId),
          });
        }
      } catch (_error) {
        // Silently handle errors in event handler
      }
    };

    window.addEventListener("realtime", handler as EventListener);
    return () => {
      window.removeEventListener("realtime", handler as EventListener);
    };
  }, [waId, queryClient]);

  return query;
}
