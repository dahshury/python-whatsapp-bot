import type { QueryClient } from "@tanstack/react-query";

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
// Aggressive caching: calendar ranges should persist until explicit invalidation
const DEFAULT_STALE_TIME_MINUTES = 30; // 30 minutes before considering stale
const DEFAULT_GC_TIME_MINUTES = 60; // 1 hour before garbage collection
const DEFAULT_STALE_TIME_MS =
	DEFAULT_STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DEFAULT_GC_TIME_MS =
	DEFAULT_GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export function applyQueryDefaults(client: QueryClient): void {
	// Global sensible defaults applied once
	client.setDefaultOptions({
		queries: {
			staleTime: DEFAULT_STALE_TIME_MS,
			gcTime: DEFAULT_GC_TIME_MS,
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			retry: 1,
		},
	});

	// Per-key tweaks
	try {
		const DOUBLE = 2;
		const TRIPLE = 3;
		// Range queries: very long cache, only invalidate on WebSocket updates
		client.setQueryDefaults(["range"], {
			staleTime: DEFAULT_STALE_TIME_MS * TRIPLE, // 90 minutes
			gcTime: DEFAULT_GC_TIME_MS * DOUBLE, // 2 hours
		});
		// Conversations default: inherit global aggressive cache
		client.setQueryDefaults(["conversations"], {
			staleTime: DEFAULT_STALE_TIME_MS,
			gcTime: DEFAULT_GC_TIME_MS,
		});
		// Reservations default: inherit global aggressive cache
		client.setQueryDefaults(["reservations"], {
			staleTime: DEFAULT_STALE_TIME_MS,
			gcTime: DEFAULT_GC_TIME_MS,
		});
		// Customers: longer cache as it changes less frequently
		client.setQueryDefaults(["customers"], {
			staleTime: DEFAULT_STALE_TIME_MS * DOUBLE,
			gcTime: DEFAULT_GC_TIME_MS * DOUBLE,
		});
		// Vacations: long stale + gc
		client.setQueryDefaults(["vacations"], {
			staleTime: DEFAULT_STALE_TIME_MS * DOUBLE,
			gcTime: DEFAULT_GC_TIME_MS * DOUBLE,
		});
	} catch {
		// no-op if unavailable during SSR bootstrap
	}
}
