import type { Reservation } from "@/entities/event";
import type { QueryClient } from "@tanstack/react-query";
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
  const normalizedPayloadTime = normalizeTimeToSlot(payload?.time_slot as string | undefined);

  queryClient.setQueriesData(
    { queryKey: ["calendar-reservations"] },
    (old: Record<string, Reservation[]> | undefined) => {
      if (!old) {
        return old;
      }

      const updated = { ...old };
      let anyChanges = false;

      for (const [customerId, reservations] of Object.entries(updated)) {
        let mutated = false;
        const nextReservations = reservations.map((reservation) => {
          const matchesById =
            reservationId !== undefined && reservation.id === reservationId;
          const matchesBySlot =
            customerId === waId &&
            (!!previousDate ? reservation.date === previousDate : true) &&
            (!!normalizedPrevTime
              ? normalizeTimeToSlot(reservation.time_slot) === normalizedPrevTime
              : true);

          if (matchesById || matchesBySlot) {
            mutated = true;
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

        if (mutated) {
          updated[customerId] = nextReservations;
          anyChanges = true;
        }
      }

      return anyChanges ? updated : old;
    }
  );
};
