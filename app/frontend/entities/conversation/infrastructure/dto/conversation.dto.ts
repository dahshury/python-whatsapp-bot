export type ConversationMessageDto = {
	role: string
	message: string
	time: string
	date: string
	tool_name?: string
	tool_args?: Record<string, unknown> | string
}

export type ConversationsDto = Record<string, ConversationMessageDto[]>
