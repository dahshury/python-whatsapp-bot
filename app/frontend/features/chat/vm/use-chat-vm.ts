/**
 * Chat ViewModel
 * Encapsulates chat business logic and state.
 * Views import this to avoid prop drilling and service coupling.
 */

import { useCallback, useMemo } from "react";
import { useChatPort } from "@/infrastructure/providers/app-service-provider";

export type ChatViewModelState = {
  isConnected: boolean;
  isSending: boolean;
  error: string | null;
};

export type ChatViewModelActions = {
  sendMessage(waId: string, text: string): Promise<void>;
  sendTyping(waId: string, typing: boolean): Promise<boolean>;
};

export type ChatViewModel = ChatViewModelState & ChatViewModelActions;

/**
 * Hook that provides the chat view model.
 * Encapsulates all chat logic behind a clean interface.
 */
export function useChatViewModel(): ChatViewModel {
  const chatPort = useChatPort();

  // Actions
  const sendMessage = useCallback(
    (waId: string, text: string): Promise<void> =>
      chatPort.sendMessage(waId, text),
    [chatPort]
  );

  const sendTyping = useCallback(
    (waId: string, typing: boolean): Promise<boolean> =>
      chatPort.sendTyping(waId, typing),
    [chatPort]
  );

  // Return stable interface
  return useMemo(
    () => ({
      isConnected: true, // Can be enhanced with real connection state from adapter
      isSending: false, // Can be tracked with useState if needed
      error: null, // Can be tracked with useState if needed
      sendMessage,
      sendTyping,
    }),
    [sendMessage, sendTyping]
  );
}
