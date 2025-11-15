/**
 * Calendar Event Cache Service
 *
 * Service for managing calendar event cache coordination and merging.
 * Handles period-based cache updates, deduplication, and data aggregation.
 */

import type { Reservation } from "@/entities/event";
import type { CalendarConversationEvent } from "../hooks/useCalendarConversationEvents";
import { buildReservationKey } from "../lib/reservation-normalizers";

export type CachedPeriodData = {
  reservations: Map<string, Record<string, Reservation[]>>;
  conversations: Map<string, Record<string, CalendarConversationEvent[]>>;
};

export type MergedCacheResult = {
  allCachedReservations: Record<string, Reservation[]>;
  allCachedConversationEvents: Record<string, CalendarConversationEvent[]>;
};

/**
 * Merges cached reservations and conversations from multiple periods,
 * deduplicating reservations by customer and reservation key.
 *
 * @param cachedData - Maps of period keys to reservations/conversations
 * @returns Merged reservations and conversations by customer ID
 */
export function mergeCachedPeriodData(
  cachedData: CachedPeriodData
): MergedCacheResult {
  const {
    reservations: cachedReservationsByPeriod,
    conversations: cachedConversationsByPeriod,
  } = cachedData;

  // Merge all cached periods
  const mergedReservations: Record<string, Reservation[]> = {};
  const mergedConversations: Record<string, CalendarConversationEvent[]> = {};
  const seenReservations = new Map<string, Map<string, number>>();

  // Merge reservations with deduplication
  for (const [, reservations] of cachedReservationsByPeriod) {
    for (const [customerId, reservationList] of Object.entries(reservations)) {
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

  // Merge conversations (no deduplication needed)
  for (const [, conversations] of cachedConversationsByPeriod) {
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
}

/**
 * Detects periods that should be removed from cache (no longer in prefetch window).
 *
 * @param previousPeriods - Previously tracked period keys
 * @param currentPeriods - Currently active period keys
 * @returns Array of period keys to remove
 */
export function detectRemovedPeriods(
  previousPeriods: Set<string>,
  currentPeriods: Set<string>
): string[] {
  return Array.from(previousPeriods).filter((p) => !currentPeriods.has(p));
}
