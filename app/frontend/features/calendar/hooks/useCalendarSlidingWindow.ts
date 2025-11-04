/**
 * Sliding Window Prefetch Hook
 *
 * Manages prefetching calendar data for a sliding window of periods
 * around the current view. Automatically invalidates old cache entries
 * when navigating to maintain a fixed window size.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { ViewType } from './useCalendarDateRange'
import {
	getNewestPeriod,
	getOldestPeriod,
	getPeriodDateRange,
	getPeriodKey,
	getPrefetchPeriods,
	parsePeriodKey,
} from './useCalendarDateRange'

type UseCalendarSlidingWindowOptions = {
	viewType: ViewType
	currentDate: Date
	freeRoam: boolean
	excludeConversations?: boolean
	windowSize?: number // Number of periods to prefetch on each side (default: 5)
}

/**
 * Hook for managing sliding window prefetch of calendar data
 */
export function useCalendarSlidingWindow(
	options: UseCalendarSlidingWindowOptions
) {
	const {
		viewType,
		currentDate,
		freeRoam,
		excludeConversations = false,
		windowSize = 5,
	} = options

	const queryClient = useQueryClient()
	const currentPeriodRef = useRef<string>('')
	const previousViewTypeRef = useRef<ViewType | null>(null)
	const cachedPeriodsRef = useRef<Set<string>>(new Set())

	// Get current period key
	const currentPeriodKey = getPeriodKey(viewType, currentDate)
	// Pass freeRoam to getPrefetchPeriods to skip past periods when freeRoam is false
	const prefetchPeriods = getPrefetchPeriods(
		viewType,
		currentDate,
		windowSize,
		freeRoam
	)

	// Track cached periods and handle cache eviction
	useEffect(() => {
		const currentPeriod = getPeriodKey(viewType, currentDate)
		const previousPeriod = currentPeriodRef.current
		const previousViewType = previousViewTypeRef.current

		// If view type changed, invalidate ALL cached queries (date ranges change drastically)
		if (previousViewType && previousViewType !== viewType) {
			// Clear all cached periods when view changes
			cachedPeriodsRef.current.clear()
			// Invalidate all calendar queries (date ranges change drastically)
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey
					return (
						key[0] === 'calendar-reservations' ||
						key[0] === 'calendar-conversation-events'
					)
				},
			})
			// Update view type tracking
			previousViewTypeRef.current = viewType
		} else if (!previousViewType) {
			// Initialize view type tracking
			previousViewTypeRef.current = viewType
		}

		// If period changed, update cache tracking
		if (currentPeriod !== currentPeriodRef.current) {
			currentPeriodRef.current = currentPeriod

			// Detect navigation direction by parsing period keys (only if view type didn't change)
			let wasGoingForward = false
			let wasGoingBackward = false

			if (previousPeriod && currentPeriod && previousViewType === viewType) {
				// Parse period keys to determine chronological order
				const prevDate = parsePeriodKey(previousPeriod)
				const currDate = parsePeriodKey(currentPeriod)

				if (prevDate && currDate) {
					wasGoingForward = currDate > prevDate
					wasGoingBackward = currDate < prevDate
				}
			}

			// Update cached periods set
			for (const period of prefetchPeriods) {
				cachedPeriodsRef.current.add(period)
			}

			// Evict cached periods when cache exceeds limit
			const maxCacheSize = windowSize * 2 + 1 + 2 // current + 5 forward + 5 backward + buffer
			if (cachedPeriodsRef.current.size > maxCacheSize) {
				const allCachedPeriods = Array.from(cachedPeriodsRef.current)

				// When going forward, invalidate oldest periods
				// When going backward, invalidate newest periods
				if (wasGoingForward) {
					const oldest = getOldestPeriod(allCachedPeriods)
					if (oldest && oldest !== currentPeriod) {
						cachedPeriodsRef.current.delete(oldest)
						// Invalidate queries for the oldest period (must match query key format)
						queryClient.invalidateQueries({
							queryKey: ['calendar-reservations', oldest, freeRoam],
						})
						queryClient.invalidateQueries({
							queryKey: ['calendar-conversation-events', oldest, freeRoam],
						})
					}
				} else if (wasGoingBackward) {
					const newest = getNewestPeriod(allCachedPeriods)
					if (newest && newest !== currentPeriod) {
						cachedPeriodsRef.current.delete(newest)
						// Invalidate queries for the newest period (must match query key format)
						queryClient.invalidateQueries({
							queryKey: ['calendar-reservations', newest, freeRoam],
						})
						queryClient.invalidateQueries({
							queryKey: ['calendar-conversation-events', newest, freeRoam],
						})
					}
				} else {
					// Fallback: invalidate oldest if we can't determine direction
					const oldest = getOldestPeriod(allCachedPeriods)
					if (oldest && oldest !== currentPeriod) {
						cachedPeriodsRef.current.delete(oldest)
						queryClient.invalidateQueries({
							queryKey: ['calendar-reservations', oldest, freeRoam],
						})
						queryClient.invalidateQueries({
							queryKey: ['calendar-conversation-events', oldest, freeRoam],
						})
					}
				}
			}
		}
	}, [
		viewType,
		currentDate,
		prefetchPeriods,
		windowSize,
		queryClient,
		freeRoam,
	])

	// Prefetch all periods in the window asynchronously
	// This runs in a separate effect to ensure prefetching happens immediately
	useEffect(() => {
		// Prefetch all periods in parallel (fire and forget)
		const prefetchPromises: Promise<unknown>[] = []

		for (const periodKey of prefetchPeriods) {
			const { start, end } = getPeriodDateRange(viewType, periodKey)
			const fromDate = start.toISOString().split('T')[0] || ''
			const toDate = end.toISOString().split('T')[0] || ''

			// Skip if dates are invalid
			if (fromDate === '' || toDate === '') {
				// eslint-disable-next-line no-continue
				continue
			}

			// Prefetch reservations (only if not already cached)
			const reservationsKey = ['calendar-reservations', periodKey, freeRoam]
			const reservationsCache = queryClient.getQueryData(reservationsKey)
			if (!reservationsCache) {
				prefetchPromises.push(
					queryClient
						.prefetchQuery({
							queryKey: reservationsKey,
							queryFn: async () => {
								const params = new URLSearchParams()

								// When freeRoam is false, only fetch future reservations
								// When freeRoam is true, fetch all (past and future) by explicitly setting future=false
								// This ensures past reservations are included when prefetching past periods
								if (freeRoam) {
									params.set('future', 'false')
								} else {
									params.set('future', 'true')
								}

								params.set('from_date', fromDate)
								params.set('to_date', toDate)
								params.set('include_cancelled', String(freeRoam))

								const { callPythonBackend } = await import(
									'@shared/libs/backend'
								)
								const response = await callPythonBackend<{
									success: boolean
									data: Record<string, unknown[]>
								}>(`/reservations?${params.toString()}`)

								return response.success && response.data ? response.data : {}
							},
							staleTime: Number.POSITIVE_INFINITY, // Never consider data stale - only WebSocket invalidates cache
						})
						.then(() => undefined as void)
				)
			}

			// Prefetch conversation events if not excluded (only if not already cached)
			if (!excludeConversations) {
				const conversationsKey = [
					'calendar-conversation-events',
					periodKey,
					freeRoam,
				]
				const conversationsCache = queryClient.getQueryData(conversationsKey)
				if (!conversationsCache) {
					prefetchPromises.push(
						queryClient
							.prefetchQuery({
								queryKey: conversationsKey,
								queryFn: async () => {
									const { callPythonBackend } = await import(
										'@shared/libs/backend'
									)

									// Backend now supports date filtering - pass date range parameters
									const params = new URLSearchParams()
									params.set('from_date', fromDate)
									params.set('to_date', toDate)

									const response = await callPythonBackend<{
										success: boolean
										data: Record<string, unknown[]>
									}>(`/conversations/calendar/events?${params.toString()}`)

									if (!(response.success && response.data)) {
										return {}
									}

									// Backend now filters by date range, so return data directly
									return response.data
								},
								staleTime: Number.POSITIVE_INFINITY, // Never consider data stale - only WebSocket invalidates cache
							})
							.then(() => undefined as void)
					)
				}
			}
		}

		// Execute all prefetch queries in parallel (fire and forget)
		// Don't await - let them run asynchronously
		if (prefetchPromises.length > 0) {
			Promise.all(prefetchPromises).catch(() => {
				// Silently handle errors - prefetch failures shouldn't block navigation
				// Errors are logged by TanStack Query internally
			})
		}
	}, [prefetchPeriods, viewType, freeRoam, excludeConversations, queryClient])

	return {
		currentPeriodKey,
		prefetchPeriods,
	}
}

/**
 * Hook to invalidate all cached calendar data for a specific view type
 */
export function useCalendarCacheInvalidation() {
	const queryClient = useQueryClient()

	const invalidateView = (_viewType: ViewType) => {
		// Invalidate all queries for reservations and conversations for this view type
		// View type parameter is kept for API consistency but not used in predicate
		queryClient.invalidateQueries({
			predicate: (query) => {
				const key = query.queryKey
				return (
					(key[0] === 'calendar-reservations' ||
						key[0] === 'calendar-conversation-events') &&
					key.length > 1
				)
			},
		})
	}

	return { invalidateView }
}
