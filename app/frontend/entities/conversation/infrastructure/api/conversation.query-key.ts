export const CONVERSATION_QUERY_KEY = {
	root: ['conversation'] as const,
	byWaId: (waId: string) => ['conversation', 'byWaId', waId] as const,
}
