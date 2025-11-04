/**
 * useCalendarEvents Hook
 *
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Uses period-based queries with
 * sliding window prefetch for optimal performance.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, Reservation } from '@/entities/event'
import { useCustomerNames } from '@/features/chat/hooks/useCustomerNames'
import {
	getReservationEventProcessor,
	type ReservationProcessingOptions,
} from '@/features/reservations'
import { SLOT_PREFIX_LEN } from '../lib/constants'
import {
	type CalendarConversationEvent,
	useCalendarConversationEventsForPeriod,
} from './useCalendarConversationEvents'
import {
	getPeriodDateRange,
	getPeriodKey,
	getPrefetchPeriods,
	type ViewType,
} from './useCalendarDateRange'
import { useCalendarReservationsForPeriod } from './useCalendarReservations'
import { useCalendarSlidingWindow } from './useCalendarSlidingWindow'
import { useCalendarVacations } from './useCalendarVacations'
import { useCalendarWebSocketInvalidation } from './useCalendarWebSocketInvalidation'

function normalizeReservationSlotTime(value?: string): string {
	if (!value) {
		return ''
	}
	return value.slice(0, SLOT_PREFIX_LEN)
}

function buildReservationKey(
	customerId: string,
	reservation: Reservation
): string {
	if (typeof reservation.id === 'number') {
		return `id:${reservation.id}`
	}
	const date = reservation.date || ''
	const time = normalizeReservationSlotTime(
		(reservation.time_slot as string | undefined) || ''
	)
	return `slot:${customerId}:${date}:${time}`
}

export type UseCalendarEventsOptions = {
	freeRoam: boolean
	isLocalized: boolean
	currentView: ViewType | string
	currentDate: Date
	autoRefresh?: boolean
	refreshInterval?: number
	ageByWaId?: Record<string, number | null>
	/** When true, do not include conversation events in generated calendar events. */
	excludeConversations?: boolean
}

export type CalendarEventsState = {
	events: CalendarEvent[]
	loading: boolean
	error: string | null
	lastUpdated: Date | null
}

export type CalendarEventsActions = {
	refetchEvents: () => Promise<void>
	invalidateCache: () => void
	refreshData: () => Promise<void>
	addEvent: (event: CalendarEvent) => void
	updateEvent: (id: string, updatedEvent: Partial<CalendarEvent>) => void
	removeEvent: (id: string) => void
}

export type UseCalendarEventsReturn = CalendarEventsState &
	CalendarEventsActions

/**
 * Custom hook for managing calendar events with period-based queries
 */
export function useCalendarEvents(
	options: UseCalendarEventsOptions
): UseCalendarEventsReturn {
	const {
		freeRoam,
		isLocalized,
		currentView,
		currentDate,
		excludeConversations = false,
		ageByWaId,
	} = options

	const [state, setState] = useState<CalendarEventsState>({
		events: [],
		loading: true,
		error: null,
		lastUpdated: null,
	})

	// Get current period key and date range
	const currentPeriodKey = getPeriodKey(currentView as ViewType, currentDate)
	const { start, end } = getPeriodDateRange(
		currentView as ViewType,
		currentPeriodKey
	)
	// Ensure we have valid dates (defensive check)
	const getDateString = (date: Date): string => {
		if (!date || Number.isNaN(date.getTime())) {
			return new Date().toISOString().split('T')[0] || ''
		}
		return date.toISOString().split('T')[0] || ''
	}
	const fromDate: string = getDateString(start)
	const toDate: string = getDateString(end)

	// Set up sliding window prefetch
	useCalendarSlidingWindow({
		viewType: currentView as ViewType,
		currentDate,
		freeRoam,
		excludeConversations,
		windowSize: 5,
	})

	// Set up WebSocket cache invalidation
	useCalendarWebSocketInvalidation()

	const queryClient = useQueryClient()

	// Fetch current period data (this subscribes to the query and triggers loading)
	// We need to read the actual data to trigger re-renders when cache updates
	const { isLoading: reservationsLoading, error: reservationsError } =
		useCalendarReservationsForPeriod(
			currentPeriodKey,
			fromDate,
			toDate,
			freeRoam
		)

	const { isLoading: conversationsLoading, error: conversationsError } =
		useCalendarConversationEventsForPeriod(
			currentPeriodKey,
			fromDate,
			toDate,
			freeRoam
		)

	// Track cached periods and their data for incremental updates
	const SLIDING_WINDOW_SIZE = 5
	const cachedPeriodsRef = useRef<Set<string>>(new Set())
	const cachedReservationsByPeriod = useRef<
		Map<string, Record<string, Reservation[]>>
	>(new Map())
	const cachedConversationsByPeriod = useRef<
		Map<string, Record<string, CalendarConversationEvent[]>>
	>(new Map())

	// Get current prefetch periods
	const currentPrefetchPeriods = useMemo(
		() =>
			new Set(
				getPrefetchPeriods(
					currentView as ViewType,
					currentDate,
					SLIDING_WINDOW_SIZE,
					freeRoam
				)
			),
		[currentView, currentDate, freeRoam]
	)

	// Detect added/removed periods and update cache incrementally
	const { allCachedReservations, allCachedConversationEvents } = useMemo(() => {
		const previousPeriods = cachedPeriodsRef.current
		const currentPeriods = currentPrefetchPeriods

		// Detect removed periods (no longer in prefetch window)
		const removedPeriods = Array.from(previousPeriods).filter(
			(p) => !currentPeriods.has(p)
		)

		// Remove evicted periods from cache refs
		for (const periodKey of removedPeriods) {
			cachedReservationsByPeriod.current.delete(periodKey)
			cachedConversationsByPeriod.current.delete(periodKey)
		}

		// Update all periods from cache (not just added ones)
		// This ensures we pick up any updates to existing periods (e.g., WebSocket invalidation)
		for (const periodKey of Array.from(currentPeriods)) {
			const reservations = queryClient.getQueryData<
				Record<string, Reservation[]>
			>(['calendar-reservations', periodKey, freeRoam])
			const conversations = queryClient.getQueryData<
				Record<string, CalendarConversationEvent[]>
			>(['calendar-conversation-events', periodKey, freeRoam])

			if (reservations) {
				cachedReservationsByPeriod.current.set(periodKey, reservations)
			}
			if (conversations) {
				cachedConversationsByPeriod.current.set(periodKey, conversations)
			}
		}

		// Update tracked periods
		cachedPeriodsRef.current = new Set(currentPeriods)

		// Merge all cached periods
		const mergedReservations: Record<string, Reservation[]> = {}
		const mergedConversations: Record<string, CalendarConversationEvent[]> = {}
		const seenReservations = new Map<string, Map<string, number>>()

		for (const [, reservations] of cachedReservationsByPeriod.current) {
			for (const [customerId, reservationList] of Object.entries(
				reservations
			)) {
				if (!mergedReservations[customerId]) {
					mergedReservations[customerId] = []
					seenReservations.set(customerId, new Map())
				}
				const customerSeen = seenReservations.get(customerId) as Map<
					string,
					number
				>
				for (const reservation of reservationList || []) {
					const key = buildReservationKey(customerId, reservation)
					if (customerSeen.has(key)) {
						const index = customerSeen.get(key) as number
						mergedReservations[customerId][index] = {
							...mergedReservations[customerId][index],
							...reservation,
						}
					} else {
						customerSeen.set(key, mergedReservations[customerId].length)
						mergedReservations[customerId].push({ ...reservation })
					}
				}
			}
		}

		for (const [, conversations] of cachedConversationsByPeriod.current) {
			for (const [customerId, eventList] of Object.entries(conversations)) {
				if (!mergedConversations[customerId]) {
					mergedConversations[customerId] = []
				}
				mergedConversations[customerId].push(...eventList)
			}
		}

		return {
			allCachedReservations: mergedReservations,
			allCachedConversationEvents: mergedConversations,
		}
	}, [currentPrefetchPeriods, freeRoam, queryClient])

	// Fetch calendar vacations (not period-based, always fetch all)
	const {
		data: vacationPeriods = [],
		isLoading: vacationsLoading,
		error: vacationsError,
	} = useCalendarVacations()

	// Fetch customer names (single source of truth - no redundancy)
	const { data: customerNamesData } = useCustomerNames()
	const customerNames = useMemo(
		() => customerNamesData || {},
		[customerNamesData]
	)

	// Memoize event processor
	const eventProcessor = useMemo(() => getReservationEventProcessor(), [])

	// Combine loading and error states
	const isDataLoading =
		reservationsLoading || conversationsLoading || vacationsLoading
	const dataError = reservationsError || conversationsError || vacationsError

	// Prepare static processing options
	const processingOptions = useMemo(
		(): Omit<
			ReservationProcessingOptions,
			'vacationPeriods' | 'ageByWaId' | 'conversationsByUser'
		> => ({
			freeRoam,
			isLocalized,
			customerNames, // Single source of truth for names
			excludeConversations,
		}),
		[freeRoam, isLocalized, customerNames, excludeConversations]
	)

	/**
	 * Process calendar events from unified data
	 */
	useEffect(() => {
		try {
			setState((prev) => ({
				...prev,
				loading: isDataLoading,
				error: dataError ? String(dataError) : null,
			}))

			// Only process if loading is complete and no errors
			// Allow processing even with empty data (empty objects/arrays) as long as loading is complete
			if (isDataLoading) {
				// Still loading - don't process yet
				return
			}

			if (dataError) {
				// Has error - set error state
				setState((prev) => ({
					...prev,
					loading: false,
					error: String(dataError),
					lastUpdated: new Date(),
				}))
				return
			}

			// All data has loaded successfully - process events
			// Always process events, but only include conversations if not excluded
			// Process events even if conversation data is empty (might be loading or no conversations)
			const processedEvents = eventProcessor.generateCalendarEvents(
				Object.fromEntries(
					Object.entries(allCachedReservations).map(
						([key, reservationList]) => [
							key,
							reservationList.map((reservation) => {
								const reservationObj = reservation as unknown as Record<
									string,
									unknown
								>
								const {
									date: _date,
									time_slot: _timeSlot,
									customer_name: _customerName,
									...base
								} = reservationObj
								return {
									...base,
									date: (reservation as { date?: string }).date as string,
									time_slot: (reservation as { time_slot?: string })
										.time_slot as string,
									customer_name: (reservation as { customer_name?: string })
										.customer_name,
								}
							}),
						]
					)
				) as Record<
					string,
					Array<{
						date: string
						time_slot: string
						customer_name?: string
						title?: string
						[key: string]: unknown
					}>
				>,
				excludeConversations
					? ({} as Record<
							string,
							Array<{
								id?: string
								text?: string
								ts?: string
								date?: string
								time?: string
								customer_name?: string
							}>
						>)
					: (allCachedConversationEvents as Record<
							string,
							Array<{
								id?: string
								text?: string
								ts?: string
								date?: string
								time?: string
								customer_name?: string
							}>
						>),
				{
					...processingOptions,
					vacationPeriods,
					...(ageByWaId ? { ageByWaId } : {}),
				}
			)

			setState((prev) => ({
				...prev,
				events: processedEvents,
				loading: false,
				error: null,
				lastUpdated: new Date(),
			}))
		} catch (error) {
			setState((prev) => ({
				...prev,
				loading: false,
				error:
					error instanceof Error ? error.message : 'Unknown error occurred',
				lastUpdated: new Date(),
			}))
		}
	}, [
		isDataLoading,
		dataError,
		allCachedReservations,
		allCachedConversationEvents,
		vacationPeriods,
		eventProcessor,
		processingOptions,
		ageByWaId,
		excludeConversations,
	])

	/**
	 * Refresh events by invalidating current period queries
	 */
	const refreshData = useCallback(async (): Promise<void> => {
		try {
			// Invalidate current period queries (must match query key format exactly)
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ['calendar-reservations', currentPeriodKey, freeRoam],
				}),
				queryClient.invalidateQueries({
					queryKey: [
						'calendar-conversation-events',
						currentPeriodKey,
						freeRoam,
					],
				}),
				queryClient.invalidateQueries({
					queryKey: ['calendar-vacations'],
				}),
			])
		} catch (_error) {
			// Error handling is done by individual refresh functions
		}
	}, [queryClient, currentPeriodKey, freeRoam])

	/**
	 * Refetch events (alias for refreshData)
	 */
	const refetchEvents = useCallback(async (): Promise<void> => {
		await refreshData()
	}, [refreshData])

	/**
	 * Invalidate cache without refetching
	 */
	const invalidateCache = useCallback((): void => {
		queryClient.invalidateQueries({
			predicate: (query) => {
				const key = query.queryKey
				return (
					key[0] === 'calendar-reservations' ||
					key[0] === 'calendar-conversation-events'
				)
			},
		})
	}, [queryClient])

	/**
	 * Add event to local state
	 */
	const addEvent = useCallback((event: CalendarEvent): void => {
		setState((prev) => ({
			...prev,
			events: [...prev.events, event],
			lastUpdated: new Date(),
		}))
	}, [])

	/**
	 * Update event in local state
	 */
	const updateEvent = useCallback(
		(id: string, updatedEvent: Partial<CalendarEvent>): void => {
			setState((prev) => ({
				...prev,
				events: prev.events.map((event) =>
					event.id === id ? { ...event, ...updatedEvent } : event
				),
				lastUpdated: new Date(),
			}))
		},
		[]
	)

	/**
	 * Remove event from local state
	 */
	const removeEvent = useCallback((id: string): void => {
		setState((prev) => ({
			...prev,
			events: prev.events.filter((event) => event.id !== id),
			lastUpdated: new Date(),
		}))
	}, [])

	return {
		...state,
		refetchEvents,
		invalidateCache,
		refreshData,
		addEvent,
		updateEvent,
		removeEvent,
	}
}
