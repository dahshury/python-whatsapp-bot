import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export async function prefetchConversationList(
	client: QueryClient,
	options?: {
		waId?: string;
		fromDate?: string;
		toDate?: string;
		recent?: string;
	}
): Promise<void> {
	await client.prefetchQuery({
		queryKey: queryKeys.conversations.list(options),
		queryFn: ({ signal }) =>
			import("@shared/libs/api").then((m) =>
				m.fetchConversations(options, signal)
			),
	});
}

export async function prefetchCustomer(
	client: QueryClient,
	waId: string
): Promise<void> {
	await client.prefetchQuery({
		queryKey: queryKeys.customers.detail(waId),
		queryFn: ({ signal }) =>
			import("@shared/libs/api").then((m) => m.fetchCustomer(waId, signal)),
	});
}

export async function prefetchReservations(
	client: QueryClient,
	options?: {
		future?: boolean;
		includeCancelled?: boolean;
		fromDate?: string;
		toDate?: string;
	}
): Promise<void> {
	await client.prefetchQuery({
		queryKey: queryKeys.reservations.list(options),
		queryFn: ({ signal }) =>
			import("@shared/libs/api").then((m) =>
				m.fetchReservations(options, signal)
			),
	});
}

export function invalidateGlobalData(client: QueryClient): void {
	try {
		client.invalidateQueries({ queryKey: queryKeys.conversations.all });
		client.invalidateQueries({ queryKey: queryKeys.reservations.all });
		client.invalidateQueries({ queryKey: queryKeys.vacations.all });
	} catch {
		// Best-effort invalidation; ignore errors
	}
}
