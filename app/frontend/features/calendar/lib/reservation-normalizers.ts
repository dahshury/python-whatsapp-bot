/**
 * Reservation Normalizers
 *
 * Pure utility functions for normalizing and processing reservation data.
 * These functions are framework-agnostic and can be reused across features.
 */

import type { Reservation } from "@/entities/event";
import type {
  ProcessedReservation,
  ReservationPayload,
} from "../types/calendar-events.types";
import { SLOT_PREFIX_LEN } from "./constants";

/**
 * Normalizes a reservation slot time string to a fixed prefix length.
 * Used for consistent time slot comparison and key generation.
 */
export function normalizeReservationSlotTime(value?: string): string {
  if (!value) {
    return "";
  }
  return value.slice(0, SLOT_PREFIX_LEN);
}

/**
 * Builds a unique key for a reservation to enable deduplication.
 * Uses reservation ID if available, otherwise constructs a composite key
 * from customer ID, date, and normalized time slot.
 */
export function buildReservationKey(
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

/**
 * Normalizes reservations by customer into a processing payload format.
 * Extracts and standardizes reservation fields while preserving additional
 * extended properties for event generation.
 */
export function normalizeReservationsForProcessing(
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

/**
 * Creates a stable string representation of a value for comparison/fingerprinting.
 * Handles circular references and ensures object key ordering is consistent.
 * Used for cache invalidation and change detection.
 */
export function stableStringify(value: unknown): string {
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
