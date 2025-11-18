export const RSVP_QUERY_KEY = {
	root: ['rsvp'] as const,
	byId: (id: string | number) =>
		[...RSVP_QUERY_KEY.root, 'byId', String(id)] as const,
}
