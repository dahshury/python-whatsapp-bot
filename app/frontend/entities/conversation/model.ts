export interface ConversationMessage {
	role: string; // Role of the sender (user, assistant, etc.)
	message: string; // The message content
	time: string; // Time in HH:MM:SS format
	date: string; // Date in YYYY-MM-DD format
	// Optional fields for tool calls
	tool_name?: string;
	tool_args?: Record<string, unknown> | string;
}

export interface Conversations {
	[wa_id: string]: ConversationMessage[];
}
