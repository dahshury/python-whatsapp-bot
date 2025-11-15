/**
 * Calendar Event Processing Service
 *
 * Service for processing calendar events from reservations and conversations.
 * Handles document status extraction, payload creation, fingerprinting, and event generation.
 */

import type { CalendarEvent, Reservation } from "@/entities/event";
import {
  getReservationEventProcessor,
  type ReservationProcessingOptions,
} from "@/features/reservations";
import type { CalendarConversationEvent } from "../hooks/useCalendarConversationEvents";
import {
  normalizeReservationsForProcessing,
  stableStringify,
} from "../lib/reservation-normalizers";
import type {
  ConversationPayload,
  ReservationPayload,
} from "../types/calendar-events.types";
import type { CustomerNamesMap } from "./calendar-customer-name.service";

export type ProcessingOptionsInput = {
  freeRoam: boolean;
  isLocalized: boolean;
  excludeConversations: boolean;
  customerNames: CustomerNamesMap;
  documentStatus: Record<string, boolean>;
};

export type ProcessingContext = {
  reservations: Record<string, Reservation[]>;
  conversations: Record<string, CalendarConversationEvent[]>;
  vacationPeriods: unknown[];
  ageByWaId?: Record<string, number | null>;
  options: ProcessingOptionsInput;
};

export type ProcessingResult = {
  events: CalendarEvent[];
  fingerprint: string;
  processingOptions: Omit<
    ReservationProcessingOptions,
    "vacationPeriods" | "ageByWaId" | "conversationsByUser"
  >;
};

/**
 * Extracts document status from reservation data.
 * All reservations for the same customer have the same document status.
 *
 * @param reservationsByCustomer - Reservations grouped by customer ID
 * @returns Map of customer ID to document existence status
 */
export function extractDocumentStatus(
  reservationsByCustomer: Record<string, Reservation[]>
): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  for (const [waId, reservations] of Object.entries(reservationsByCustomer)) {
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
}

/**
 * Creates processing options with memoization support.
 * Compares serialized values to prevent unnecessary re-renders.
 *
 * @param input - Processing options input
 * @param prevOptions - Previous options for comparison (optional)
 * @param prevDocumentStatusKey - Previous document status key (optional)
 * @param prevCustomerNamesKey - Previous customer names key (optional)
 * @returns Processing options and updated keys for next comparison
 */
export function createProcessingOptions(
  input: ProcessingOptionsInput,
  prevOptions?: Omit<
    ReservationProcessingOptions,
    "vacationPeriods" | "ageByWaId" | "conversationsByUser"
  > | null,
  prevDocumentStatusKey?: string,
  prevCustomerNamesKey?: string
): {
  options: Omit<
    ReservationProcessingOptions,
    "vacationPeriods" | "ageByWaId" | "conversationsByUser"
  >;
  documentStatusKey: string;
  customerNamesKey: string;
} {
  const documentStatusKey = JSON.stringify(input.documentStatus);
  const customerNamesKey = JSON.stringify(input.customerNames);

  const newOptions: Omit<
    ReservationProcessingOptions,
    "vacationPeriods" | "ageByWaId" | "conversationsByUser"
  > = {
    freeRoam: input.freeRoam,
    isLocalized: input.isLocalized,
    customerNames: input.customerNames,
    excludeConversations: input.excludeConversations,
    documentStatus: input.documentStatus,
  };

  // Compare with previous options using serialized keys for deep comparison
  if (
    prevOptions &&
    prevOptions.freeRoam === newOptions.freeRoam &&
    prevOptions.isLocalized === newOptions.isLocalized &&
    prevOptions.excludeConversations === newOptions.excludeConversations &&
    prevDocumentStatusKey === documentStatusKey &&
    prevCustomerNamesKey === customerNamesKey
  ) {
    // No change, return previous reference to prevent re-renders
    return {
      options: prevOptions,
      documentStatusKey,
      customerNamesKey,
    };
  }

  return {
    options: newOptions,
    documentStatusKey,
    customerNamesKey,
  };
}

/**
 * Creates normalized payloads from raw reservation and conversation data.
 *
 * @param reservations - Reservations grouped by customer ID
 * @param conversations - Conversation events grouped by customer ID
 * @param excludeConversations - Whether to exclude conversations from payload
 * @returns Normalized reservation and conversation payloads
 */
export function createProcessingPayloads(
  reservations: Record<string, Reservation[]>,
  conversations: Record<string, CalendarConversationEvent[]>,
  excludeConversations: boolean
): {
  reservationsPayload: ReservationPayload;
  conversationsPayload: ConversationPayload;
} {
  const reservationsPayload = normalizeReservationsForProcessing(reservations);

  const conversationsPayload: ConversationPayload = excludeConversations
    ? ({} as ConversationPayload)
    : (conversations as ConversationPayload);

  return {
    reservationsPayload,
    conversationsPayload,
  };
}

/**
 * Creates a stable fingerprint for cache invalidation and change detection.
 *
 * @param payloads - Processing payloads
 * @param vacationPeriods - Vacation periods data
 * @param excludeConversations - Whether conversations are excluded
 * @param ageByWaId - Age mapping by customer ID (optional)
 * @returns Stable string fingerprint
 */
export function createDataFingerprint(
  payloads: {
    reservationsPayload: ReservationPayload;
    conversationsPayload: ConversationPayload;
  },
  vacationPeriods: unknown[],
  excludeConversations: boolean,
  ageByWaId?: Record<string, number | null>
): string {
  return stableStringify({
    reservations: payloads.reservationsPayload,
    conversations: payloads.conversationsPayload,
    vacations: vacationPeriods,
    excludeConversations,
    ageByWaId: ageByWaId ?? null,
  });
}

/**
 * Processes calendar events from reservations and conversations.
 * Generates calendar events using the reservation event processor.
 *
 * @param context - Processing context with all required data
 * @returns Processed calendar events
 */
export function processCalendarEvents(
  context: ProcessingContext
): CalendarEvent[] {
  const { reservations, conversations, vacationPeriods, ageByWaId, options } =
    context;

  const { reservationsPayload, conversationsPayload } =
    createProcessingPayloads(
      reservations,
      conversations,
      options.excludeConversations
    );

  const eventProcessor = getReservationEventProcessor();

  const events = eventProcessor.generateCalendarEvents(
    reservationsPayload,
    conversationsPayload,
    {
      ...options,
      vacationPeriods,
      ...(ageByWaId ? { ageByWaId } : {}),
    } as ReservationProcessingOptions
  );

  return events;
}
