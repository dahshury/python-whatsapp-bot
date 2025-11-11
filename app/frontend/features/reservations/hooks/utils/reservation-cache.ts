import type { QueryClient } from "@tanstack/react-query";
import type { Reservation } from "@/entities/event";
import { SLOT_PREFIX_LEN } from "@/features/calendar/lib/constants";

export const normalizeTimeToSlot = (value?: string): string => {
  if (!value) {
    return "";
  }
  return value.slice(0, SLOT_PREFIX_LEN);
};

type UpdateReservationCacheOptions = {
  queryClient: QueryClient;
  payload?: Partial<Reservation>;
  waId: string;
  reservationId?: number;
  previousDate?: string;
  previousTimeSlot?: string;
  nextDate: string;
  nextTimeSlot: string;
  nextCustomerName?: string;
  nextType?: number;
};

/**
 * Updates a single reservation in a reservations map
 */
type UpdateReservationInMapOptions = {
  reservations: Reservation[];
  waId: string;
  reservationId: number | undefined;
  previousDate: string | undefined;
  normalizedPrevTime: string;
  payload: Partial<Reservation> | undefined;
  nextDate: string;
  normalizedPayloadTime: string;
  normalizedNextTime: string;
  nextCustomerName: string | undefined;
  nextType: number | undefined;
};

const updateReservationInMap = ({
  reservations,
  waId,
  reservationId,
  previousDate,
  normalizedPrevTime,
  payload,
  nextDate,
  normalizedPayloadTime,
  normalizedNextTime,
  nextCustomerName,
  nextType,
}: UpdateReservationInMapOptions): {
  updated: Reservation[];
  changed: boolean;
} => {
  let changed = false;
  const updated = reservations.map((reservation) => {
    const matchesById =
      reservationId !== undefined && reservation.id === reservationId;
    const matchesBySlot =
      (reservation.wa_id === waId || reservation.customer_id === waId) &&
      (previousDate ? reservation.date === previousDate : true) &&
      (normalizedPrevTime
        ? normalizeTimeToSlot(reservation.time_slot) === normalizedPrevTime
        : true);

    if (matchesById || matchesBySlot) {
      changed = true;
      return {
        ...reservation,
        ...payload,
        date: nextDate,
        time_slot: normalizedPayloadTime || normalizedNextTime,
        ...(nextCustomerName !== undefined
          ? { customer_name: nextCustomerName }
          : {}),
        ...(nextType !== undefined ? { type: nextType } : {}),
      };
    }

    return reservation;
  });

  return { updated, changed };
};

export const updateReservationCache = ({
  queryClient,
  payload,
  waId,
  reservationId,
  previousDate,
  previousTimeSlot,
  nextDate,
  nextTimeSlot,
  nextCustomerName,
  nextType,
}: UpdateReservationCacheOptions) => {
  const normalizedPrevTime = normalizeTimeToSlot(previousTimeSlot);
  const normalizedNextTime = normalizeTimeToSlot(nextTimeSlot);
  const normalizedPayloadTime = normalizeTimeToSlot(
    payload?.time_slot as string | undefined
  );

  // Update calendar-reservations queries (period-based)
  queryClient.setQueriesData(
    { queryKey: ["calendar-reservations"] },
    (old: Record<string, Reservation[]> | undefined) => {
      if (!old) {
        return old;
      }

      const updated = { ...old };
      let anyChanges = false;

      for (const [customerId, reservations] of Object.entries(updated)) {
        const result = updateReservationInMap({
          reservations,
          waId,
          reservationId,
          previousDate,
          normalizedPrevTime,
          payload,
          nextDate,
          normalizedPayloadTime,
          normalizedNextTime,
          nextCustomerName,
          nextType,
        });

        if (result.changed) {
          updated[customerId] = result.updated;
          anyChanges = true;
        }
      }

      return anyChanges ? updated : old;
    }
  );

  // Update reservations-date-range queries
  queryClient.setQueriesData(
    { queryKey: ["reservations-date-range"] },
    (old: Record<string, Reservation[]> | undefined) => {
      if (!old) {
        return old;
      }

      const updated = { ...old };
      let anyChanges = false;

      for (const [customerId, reservations] of Object.entries(updated)) {
        const result = updateReservationInMap({
          reservations,
          waId,
          reservationId,
          previousDate,
          normalizedPrevTime,
          payload,
          nextDate,
          normalizedPayloadTime,
          normalizedNextTime,
          nextCustomerName,
          nextType,
        });

        if (result.changed) {
          updated[customerId] = result.updated;
          anyChanges = true;
        }
      }

      return anyChanges ? updated : old;
    }
  );
};
