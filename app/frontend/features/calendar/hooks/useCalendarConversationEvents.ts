"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callPythonBackend } from "@/shared/libs/backend";
import { CACHE_GC_TIME_MS } from "../lib/constants";

export type CalendarConversationEvent = {
  role: string;
  message: string;
  date: string;
  time: string;
  customer_name: string | null;
};

type CalendarConversationEventsResponse = {
  success: boolean;
  data: Record<string, CalendarConversationEvent[]>;
};

/**
 * Hook for fetching lightweight conversation events for calendar.
 * Returns only the last message per customer and customer names.
 * Uses TanStack Query for caching and state management.
 */
export function useCalendarConversationEvents() {
  return useQuery({
    queryKey: ["calendar-conversation-events"],
    queryFn: async (): Promise<Record<string, CalendarConversationEvent[]>> => {
      const response =
        await callPythonBackend<CalendarConversationEventsResponse>(
          "/conversations/calendar/events"
        );

      if (!response.success) {
        return {};
      }

      if (!response.data) {
        return {};
      }

      return response.data;
    },
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });
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
  const { freeRoam, enabled = true } = options || {};
  const queryClient = useQueryClient();

  // Check if we have cached data for this period
  const cachedData = queryClient.getQueryData<
    Record<string, CalendarConversationEvent[]>
  >(["calendar-conversation-events", periodKey, freeRoam]);

  return useQuery({
    queryKey: ["calendar-conversation-events", periodKey, freeRoam],
    queryFn: async (): Promise<Record<string, CalendarConversationEvent[]>> => {
      // Backend now supports date filtering - pass date range parameters
      const params = new URLSearchParams();
      params.set("from_date", fromDate);
      params.set("to_date", toDate);

      const response =
        await callPythonBackend<CalendarConversationEventsResponse>(
          `/conversations/calendar/events?${params.toString()}`
        );

      if (!(response.success && response.data)) {
        return {};
      }

      // Backend now filters by date range, so return data directly
      return response.data;
    },
    ...(cachedData ? { placeholderData: cachedData } : {}), // Use cached data immediately if available
    staleTime: Number.POSITIVE_INFINITY, // Never consider data stale - only WebSocket invalidates cache
    gcTime: CACHE_GC_TIME_MS, // Keep in cache for 10 minutes after last use (cleanup for old periods)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on mount - use cached data (WebSocket handles real-time updates)
    retry: 1,
    enabled: Boolean(enabled && periodKey && fromDate && toDate),
  });
}
