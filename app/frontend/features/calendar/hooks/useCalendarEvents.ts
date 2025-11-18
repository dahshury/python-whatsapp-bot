/**
 * useCalendarEvents Hook
 *
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Uses period-based queries with
 * sliding window prefetch for optimal performance.
 *
 * This hook orchestrates data fetching and state management by composing
 * useCalendarEventsData (data layer) and useCalendarEventStateMachine (state layer).
 */

import type { CalendarEvent } from '@/entities/event'
import { getPeriodKey, type ViewType } from './useCalendarDateRange'
import { useCalendarEventStateMachine } from './useCalendarEventStateMachine'
import { useCalendarEventsData } from './useCalendarEventsData'

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
	/** When false, calendar queries will not be executed (e.g., when drawer is closed) */
	enabled?: boolean
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
 * Custom hook for managing calendar events with period-based queries.
 * Composes data fetching and state management layers.
 */
export function useCalendarEvents(
	options: UseCalendarEventsOptions
): UseCalendarEventsReturn {
	const {
		freeRoam,
		currentView,
		currentDate,
		excludeConversations = false,
		ageByWaId,
		enabled = true,
	} = options

	// Get current period key for cache operations
	const currentPeriodKey = getPeriodKey(currentView as ViewType, currentDate)

	// Fetch and process calendar events data
	const data = useCalendarEventsData({
		freeRoam,
		isLocalized: options.isLocalized,
		currentView,
		currentDate,
		excludeConversations,
		...(ageByWaId ? { ageByWaId } : {}),
		enabled,
	})

	// Manage state and actions
	const stateMachine = useCalendarEventStateMachine(
		{
			currentView,
			currentDate,
			freeRoam,
			currentPeriodKey,
		},
		{
			events: data.events,
			loading: data.loading,
			error: data.error,
			fingerprint: data.fingerprint,
		}
	)

	return stateMachine
}
