import { tryParseJson } from "@shared/validation/json";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { DehydratedState, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

export function enableQueryPersistence(client: QueryClient): void {
	if (typeof window === "undefined") {
		return;
	}
	const MILLISECONDS_PER_SECOND = 1000;
	const SECONDS_PER_MINUTE = 60;
	const MINUTES_PER_HOUR = 60;
	const ONE_HOUR_MS =
		MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

	type PersistedClientShape = {
		timestamp: number;
		buster: string;
		clientState: DehydratedState;
	};

	const persister = createSyncStoragePersister({
		storage: window.localStorage,
		throttleTime: 1000,
		serialize: (data) => JSON.stringify(data),
		deserialize: (cached: string): PersistedClientShape => {
			try {
				const parsed = tryParseJson(cached);
				if (parsed && typeof parsed === "object") {
					const typed = parsed as PersistedClientShape;
					if (
						typeof typed.timestamp === "number" &&
						typeof typed.buster === "string" &&
						typed.clientState !== undefined
					) {
						return typed;
					}
				}
			} catch {
				// Parse failed; will return default below
			}
			// Return default PersistedClient structure
			return {
				timestamp: Date.now(),
				buster: "",
				clientState: { mutations: [], queries: [] },
			};
		},
	});
	persistQueryClient({
		queryClient: client,
		persister,
		dehydrateOptions: {
			// Persist only successful queries to avoid restoring pending ones that may reject later
			shouldDehydrateQuery: (q) => q.state.status === "success",
			shouldDehydrateMutation: () => false,
		},
		maxAge: ONE_HOUR_MS, // 1 hour
	});
}
