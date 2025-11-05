import { createChatService } from "../services/chat.service.factory";
import { createChatHooks } from "./chat.hooks.factory";

const chatUseCase = createChatService();
export const { useChatMessages, useSendMessage } = createChatHooks(chatUseCase);

// Export additional hooks
export { useChatScroll } from "./use-chat-scroll";
export { useConversationActivity } from "./use-conversation-activity";
export { useConversationMessagesQuery } from "./useConversationMessages";
export { useCustomerNames } from "./useCustomerNames";
export { useTypingIndicator } from "./useTypingIndicator";
