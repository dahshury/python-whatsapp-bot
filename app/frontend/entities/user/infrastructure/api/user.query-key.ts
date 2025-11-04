export const USER_QUERY_KEY = {
	byId: (id: string) => ['user', id] as const,
	byWaId: (waId: string) => ['user', 'waId', waId] as const,
}
