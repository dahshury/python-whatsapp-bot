/**
 * useCalendarEventsData Hook
 *
 * Data fetching and processing hook for calendar events.
 * Composes TanStack queries, cache coordination, and event processing
 * to return processed events and metadata without UI state management.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import type { CalendarEvent, Reservation } from '@/entities/event'
import { useAppConfigQuery } from '@/features/app-config'
import { snapshotToLegacyConfig } from '@/features/app-config/model'
import { useCustomerNames } from '@/features/chat/hooks/useCustomerNames'
import { calendarKeys } from '@/shared/api/query-keys'
import {
	deriveCustomerNamesFromReservations,
	sanitizeCustomerNames,
} from '../services/calendar-customer-name.service'
import {
	detectRemovedPeriods,
	mergeCachedPeriodData,
} from '../services/calendar-event-cache.service'
import {
	createDataFingerprint,
	createProcessingOptions,
	createProcessingPayloads,
	type DataFingerprintOptions,
	extractDocumentStatus,
	type ProcessingContext,
	processCalendarEvents,
} from '../services/calendar-event-processing.service'
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

const calendarDebugEnabled =
	process.env.NEXT_PUBLIC_DISABLE_RESERVATION_DEBUG !== 'true'
const calendarDebugLog = (_label: string, _payload?: unknown) => {
	if (!calendarDebugEnabled) {
		return
	}
	// Debug logging disabled - formatting removed to avoid unused variable
}

export type UseCalendarEventsDataOptions = {
	freeRoam: boolean
	isLocalized: boolean
	currentView: ViewType | string
	currentDate: Date
	excludeConversations?: boolean
	ageByWaId?: Record<string, number | null>
	/** When false, calendar queries will not be executed (e.g., when drawer is closed) */
	enabled?: boolean
}

export type CalendarEventsData = {
	events: CalendarEvent[]
	loading: boolean
	error: string | null
	fingerprint: string
}

/**
 * Helper function to safely convert Date to ISO date string
 */
function getDateString(date: Date): string {
	if (!date || Number.isNaN(date.getTime())) {
		return new Date().toISOString().split('T')[0] || ''
	}
	return date.toISOString().split('T')[0] || ''
}

/**
 * Custom hook for fetching and processing calendar events data.
 * Returns processed events and metadata without UI state management.
 */
export function useCalendarEventsData(
	options: UseCalendarEventsDataOptions
): CalendarEventsData {
	const {
		freeRoam,
		isLocalized,
		currentView,
		currentDate,
		excludeConversations = false,
		ageByWaId,
		enabled = true,
	} = options

	const prevEventsRef = useRef<CalendarEvent[]>([])
	const prevProcessingOptionsRef = useRef<Omit<
		import('@/features/reservations').ReservationProcessingOptions,
		'vacationPeriods' | 'ageByWaId' | 'conversationsByUser'
	> | null>(null)
	const prevDocumentStatusRef = useRef<string>('')
	const prevCustomerNamesRef = useRef<string>('')
	const { data: appConfig } = useAppConfigQuery()
	const appConfigSnapshot = appConfig?.toSnapshot()
	const legacyCalendarConfig = useMemo(
		() =>
			appConfigSnapshot ? snapshotToLegacyConfig(appConfigSnapshot) : null,
		[appConfigSnapshot]
	)
	const calendarConfigSummary = useMemo(() => {
		if (!legacyCalendarConfig) {
			return null
		}
		return {
			slotDurationHours: legacyCalendarConfig.slot_duration_hours,
			daySpecificSlotDurations:
				legacyCalendarConfig.day_specific_slot_durations,
			customCalendarRanges: legacyCalendarConfig.custom_calendar_ranges,
		}
	}, [legacyCalendarConfig])

	// Get current period key and date range
	const currentPeriodKey = getPeriodKey(currentView as ViewType, currentDate)
	const { start, end } = getPeriodDateRange(
		currentView as ViewType,
		currentPeriodKey
	)
	const fromDate: string = getDateString(start)
	const toDate: string = getDateString(end)

	// Set up sliding window prefetch
	useCalendarSlidingWindow({
		viewType: currentView as ViewType,
		currentDate,
		freeRoam,
		excludeConversations,
		windowSize: 5,
		enabled,
	})

	// Set up WebSocket cache invalidation
	useCalendarWebSocketInvalidation()

	const queryClient = useQueryClient()

	// Fetch current period data (this subscribes to the query and triggers loading)
	const {
		data: currentPeriodReservations,
		isLoading: reservationsLoading,
		error: reservationsError,
	} = useCalendarReservationsForPeriod({
		periodKey: currentPeriodKey,
		fromDate,
		toDate,
		freeRoam,
		enabled,
	})

	const {
		data: currentPeriodConversations,
		isLoading: conversationsLoading,
		error: conversationsError,
	} = useCalendarConversationEventsForPeriod(
		currentPeriodKey,
		fromDate,
		toDate,
		{ freeRoam, enabled }
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
		const removedPeriods = detectRemovedPeriods(previousPeriods, currentPeriods)

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
			>(calendarKeys.reservationsByPeriod(periodKey, freeRoam))
			const conversations = queryClient.getQueryData<
				Record<string, CalendarConversationEvent[]>
			>(calendarKeys.conversationsByPeriod(periodKey, freeRoam))

			if (reservations) {
				cachedReservationsByPeriod.current.set(periodKey, reservations)
			}
			if (conversations) {
				cachedConversationsByPeriod.current.set(periodKey, conversations)
			}
		}

		// Ensure the actively viewed period always reflects the latest query data
		if (typeof currentPeriodKey === 'string' && currentPeriodReservations) {
			cachedReservationsByPeriod.current.set(
				currentPeriodKey,
				currentPeriodReservations
			)
		}
		if (typeof currentPeriodKey === 'string' && currentPeriodConversations) {
			cachedConversationsByPeriod.current.set(
				currentPeriodKey,
				currentPeriodConversations
			)
		}

		// Update tracked periods
		cachedPeriodsRef.current = new Set(currentPeriods)

		// Merge all cached periods using service
		return mergeCachedPeriodData({
			reservations: cachedReservationsByPeriod.current,
			conversations: cachedConversationsByPeriod.current,
		})
	}, [
		currentPrefetchPeriods,
		freeRoam,
		queryClient,
		currentPeriodReservations,
		currentPeriodConversations,
		currentPeriodKey,
	])

	// Fetch calendar vacations (not period-based, always fetch all)
	const {
		data: vacationPeriods = [],
		isLoading: vacationsLoading,
		error: vacationsError,
	} = useCalendarVacations(enabled)

	// Fetch customer names (single source of truth - no redundancy)
	const { data: customerNamesData, isLoading: customerNamesLoading } =
		useCustomerNames()
	const customerNames = useMemo(
		() => customerNamesData || {},
		[customerNamesData]
	)

	// Sanitize customer names
	const sanitizedCustomerNames = useMemo(
		() => sanitizeCustomerNames(customerNames),
		[customerNames]
	)

	useEffect(() => {
		calendarDebugLog('calendarEvents:customerNamesState', {
			loading: customerNamesLoading,
			size: Object.keys(customerNames).length,
			has252654834901: Object.hasOwn(customerNames, '252654834901'),
		})
	}, [customerNamesLoading, customerNames])

	// Derive customer names from reservations
	const effectiveCustomerNames = useMemo(
		() =>
			deriveCustomerNamesFromReservations(
				sanitizedCustomerNames,
				allCachedReservations
			),
		[sanitizedCustomerNames, allCachedReservations]
	)

	// Extract document status from reservation data
	const documentStatus = useMemo(
		() => extractDocumentStatus(allCachedReservations),
		[allCachedReservations]
	)

	// Combine loading and error states
	const isDataLoading =
		reservationsLoading ||
		conversationsLoading ||
		vacationsLoading ||
		customerNamesLoading
	useEffect(() => {
		calendarDebugLog('calendarEvents:loadingState', {
			reservationsLoading,
			conversationsLoading,
			vacationsLoading,
			customerNamesLoading,
			isDataLoading,
		})
	}, [
		reservationsLoading,
		conversationsLoading,
		vacationsLoading,
		customerNamesLoading,
		isDataLoading,
	])
	const dataError = reservationsError || conversationsError || vacationsError
	const normalizedError = dataError ? String(dataError) : null

	// Create processing options with memoization
	const {
		options: processingOptions,
		documentStatusKey,
		customerNamesKey,
	} = useMemo(
		() =>
			createProcessingOptions(
				{
					freeRoam,
					isLocalized,
					excludeConversations,
					customerNames: effectiveCustomerNames,
					documentStatus,
				},
				prevProcessingOptionsRef.current,
				prevDocumentStatusRef.current,
				prevCustomerNamesRef.current
			),
		[
			freeRoam,
			isLocalized,
			excludeConversations,
			effectiveCustomerNames,
			documentStatus,
		]
	)

	// Update refs for next comparison
	useEffect(() => {
		prevDocumentStatusRef.current = documentStatusKey
		prevCustomerNamesRef.current = customerNamesKey
		prevProcessingOptionsRef.current = processingOptions
	}, [documentStatusKey, customerNamesKey, processingOptions])

	// Create processing payloads
	const { reservationsPayload, conversationsPayload } = useMemo(
		() =>
			createProcessingPayloads(
				allCachedReservations,
				allCachedConversationEvents,
				excludeConversations
			),
		[allCachedReservations, allCachedConversationEvents, excludeConversations]
	)

	// Create data fingerprint
	const dataFingerprint = useMemo(() => {
		const fingerprintOptions: DataFingerprintOptions = {
			payloads: { reservationsPayload, conversationsPayload },
			vacationPeriods,
			excludeConversations,
			eventDurationSettings: appConfigSnapshot?.eventDurationSettings ?? null,
			slotCapacitySettings: appConfigSnapshot?.slotCapacitySettings ?? null,
			calendarConfigSummary,
		}
		if (ageByWaId) {
			fingerprintOptions.ageByWaId = ageByWaId
		}
		return createDataFingerprint(fingerprintOptions)
	}, [
		reservationsPayload,
		conversationsPayload,
		vacationPeriods,
		excludeConversations,
		ageByWaId,
		appConfigSnapshot?.eventDurationSettings,
		appConfigSnapshot?.slotCapacitySettings,
		calendarConfigSummary,
	])

	// Process calendar events
	const processedEvents = useMemo(() => {
		if (isDataLoading || dataError) {
			calendarDebugLog('calendarEvents:processedEventsSkipped', {
				reason: isDataLoading ? 'loading' : 'error',
				dataError,
			})
			return prevEventsRef.current
		}

		const context: ProcessingContext = {
			reservations: allCachedReservations,
			conversations: allCachedConversationEvents,
			vacationPeriods,
			...(ageByWaId ? { ageByWaId } : {}),
			options: {
				freeRoam,
				isLocalized,
				excludeConversations,
				customerNames: effectiveCustomerNames,
				documentStatus,
			},
			calendarConfig: legacyCalendarConfig,
			eventDurationSettings: appConfigSnapshot?.eventDurationSettings ?? null,
			slotCapacitySettings: appConfigSnapshot?.slotCapacitySettings ?? null,
		}

		const events = processCalendarEvents(context)

		calendarDebugLog('calendarEvents:processedEventsGenerated', {
			count: events.length,
			processingOptionsCustomerNamesSize: Object.keys(
				processingOptions.customerNames || {}
			).length,
			effectiveCustomerNamesSize: Object.keys(effectiveCustomerNames).length,
			customerNamesSize: Object.keys(customerNames).length,
		})

		prevEventsRef.current = events
		return events
	}, [
		isDataLoading,
		dataError,
		allCachedReservations,
		allCachedConversationEvents,
		vacationPeriods,
		ageByWaId,
		freeRoam,
		isLocalized,
		excludeConversations,
		effectiveCustomerNames,
		documentStatus,
		processingOptions.customerNames,
		customerNames,
		appConfigSnapshot?.eventDurationSettings,
		appConfigSnapshot?.slotCapacitySettings,
		legacyCalendarConfig,
	])

	return {
		events: processedEvents,
		loading: isDataLoading,
		error: normalizedError,
		fingerprint: dataFingerprint,
	}
}
