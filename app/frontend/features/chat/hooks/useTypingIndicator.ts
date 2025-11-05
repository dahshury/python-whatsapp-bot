import { useMutation } from "@tanstack/react-query";

type TypingIndicatorPayload = {
  wa_id: string;
  typing: boolean;
};

/**
 * Hook for sending typing indicators to the backend.
 * Uses TanStack Query mutation for better error handling and state management.
 */
export function useTypingIndicator() {
  return useMutation({
    mutationFn: async (payload: TypingIndicatorPayload): Promise<void> => {
      const response = await fetch("/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Typing endpoint responded with ${response.status}`);
      }
    },
    retry: 1,
  });
}
