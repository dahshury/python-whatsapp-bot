/**
 * useCalendarEventStateMachine Hook
 *
 * State machine hook for managing calendar events state and actions.
 * Centralizes state updates, CRUD operations, and cache invalidation.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/entities/event";
import { calendarKeys } from "@/shared/api/query-keys";
import type { ViewType } from "./useCalendarDateRange";

export type CalendarEventsState = {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

export type CalendarEventsActions = {
  refetchEvents: () => Promise<void>;
  invalidateCache: () => void;
  refreshData: () => Promise<void>;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updatedEvent: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
};

export type UseCalendarEventStateMachineOptions = {
  currentView: ViewType | string;
  currentDate: Date;
  freeRoam: boolean;
  currentPeriodKey: string;
};

/**
 * Hook for managing calendar events state machine.
 * Handles state synchronization, CRUD operations, and cache invalidation.
 */
export function useCalendarEventStateMachine(
  options: UseCalendarEventStateMachineOptions,
  data: {
    events: CalendarEvent[];
    loading: boolean;
    error: string | null;
    fingerprint: string;
  }
): CalendarEventsState & CalendarEventsActions {
  const { currentPeriodKey, freeRoam } = options;
  const {
    events: dataEvents,
    loading: dataLoading,
    error: dataError,
    fingerprint,
  } = data;

  const [state, setState] = useState<CalendarEventsState>({
    events: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const prevDataHashRef = useRef<string>("");
  const prevEventsRef = useRef<CalendarEvent[]>([]);
  const queryClient = useQueryClient();

  /**
   * Sync loading/error flags with local state
   */
  useEffect(() => {
    setState((prev) => {
      if (prev.loading === dataLoading && prev.error === dataError) {
        return prev;
      }
      return {
        ...prev,
        loading: dataLoading,
        error: dataError,
      };
    });
  }, [dataLoading, dataError]);

  /**
   * Process calendar events and update local cache
   */
  useEffect(() => {
    if (dataLoading) {
      return;
    }

    if (dataError) {
      setState((prev) => {
        if (!prev.loading && prev.error === dataError) {
          return prev;
        }
        prevDataHashRef.current = "";
        return {
          ...prev,
          loading: false,
          error: dataError,
          lastUpdated: new Date(),
        };
      });
      return;
    }

    if (prevDataHashRef.current === fingerprint) {
      return;
    }

    prevDataHashRef.current = fingerprint;
    prevEventsRef.current = dataEvents;

    setState((prev) => ({
      ...prev,
      events: dataEvents,
      loading: false,
      error: null,
      lastUpdated: new Date(),
    }));
  }, [dataLoading, dataError, fingerprint, dataEvents]);

  /**
   * Refresh events by invalidating current period queries
   */
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      // Invalidate current period queries using query key factories
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: calendarKeys.reservationsByPeriod(
            currentPeriodKey,
            freeRoam
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: calendarKeys.conversationsByPeriod(
            currentPeriodKey,
            freeRoam
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: calendarKeys.vacations(),
        }),
      ]);
    } catch (_error) {
      // Error handling is done by individual refresh functions
    }
  }, [queryClient, currentPeriodKey, freeRoam]);

  /**
   * Refetch events (alias for refreshData)
   */
  const refetchEvents = useCallback(async (): Promise<void> => {
    await refreshData();
  }, [refreshData]);

  /**
   * Invalidate cache without refetching
   */
  const invalidateCache = useCallback((): void => {
    // Invalidate all calendar queries using query key factories
    queryClient.invalidateQueries({
      queryKey: calendarKeys.reservations(),
    });
    queryClient.invalidateQueries({
      queryKey: calendarKeys.conversations(),
    });
  }, [queryClient]);

  /**
   * Add event to local state
   */
  const addEvent = useCallback((event: CalendarEvent): void => {
    setState((prev) => ({
      ...prev,
      events: [...prev.events, event],
      lastUpdated: new Date(),
    }));
  }, []);

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
      }));
    },
    []
  );

  /**
   * Remove event from local state
   */
  const removeEvent = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== id),
      lastUpdated: new Date(),
    }));
  }, []);

  return {
    ...state,
    refetchEvents,
    invalidateCache,
    refreshData,
    addEvent,
    updateEvent,
    removeEvent,
  };
}
