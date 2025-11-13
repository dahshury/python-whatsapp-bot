"use client";

import { useQuery } from "@tanstack/react-query";
import { calendarKeys } from "@/shared/api/query-keys";
import { useBackendReconnectRefetch } from "@/shared/libs/hooks/useBackendReconnectRefetch";
import { fetchCalendarVacations } from "../lib/query-functions";

/**
 * Hook for fetching vacations for calendar.
 * Uses TanStack Query for caching and state management.
 *
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useCalendarVacations(enabled = true) {
  const query = useQuery({
    queryKey: calendarKeys.vacations(),
    queryFn: fetchCalendarVacations,
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
    enabled,
  });
  useBackendReconnectRefetch(query.refetch, {
    enabled: Boolean(enabled && !query.isFetching),
  });
  return query;
}
