import { QueryClient } from "@tanstack/react-query";

// Cache time constants (in milliseconds)
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const STALE_TIME_MINUTES = 1;
const STALE_TIME_MS = STALE_TIME_MINUTES * MS_PER_MINUTE;
const GC_TIME_MINUTES = 5;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MINUTES * MS_PER_MINUTE,
      refetchOnWindowFocus: true,
    },
  },
});
