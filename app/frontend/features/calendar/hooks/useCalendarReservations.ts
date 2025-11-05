"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Reservation } from "@/entities/event";
import { callPythonBackend } from "@/shared/libs/backend";
import {
  CACHE_GC_TIME_MS,
  DEFAULT_DAYS_BACK,
  DEFAULT_DAYS_FORWARD,
} from "../lib/constants";

type CalendarReservationsResponse = {
  success: boolean;
  data: Record<string, Reservation[]>;
};

/**
 * General-purpose hook for fetching reservations within a date range.
 * This is useful for components that need reservations but don't need period-based caching.
 *
 * @param fromDate - Start date (YYYY-MM-DD). If not provided, defaults to 30 days ago.
 * @param toDate - End date (YYYY-MM-DD). If not provided, defaults to 90 days from now.
 * @param includeCancelled - Whether to include cancelled reservations
 */
export function useReservationsForDateRange(
  fromDate?: string,
  toDate?: string,
  includeCancelled = false
) {
  // Default to last 30 days + next 90 days if not specified
  const today = new Date();
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(today.getDate() - DEFAULT_DAYS_BACK);
  const defaultToDate = new Date(today);
  defaultToDate.setDate(today.getDate() + DEFAULT_DAYS_FORWARD);

  const defaultFromDateStr = defaultFromDate.toISOString().split("T")[0] ?? "";
  const defaultToDateStr = defaultToDate.toISOString().split("T")[0] ?? "";
  const from: string = fromDate ?? defaultFromDateStr;
  const to: string = toDate ?? defaultToDateStr;

  return useQuery({
    queryKey: ["reservations-date-range", from, to, includeCancelled],
    queryFn: async (): Promise<Record<string, Reservation[]>> => {
      const params = new URLSearchParams();
      params.set("from_date", from);
      params.set("to_date", to);
      params.set("future", "false"); // Include past reservations within range
      params.set("include_cancelled", String(includeCancelled));

      const response = await callPythonBackend<CalendarReservationsResponse>(
        `/reservations?${params.toString()}`
      );

      if (!(response.success && response.data)) {
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
 * Options for fetching reservations for a specific date range.
 */
export type UseCalendarReservationsForPeriodOptions = {
  periodKey: string;
  fromDate: string;
  toDate: string;
  freeRoam: boolean;
  enabled?: boolean;
};

/**
 * Hook for fetching reservations for a specific date range.
 * Uses TanStack Query for caching and state management.
 *
 * @param options - Configuration options for the query
 */
export function useCalendarReservationsForPeriod(
  options: UseCalendarReservationsForPeriodOptions
) {
  const { periodKey, fromDate, toDate, freeRoam, enabled = true } = options;
  const queryClient = useQueryClient();

  // Check if we have cached data for this period
  const cachedData = queryClient.getQueryData<Record<string, Reservation[]>>([
    "calendar-reservations",
    periodKey,
    freeRoam,
  ]);

  return useQuery({
    queryKey: ["calendar-reservations", periodKey, freeRoam],
    queryFn: async (): Promise<Record<string, Reservation[]>> => {
      const params = new URLSearchParams();

      // When freeRoam is false, only fetch future reservations
      // When freeRoam is true, fetch all (past and future) by explicitly setting future=false
      // This ensures past reservations are included when navigating to past periods
      if (freeRoam) {
        params.set("future", "false");
      } else {
        params.set("future", "true");
      }

      params.set("from_date", fromDate);
      params.set("to_date", toDate);
      params.set("include_cancelled", String(freeRoam));

      const qs = params.toString();
      const response = await callPythonBackend<CalendarReservationsResponse>(
        `/reservations?${qs}`
      );

      if (!(response.success && response.data)) {
        return {};
      }

      return response.data;
    },
    ...(cachedData ? { placeholderData: cachedData } : {}), // Use cached data immediately if available
    staleTime: Number.POSITIVE_INFINITY, // Never consider data stale - only WebSocket invalidates cache
    gcTime: CACHE_GC_TIME_MS, // Keep in cache for 10 minutes after last use (cleanup for old periods)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on mount - use cached data (WebSocket handles real-time updates)
    retry: 1,
    enabled: Boolean(enabled && periodKey && fromDate && toDate), // Only fetch if enabled and all params are provided
  });
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useCalendarReservationsForPeriod instead
 */
export function useCalendarReservations(options?: {
  future?: boolean;
  includeCancelled?: boolean;
  fromDate?: string;
  toDate?: string;
}) {
  // Default to future=true if not specified (only future reservations)
  const future = options?.future !== undefined ? options.future : true;

  return useQuery({
    queryKey: [
      "calendar-reservations",
      "legacy",
      future,
      options?.includeCancelled,
      options?.fromDate,
      options?.toDate,
    ],
    queryFn: async (): Promise<Record<string, Reservation[]>> => {
      const params = new URLSearchParams();
      params.set("future", String(future));
      if (options?.includeCancelled !== undefined) {
        params.set("include_cancelled", String(options.includeCancelled));
      }
      if (options?.fromDate) {
        params.set("from_date", options.fromDate);
      }
      if (options?.toDate) {
        params.set("to_date", options.toDate);
      }

      const qs = params.toString();
      const response = await callPythonBackend<CalendarReservationsResponse>(
        `/reservations${qs ? `?${qs}` : ""}`
      );

      if (!(response.success && response.data)) {
        return {};
      }

      return response.data;
    },
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });
}
