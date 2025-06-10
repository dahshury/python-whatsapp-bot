/**
 * useCalendarEvents Hook
 * 
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Provides clean separation of concerns
 * and reusable logic for calendar components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { CalendarEvent } from '@/types/calendar'
import { getCalendarDataService, type CalendarDataFetchOptions } from '@/lib/calendar-data-service'
import { 
  getReservationEventProcessor, 
  type ReservationProcessingOptions 
} from '@/lib/reservation-event-processor'

export interface UseCalendarEventsOptions {
  freeRoam: boolean
  isRTL: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface CalendarEventsState {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface CalendarEventsActions {
  refetchEvents: () => Promise<void>
  invalidateCache: () => void
  refreshData: () => Promise<void>
}

export type UseCalendarEventsReturn = CalendarEventsState & CalendarEventsActions

/**
 * Custom hook for managing calendar events
 */
export function useCalendarEvents(options: UseCalendarEventsOptions): UseCalendarEventsReturn {
  const [state, setState] = useState<CalendarEventsState>({
    events: [],
    loading: true,
    error: null,
    lastUpdated: null
  })

  // Memoize services to prevent unnecessary re-instantiation
  const dataService = useMemo(() => getCalendarDataService(), [])
  const eventProcessor = useMemo(() => getReservationEventProcessor(), [])

  // Memoize fetch options to prevent unnecessary effect triggers
  const fetchOptions = useMemo((): CalendarDataFetchOptions => ({
    freeRoam: options.freeRoam,
    includeCancelled: options.freeRoam,
    includeConversations: options.freeRoam
  }), [options.freeRoam])

  // Memoize processing options
  const processingOptions = useMemo((): Omit<ReservationProcessingOptions, 'vacationPeriods'> => ({
    freeRoam: options.freeRoam,
    isRTL: options.isRTL
  }), [options.freeRoam, options.isRTL])

  /**
   * Fetch and process calendar events
   */
  const fetchEvents = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Fetch calendar data
      const calendarData = await dataService.fetchCalendarData(fetchOptions)

      // Process events
      const fullProcessingOptions: ReservationProcessingOptions = {
        ...processingOptions,
        vacationPeriods: calendarData.vacationPeriods
      }

      const processedEvents = eventProcessor.generateCalendarEvents(
        calendarData.reservations,
        calendarData.conversations,
        fullProcessingOptions
      )

      setState(prev => ({
        ...prev,
        events: processedEvents,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }))

    } catch (error) {
      console.error('Error fetching calendar events:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        lastUpdated: new Date()
      }))
    }
  }, [dataService, eventProcessor, fetchOptions, processingOptions])

  /**
   * Refresh events by invalidating cache and refetching
   */
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Refresh data with cache invalidation
      const calendarData = await dataService.refreshData(fetchOptions)

      // Process events
      const fullProcessingOptions: ReservationProcessingOptions = {
        ...processingOptions,
        vacationPeriods: calendarData.vacationPeriods
      }

      const processedEvents = eventProcessor.generateCalendarEvents(
        calendarData.reservations,
        calendarData.conversations,
        fullProcessingOptions
      )

      setState(prev => ({
        ...prev,
        events: processedEvents,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }))

    } catch (error) {
      console.error('Error refreshing calendar events:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        lastUpdated: new Date()
      }))
    }
  }, [dataService, eventProcessor, fetchOptions, processingOptions])

  /**
   * Invalidate cache without refetching
   */
  const invalidateCache = useCallback((): void => {
    dataService.invalidateCache()
  }, [dataService])

  /**
   * Initial data loading
   */
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  /**
   * Auto-refresh functionality
   */
  useEffect(() => {
    if (!options.autoRefresh) return

    const interval = setInterval(() => {
      fetchEvents()
    }, options.refreshInterval || 5 * 60 * 1000) // Default 5 minutes

    return () => clearInterval(interval)
  }, [options.autoRefresh, options.refreshInterval, fetchEvents])

  return {
    ...state,
    refetchEvents: fetchEvents,
    invalidateCache,
    refreshData
  }
} 