export type ChatMessageDto = {
  id: string;
  conversationId: string;
  sender: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type ChatUseCase = {
  listMessages: (conversationId: string) => Promise<ChatMessageDto[]>;
  sendMessage: (
    conversationId: string,
    content: string
  ) => Promise<ChatMessageDto>;
};
