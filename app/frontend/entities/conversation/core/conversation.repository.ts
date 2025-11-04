import type { ConversationDomain } from './conversation.domain'

export type ConversationRepository = {
	getByWaId(waId: string): Promise<ConversationDomain | null>
	save(waId: string, conversation: ConversationDomain): Promise<void>
}
