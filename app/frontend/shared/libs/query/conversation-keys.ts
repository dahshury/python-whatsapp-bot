// Query key builder for conversation message lists
export const conversationQueryKey = (
	waId: string,
	range?: { fromDate?: string; toDate?: string; limit?: number }
) =>
	[
		"conversation",
		waId,
		range?.fromDate ?? "",
		range?.toDate ?? "",
		typeof range?.limit === "number" ? range?.limit : "",
	] as const;
