/**
 * useCalendarEvents Hook
 *
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Uses period-based queries with
 * sliding window prefetch for optimal performance.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent, Reservation } from "@/entities/event";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import {
  getReservationEventProcessor,
  type ReservationProcessingOptions,
} from "@/features/reservations";
import { SLOT_PREFIX_LEN } from "../lib/constants";
import {
  type CalendarConversationEvent,
  useCalendarConversationEventsForPeriod,
} from "./useCalendarConversationEvents";
import {
  getPeriodDateRange,
  getPeriodKey,
  getPrefetchPeriods,
  type ViewType,
} from "./useCalendarDateRange";
import { useCalendarReservationsForPeriod } from "./useCalendarReservations";
import { useCalendarSlidingWindow } from "./useCalendarSlidingWindow";
import { useCalendarVacations } from "./useCalendarVacations";
import { useCalendarWebSocketInvalidation } from "./useCalendarWebSocketInvalidation";

function normalizeReservationSlotTime(value?: string): string {
  if (!value) {
    return "";
  }
  return value.slice(0, SLOT_PREFIX_LEN);
}

function buildReservationKey(
  customerId: string,
  reservation: Reservation
): string {
  if (typeof reservation.id === "number") {
    return `id:${reservation.id}`;
  }
  const date = reservation.date || "";
  const time = normalizeReservationSlotTime(
    (reservation.time_slot as string | undefined) || ""
  );
  return `slot:${customerId}:${date}:${time}`;
}

type ProcessedReservation = {
  date: string;
  time_slot: string;
  customer_name?: string;
  title?: string;
  [key: string]: unknown;
};

type ProcessedConversation = {
  id?: string;
  text?: string;
  ts?: string;
  date?: string;
  time?: string;
  customer_name?: string;
};

type ReservationPayload = Record<string, ProcessedReservation[]>;
type ConversationPayload = Record<string, ProcessedConversation[]>;

function normalizeReservationsForProcessing(
  reservationsByCustomer: Record<string, Reservation[]>
): ReservationPayload {
  const normalized: ReservationPayload = {};
  for (const [waId, reservations] of Object.entries(reservationsByCustomer)) {
    if (!Array.isArray(reservations) || reservations.length === 0) {
      normalized[waId] = [];
      continue;
    }
    normalized[waId] = reservations.map((reservation) => {
      const reservationObj = reservation as unknown as Record<string, unknown>;
      const {
        date: _date,
        time_slot: _timeSlot,
        customer_name: _customerName,
        ...base
      } = reservationObj;
      const normalizedReservation: ProcessedReservation = {
        ...base,
        date: (reservation as { date?: string }).date ?? "",
        time_slot: (reservation as { time_slot?: string }).time_slot ?? "",
      };
      const customerName = (reservation as { customer_name?: string })
        .customer_name;
      if (typeof customerName !== "undefined") {
        normalizedReservation.customer_name = customerName;
      }
      return normalizedReservation;
    });
  }
  return normalized;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const replacer = (_key: string, val: unknown) => {
    if (val && typeof val === "object") {
      if (seen.has(val as object)) {
        return undefined as unknown as never;
      }
      seen.add(val as object);
      if (!Array.isArray(val)) {
        const sortedKeys = Object.keys(val as Record<string, unknown>).sort();
        return sortedKeys.reduce((acc: Record<string, unknown>, key) => {
          acc[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {});
      }
    }
    return val as unknown as never;
  };
  return JSON.stringify(value, replacer);
}

export type UseCalendarEventsOptions = {
  freeRoam: boolean;
  isLocalized: boolean;
  currentView: ViewType | string;
  currentDate: Date;
  autoRefresh?: boolean;
  refreshInterval?: number;
  ageByWaId?: Record<string, number | null>;
  /** When true, do not include conversation events in generated calendar events. */
  excludeConversations?: boolean;
  /** When false, calendar queries will not be executed (e.g., when drawer is closed) */
  enabled?: boolean;
};

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

export type UseCalendarEventsReturn = CalendarEventsState &
  CalendarEventsActions;

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
    enabled = true,
  } = options;

  const [state, setState] = useState<CalendarEventsState>({
    events: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const prevEventsRef = useRef<CalendarEvent[]>([]);
  const prevDataHashRef = useRef<string>("");

  // Get current period key and date range
  const currentPeriodKey = getPeriodKey(currentView as ViewType, currentDate);
  const { start, end } = getPeriodDateRange(
    currentView as ViewType,
    currentPeriodKey
  );
  // Ensure we have valid dates (defensive check)
  const getDateString = (date: Date): string => {
    if (!date || Number.isNaN(date.getTime())) {
      return new Date().toISOString().split("T")[0] || "";
    }
    return date.toISOString().split("T")[0] || "";
  };
  const fromDate: string = getDateString(start);
  const toDate: string = getDateString(end);

  // Set up sliding window prefetch
  useCalendarSlidingWindow({
    viewType: currentView as ViewType,
    currentDate,
    freeRoam,
    excludeConversations,
    windowSize: 5,
    enabled,
  });

  // Set up WebSocket cache invalidation
  useCalendarWebSocketInvalidation();

  const queryClient = useQueryClient();

  // Fetch current period data (this subscribes to the query and triggers loading)
  // We need to read the actual data to trigger re-renders when cache updates
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
  });

  const {
    data: currentPeriodConversations,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useCalendarConversationEventsForPeriod(
    currentPeriodKey,
    fromDate,
    toDate,
    { freeRoam, enabled }
  );

  // Track cached periods and their data for incremental updates
  const SLIDING_WINDOW_SIZE = 5;
  const cachedPeriodsRef = useRef<Set<string>>(new Set());
  const cachedReservationsByPeriod = useRef<
    Map<string, Record<string, Reservation[]>>
  >(new Map());
  const cachedConversationsByPeriod = useRef<
    Map<string, Record<string, CalendarConversationEvent[]>>
  >(new Map());

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
  );

  // Detect added/removed periods and update cache incrementally
  const { allCachedReservations, allCachedConversationEvents } = useMemo(() => {
    const previousPeriods = cachedPeriodsRef.current;
    const currentPeriods = currentPrefetchPeriods;

    // Detect removed periods (no longer in prefetch window)
    const removedPeriods = Array.from(previousPeriods).filter(
      (p) => !currentPeriods.has(p)
    );

    // Remove evicted periods from cache refs
    for (const periodKey of removedPeriods) {
      cachedReservationsByPeriod.current.delete(periodKey);
      cachedConversationsByPeriod.current.delete(periodKey);
    }

    // Update all periods from cache (not just added ones)
    // This ensures we pick up any updates to existing periods (e.g., WebSocket invalidation)
    for (const periodKey of Array.from(currentPeriods)) {
      const reservations = queryClient.getQueryData<
        Record<string, Reservation[]>
      >(["calendar-reservations", periodKey, freeRoam]);
      const conversations = queryClient.getQueryData<
        Record<string, CalendarConversationEvent[]>
      >(["calendar-conversation-events", periodKey, freeRoam]);

      if (reservations) {
        cachedReservationsByPeriod.current.set(periodKey, reservations);
      }
      if (conversations) {
        cachedConversationsByPeriod.current.set(periodKey, conversations);
      }
    }

    // Ensure the actively viewed period always reflects the latest query data
    if (typeof currentPeriodKey === "string" && currentPeriodReservations) {
      cachedReservationsByPeriod.current.set(
        currentPeriodKey,
        currentPeriodReservations
      );
    }
    if (typeof currentPeriodKey === "string" && currentPeriodConversations) {
      cachedConversationsByPeriod.current.set(
        currentPeriodKey,
        currentPeriodConversations
      );
    }

    // Update tracked periods
    cachedPeriodsRef.current = new Set(currentPeriods);

    // Merge all cached periods
    const mergedReservations: Record<string, Reservation[]> = {};
    const mergedConversations: Record<string, CalendarConversationEvent[]> = {};
    const seenReservations = new Map<string, Map<string, number>>();

    for (const [, reservations] of cachedReservationsByPeriod.current) {
      for (const [customerId, reservationList] of Object.entries(
        reservations
      )) {
        if (!mergedReservations[customerId]) {
          mergedReservations[customerId] = [];
          seenReservations.set(customerId, new Map());
        }
        const customerSeen = seenReservations.get(customerId) as Map<
          string,
          number
        >;
        for (const reservation of reservationList || []) {
          const key = buildReservationKey(customerId, reservation);
          if (customerSeen.has(key)) {
            const index = customerSeen.get(key) as number;
            mergedReservations[customerId][index] = {
              ...mergedReservations[customerId][index],
              ...reservation,
            };
          } else {
            customerSeen.set(key, mergedReservations[customerId].length);
            mergedReservations[customerId].push({ ...reservation });
          }
        }
      }
    }

    for (const [, conversations] of cachedConversationsByPeriod.current) {
      for (const [customerId, eventList] of Object.entries(conversations)) {
        if (!mergedConversations[customerId]) {
          mergedConversations[customerId] = [];
        }
        mergedConversations[customerId].push(...eventList);
      }
    }

    return {
      allCachedReservations: mergedReservations,
      allCachedConversationEvents: mergedConversations,
    };
  }, [
    currentPrefetchPeriods,
    freeRoam,
    queryClient,
    currentPeriodReservations,
    currentPeriodConversations,
    currentPeriodKey,
  ]);

  // Fetch calendar vacations (not period-based, always fetch all)
  const {
    data: vacationPeriods = [],
    isLoading: vacationsLoading,
    error: vacationsError,
  } = useCalendarVacations(enabled);

  // Fetch customer names (single source of truth - no redundancy)
  const { data: customerNamesData } = useCustomerNames();
  const customerNames = useMemo(
    () => customerNamesData || {},
    [customerNamesData]
  );

  // Extract document status from reservation data
  // Use a ref to track previous documentStatus to prevent unnecessary updates
  const prevDocumentStatusRef = useRef<string>("");
  const documentStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    for (const [waId, reservations] of Object.entries(allCachedReservations)) {
      // Get has_document from first reservation (all reservations for same customer have same status)
      if (reservations.length > 0) {
        const firstReservation = reservations[0] as unknown as Record<
          string,
          unknown
        >;
        status[waId] = Boolean(firstReservation.has_document);
      }
    }
    return status;
  }, [allCachedReservations]);

  // Memoize event processor
  const eventProcessor = useMemo(() => getReservationEventProcessor(), []);

  // Combine loading and error states
  const isDataLoading =
    reservationsLoading || conversationsLoading || vacationsLoading;
  const dataError = reservationsError || conversationsError || vacationsError;
  const normalizedError = dataError ? String(dataError) : null;

  // Prepare static processing options
  // Use refs to track previous values to prevent unnecessary re-renders
  const prevProcessingOptionsRef = useRef<Omit<
    ReservationProcessingOptions,
    "vacationPeriods" | "ageByWaId" | "conversationsByUser"
  > | null>(null);
  const prevCustomerNamesRef = useRef<string>("");

  // Serialize documentStatus and customerNames for comparison
  const documentStatusKey = useMemo(
    () => JSON.stringify(documentStatus),
    [documentStatus]
  );
  const customerNamesKey = useMemo(
    () => JSON.stringify(customerNames),
    [customerNames]
  );

  // Only update processingOptions when values actually change
  const processingOptions = useMemo(() => {
    const newOptions: Omit<
      ReservationProcessingOptions,
      "vacationPeriods" | "ageByWaId" | "conversationsByUser"
    > = {
      freeRoam,
      isLocalized,
      customerNames, // Single source of truth for names
      excludeConversations,
      documentStatus, // Document existence status for border color logic
    };

    // Compare with previous options using serialized keys for deep comparison
    const prevOptions = prevProcessingOptionsRef.current;
    if (
      prevOptions &&
      prevOptions.freeRoam === newOptions.freeRoam &&
      prevOptions.isLocalized === newOptions.isLocalized &&
      prevOptions.excludeConversations === newOptions.excludeConversations &&
      prevDocumentStatusRef.current === documentStatusKey &&
      prevCustomerNamesRef.current === customerNamesKey
    ) {
      // No change, return previous reference to prevent re-renders
      return prevOptions;
    }

    // Update refs
    prevDocumentStatusRef.current = documentStatusKey;
    prevCustomerNamesRef.current = customerNamesKey;
    prevProcessingOptionsRef.current = newOptions;
    return newOptions;
  }, [
    freeRoam,
    isLocalized,
    customerNames,
    excludeConversations,
    documentStatus,
    documentStatusKey,
    customerNamesKey,
  ]);

  const reservationsPayload = useMemo(
    () => normalizeReservationsForProcessing(allCachedReservations),
    [allCachedReservations]
  );

  const conversationsPayload = useMemo<ConversationPayload>(() => {
    if (excludeConversations) {
      return {} as ConversationPayload;
    }
    return allCachedConversationEvents as ConversationPayload;
  }, [allCachedConversationEvents, excludeConversations]);

  const dataFingerprint = useMemo(
    () =>
      stableStringify({
        reservations: reservationsPayload,
        conversations: conversationsPayload,
        vacations: vacationPeriods,
        excludeConversations,
        ageByWaId: ageByWaId ?? null,
      }),
    [
      reservationsPayload,
      conversationsPayload,
      vacationPeriods,
      excludeConversations,
      ageByWaId,
    ]
  );

  const processedEvents = useMemo(() => {
    if (isDataLoading || dataError) {
      return prevEventsRef.current;
    }

    return eventProcessor.generateCalendarEvents(
      reservationsPayload,
      conversationsPayload,
      {
        ...processingOptions,
        vacationPeriods,
        ...(ageByWaId ? { ageByWaId } : {}),
      }
    );
  }, [
    isDataLoading,
    dataError,
    eventProcessor,
    reservationsPayload,
    conversationsPayload,
    processingOptions,
    vacationPeriods,
    ageByWaId,
  ]);

  /**
   * Sync loading/error flags with local state
   */
  useEffect(() => {
    setState((prev) => {
      if (prev.loading === isDataLoading && prev.error === normalizedError) {
        return prev;
      }
      return {
        ...prev,
        loading: isDataLoading,
        error: normalizedError,
      };
    });
  }, [isDataLoading, normalizedError]);

  /**
   * Process calendar events and update local cache
   */
  useEffect(() => {
    if (isDataLoading) {
      return;
    }

    if (normalizedError) {
      setState((prev) => {
        if (!prev.loading && prev.error === normalizedError) {
          return prev;
        }
        prevDataHashRef.current = "";
        return {
          ...prev,
          loading: false,
          error: normalizedError,
          lastUpdated: new Date(),
        };
      });
      return;
    }

    if (prevDataHashRef.current === dataFingerprint) {
      return;
    }

    prevDataHashRef.current = dataFingerprint;
    prevEventsRef.current = processedEvents;

    setState((prev) => ({
      ...prev,
      events: processedEvents,
      loading: false,
      error: null,
      lastUpdated: new Date(),
    }));
  }, [isDataLoading, normalizedError, dataFingerprint, processedEvents]);

  /**
   * Refresh events by invalidating current period queries
   */
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      // Invalidate current period queries (must match query key format exactly)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["calendar-reservations", currentPeriodKey, freeRoam],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "calendar-conversation-events",
            currentPeriodKey,
            freeRoam,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["calendar-vacations"],
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
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return (
          key[0] === "calendar-reservations" ||
          key[0] === "calendar-conversation-events"
        );
      },
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
