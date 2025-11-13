/**
 * Calendar Query Functions
 *
 * Centralized query functions for calendar data fetching.
 * These are shared between hooks and prefetch logic to avoid duplication.
 */

import type { Reservation } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";
import { callPythonBackend } from "@/shared/libs/backend";
import type { CalendarConversationEvent } from "../hooks/useCalendarConversationEvents";

type CalendarReservationsResponse = {
  success: boolean;
  data: Record<string, Reservation[]>;
};

type CalendarConversationEventsResponse = {
  success: boolean;
  data: Record<string, CalendarConversationEvent[]>;
};

type CalendarVacationsResponse = {
  success: boolean;
  data: Vacation[];
};

/**
 * Fetch reservations for a specific period
 */
export async function fetchCalendarReservations(params: {
  fromDate: string;
  toDate: string;
  freeRoam: boolean;
}): Promise<Record<string, Reservation[]>> {
  const { fromDate, toDate, freeRoam } = params;

  const queryParams = new URLSearchParams();

  // When freeRoam is false, only fetch future reservations
  // When freeRoam is true, fetch all (past and future) by explicitly setting future=false
  if (freeRoam) {
    queryParams.set("future", "false");
  } else {
    queryParams.set("future", "true");
  }

  queryParams.set("from_date", fromDate);
  queryParams.set("to_date", toDate);
  queryParams.set("include_cancelled", String(freeRoam));

  const response = await callPythonBackend<CalendarReservationsResponse>(
    `/reservations?${queryParams.toString()}`
  );

  if (!(response.success && response.data)) {
    return {};
  }

  return response.data;
}

/**
 * Fetch reservations for a date range (general purpose)
 */
export async function fetchReservationsForDateRange(params: {
  fromDate: string;
  toDate: string;
  includeCancelled: boolean;
}): Promise<Record<string, Reservation[]>> {
  const { fromDate, toDate, includeCancelled } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("from_date", fromDate);
  queryParams.set("to_date", toDate);
  queryParams.set("future", "false"); // Include past reservations within range
  queryParams.set("include_cancelled", String(includeCancelled));

  const response = await callPythonBackend<CalendarReservationsResponse>(
    `/reservations?${queryParams.toString()}`
  );

  if (!(response.success && response.data)) {
    return {};
  }

  return response.data;
}

/**
 * Fetch conversation events for a specific period
 */
export async function fetchCalendarConversationEvents(params: {
  fromDate: string;
  toDate: string;
}): Promise<Record<string, CalendarConversationEvent[]>> {
  const { fromDate, toDate } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("from_date", fromDate);
  queryParams.set("to_date", toDate);

  const response = await callPythonBackend<CalendarConversationEventsResponse>(
    `/conversations/calendar/events?${queryParams.toString()}`
  );

  if (!(response.success && response.data)) {
    return {};
  }

  return response.data;
}

/**
 * Fetch all conversation events (no date filtering)
 */
export async function fetchAllConversationEvents(): Promise<
  Record<string, CalendarConversationEvent[]>
> {
  const response = await callPythonBackend<CalendarConversationEventsResponse>(
    "/conversations/calendar/events"
  );

  if (!(response.success && response.data)) {
    return {};
  }

  return response.data;
}

/**
 * Fetch calendar vacations
 */
export async function fetchCalendarVacations(): Promise<Vacation[]> {
  const response =
    await callPythonBackend<CalendarVacationsResponse>("/vacations");

  if (!(response.success && response.data)) {
    return [];
  }

  return response.data;
}
