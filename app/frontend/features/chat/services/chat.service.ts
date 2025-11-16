import { ApiClient } from "@/shared/api";
import type { ChatMessageDto, ChatUseCase } from "../usecase/chat.usecase";

type WhatsAppMessageResponse = {
  status?: string;
  message?: string;
};

export const ChatService = (): ChatUseCase => ({
  listMessages: async (conversationId: string): Promise<ChatMessageDto[]> => {
    const api = new ApiClient();
    const data = await api.get<ChatMessageDto[]>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`
    );
    return data?.data || [];
  },

  sendMessage: async (
    conversationId: string,
    content: string
  ): Promise<ChatMessageDto> => {
    const api = new ApiClient();
    // Use the existing /whatsapp/message endpoint with wa_id and text
    const response = await api.post<WhatsAppMessageResponse>(
      "/whatsapp/message",
      { wa_id: conversationId, text: content, _call_source: "frontend" }
    );

    // Check if request was successful
    // The existing endpoint returns {status: "error", message: "..."} on error
    const responseData = (response?.data ||
      response) as WhatsAppMessageResponse;
    if (responseData?.status === "error") {
      const errorMessage = responseData?.message || "Failed to send message";
      throw new Error(errorMessage);
    }

    // On success, the backend returns the WhatsApp API response
    // Create a ChatMessageDto to return
    const timestamp = Date.now();
    return {
      id: `${conversationId}_${timestamp}`,
      conversationId,
      sender: "assistant",
      content,
      createdAt: timestamp,
    };
  },
});
