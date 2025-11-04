import type { ChatUseCase } from '../usecase/chat.usecase'
import { createUseChatMessages } from './useChatMessages'
import { createUseSendMessage } from './useSendMessage'

export const createChatHooks = (chatUseCase: ChatUseCase) => ({
	useChatMessages: createUseChatMessages(chatUseCase),
	useSendMessage: createUseSendMessage(chatUseCase),
})
