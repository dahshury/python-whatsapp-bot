'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Reservation } from '@/entities/event'
import { calendarKeys } from '@/shared/api/query-keys'
import { useBackendReconnectRefetch } from '@/shared/libs/hooks/useBackendReconnectRefetch'
import {
	CACHE_GC_TIME_MS,
	DEFAULT_DAYS_BACK,
	DEFAULT_DAYS_FORWARD,
} from '../lib/constants'
import {
	fetchCalendarReservations,
	fetchReservationsForDateRange,
} from '../lib/query-functions'

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
	const today = new Date()
	const defaultFromDate = new Date(today)
	defaultFromDate.setDate(today.getDate() - DEFAULT_DAYS_BACK)
	const defaultToDate = new Date(today)
	defaultToDate.setDate(today.getDate() + DEFAULT_DAYS_FORWARD)

	const defaultFromDateStr = defaultFromDate.toISOString().split('T')[0] ?? ''
	const defaultToDateStr = defaultToDate.toISOString().split('T')[0] ?? ''
	const from: string = fromDate ?? defaultFromDateStr
	const to: string = toDate ?? defaultToDateStr

	const query = useQuery({
		queryKey: calendarKeys.reservationsByDateRange(from, to, includeCancelled),
		queryFn: () =>
			fetchReservationsForDateRange({
				fromDate: from,
				toDate: to,
				includeCancelled,
			}),
		staleTime: 60_000, // Cache for 1 minute
		gcTime: 300_000, // Keep in cache for 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		retry: 1,
	})
	useBackendReconnectRefetch(query.refetch, {
		enabled: !query.isFetching,
	})
	return query
}

/**
 * Options for fetching reservations for a specific date range.
 */
export type UseCalendarReservationsForPeriodOptions = {
	periodKey: string
	fromDate: string
	toDate: string
	freeRoam: boolean
	enabled?: boolean
}

/**
 * Hook for fetching reservations for a specific date range.
 * Uses TanStack Query for caching and state management.
 *
 * @param options - Configuration options for the query
 */
export function useCalendarReservationsForPeriod(
	options: UseCalendarReservationsForPeriodOptions
) {
	const { periodKey, fromDate, toDate, freeRoam, enabled = true } = options
	const queryClient = useQueryClient()

	// Check if we have cached data for this period
	const cachedData = queryClient.getQueryData<Record<string, Reservation[]>>(
		calendarKeys.reservationsByPeriod(periodKey, freeRoam)
	)

	const query = useQuery({
		queryKey: calendarKeys.reservationsByPeriod(periodKey, freeRoam),
		queryFn: () => fetchCalendarReservations({ fromDate, toDate, freeRoam }),
		// ✅ BEST PRACTICE: placeholderData provides instant UI while refetching
		// Shows cached data immediately, then updates with fresh data when available
		...(cachedData ? { placeholderData: cachedData } : {}),
		staleTime: Number.POSITIVE_INFINITY, // Never consider data stale - only WebSocket invalidates cache
		gcTime: CACHE_GC_TIME_MS, // Keep in cache for 10 minutes after last use (cleanup for old periods)
		refetchOnWindowFocus: false, // Don't refetch when window regains focus
		refetchOnMount: false, // Don't refetch on mount - use cached data (WebSocket handles real-time updates)
		retry: 1,
		enabled: Boolean(enabled && periodKey && fromDate && toDate), // Only fetch if enabled and all params are provided
	})
	useBackendReconnectRefetch(query.refetch, {
		enabled: Boolean(
			!query.isFetching && enabled && periodKey && fromDate && toDate
		),
	})
	return query
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useCalendarReservationsForPeriod instead
 */
export function useCalendarReservations(options?: {
	future?: boolean
	includeCancelled?: boolean
	fromDate?: string
	toDate?: string
}) {
	// Default to future=true if not specified (only future reservations)
	const future = options?.future !== undefined ? options.future : true

	const query = useQuery({
		queryKey: calendarKeys.reservationsLegacy(
			future,
			options?.includeCancelled,
			options?.fromDate,
			options?.toDate
		),
		queryFn: () =>
			fetchReservationsForDateRange({
				fromDate: options?.fromDate || '',
				toDate: options?.toDate || '',
				includeCancelled: options?.includeCancelled ?? false,
			}),
		staleTime: 60_000,
		gcTime: 300_000,
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		retry: 1,
	})
	useBackendReconnectRefetch(query.refetch, {
		enabled: !query.isFetching,
	})
	return query
}
