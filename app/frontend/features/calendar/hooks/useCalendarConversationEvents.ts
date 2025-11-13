"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarKeys } from "@/shared/api/query-keys";
import { useBackendReconnectRefetch } from "@/shared/libs/hooks/useBackendReconnectRefetch";
import { CACHE_GC_TIME_MS } from "../lib/constants";
import {
  fetchAllConversationEvents,
  fetchCalendarConversationEvents,
} from "../lib/query-functions";

export type CalendarConversationEvent = {
  role: string;
  message: string;
  date: string;
  time: string;
  customer_name: string | null;
};

/**
 * Hook for fetching lightweight conversation events for calendar.
 * Returns only the last message per customer and customer names.
 * Uses TanStack Query for caching and state management.
 */
export function useCalendarConversationEvents() {
  const query = useQuery({
    queryKey: calendarKeys.conversationsAll(),
    queryFn: fetchAllConversationEvents,
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });
  useBackendReconnectRefetch(query.refetch, {
    enabled: !query.isFetching,
  });
  return query;
}

/**
 * Hook for fetching conversation events for a specific date range.
 * Uses TanStack Query for caching and state management.
 *
 * @param periodKey - Period identifier (e.g., "2025-11" for month, "2025-W44" for week)
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 * @param options - Options object
 * @param options.freeRoam - Whether free-roam mode is enabled (affects caching, not filtering)
 * @param options.enabled - Whether the query should be enabled (default: true)
 */
export function useCalendarConversationEventsForPeriod(
  periodKey: string,
  fromDate: string,
  toDate: string,
  options?: { freeRoam?: boolean; enabled?: boolean }
) {
  const { freeRoam = false, enabled = true } = options || {};
  const queryClient = useQueryClient();

  // Check if we have cached data for this period
  const cachedData = queryClient.getQueryData<
    Record<string, CalendarConversationEvent[]>
  >(calendarKeys.conversationsByPeriod(periodKey, freeRoam));

  const query = useQuery({
    queryKey: calendarKeys.conversationsByPeriod(periodKey, freeRoam),
    queryFn: () => fetchCalendarConversationEvents({ fromDate, toDate }),
    // ✅ BEST PRACTICE: placeholderData provides instant UI while refetching
    // Shows cached data immediately, then updates with fresh data when available
    ...(cachedData ? { placeholderData: cachedData } : {}),
    staleTime: Number.POSITIVE_INFINITY, // Never consider data stale - only WebSocket invalidates cache
    gcTime: CACHE_GC_TIME_MS, // Keep in cache for 10 minutes after last use (cleanup for old periods)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on mount - use cached data (WebSocket handles real-time updates)
    retry: 1,
    enabled: Boolean(enabled && periodKey && fromDate && toDate),
  });
  useBackendReconnectRefetch(query.refetch, {
    enabled:
      Boolean(enabled && periodKey && fromDate && toDate) && !query.isFetching,
  });
  return query;
}
