/**
 * Chat Port (Domain-specific)
 * Defines the contract for chat operations independent of transport.
 */

export type ChatPort = {
  sendMessage(waId: string, text: string): Promise<void>;
  sendTyping(waId: string, typing: boolean): Promise<boolean>;
  subscribe(callback: (update: ChatUpdate) => void): () => void;
};

export type ChatUpdate = {
  type: "message_sent" | "typing_indicator" | "connection_change";
  data: unknown;
};
