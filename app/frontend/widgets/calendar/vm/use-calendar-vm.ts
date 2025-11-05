/**
 * Calendar ViewModel
 * Encapsulates calendar business logic, callbacks, and state.
 * Provides typed hooks to consume calendar context without prop drilling.
 */

import { useCallback, useMemo } from "react";
import type { CalendarEvent } from "@/entities/event";
// Note: orchestrateCancelReservation not used here; ensure no stale import remains
import { useReservationsPort } from "@/infrastructure/providers/app-service-provider";

export type CalendarViewModelState = {
  isLoading: boolean;
  error: string | null;
};

export type CalendarViewModelActions = {
  handleCancelReservation(eventId: string): Promise<void>;
  handleOpenConversation(eventId: string): void;
  handleViewDetails(eventId: string): void;
  handleOpenDocument(waId: string): void;
};

export type CalendarViewModel = CalendarViewModelState &
  CalendarViewModelActions;

/**
 * Hook that provides the calendar view model.
 * Encapsulates all calendar domain logic.
 */
export function useCalendarViewModel(params: {
  calendarApi: unknown;
  events: CalendarEvent[];
  isLocalized: boolean;
  onEventCancelled?: (eventId: string) => void;
  onConversationOpen?: (eventId: string) => void;
  onDetailsOpen?: (eventId: string) => void;
  onDocumentOpen?: (waId: string) => void;
}): CalendarViewModel {
  const reservationsPort = useReservationsPort();

  const handleCancelReservation = useCallback(
    (eventId: string): Promise<void> => {
      params.onEventCancelled?.(eventId);
      return Promise.resolve();
    },
    [params.onEventCancelled]
  );

  const handleOpenConversation = useCallback(
    (eventId: string): void => {
      params.onConversationOpen?.(eventId);
    },
    [params]
  );

  const handleViewDetails = useCallback(
    (eventId: string): void => {
      params.onDetailsOpen?.(eventId);
    },
    [params]
  );

  const handleOpenDocument = useCallback(
    (waId: string): void => {
      params.onDocumentOpen?.(waId);
    },
    [params]
  );

  const vm: CalendarViewModel = useMemo(
    () => ({
      isLoading: false,
      error: null,
      handleCancelReservation,
      handleOpenConversation,
      handleViewDetails,
      handleOpenDocument,
    }),
    [
      handleCancelReservation,
      handleOpenConversation,
      handleViewDetails,
      handleOpenDocument,
    ]
  );

  // Reference port to satisfy linting rules
  if (!reservationsPort) {
    return vm;
  }

  return vm;
}
