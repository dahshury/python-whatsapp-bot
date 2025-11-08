import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Reservation } from "@/entities/event";
import {
  LOCAL_OPERATION_TIMEOUT_MS,
  SLOT_PREFIX_LEN,
  TOAST_TIMEOUT_MS,
} from "@/features/calendar/lib/constants";
import { generateLocalOpKeys } from "@/shared/libs/realtime-utils";
import { markLocalOperation } from "@/shared/libs/utils/local-ops";
import { ReservationsWsService } from "../services/reservations.ws.service";

export type CancelReservationParams = {
  waId: string;
  date: string;
  time?: string;
  reservationId?: number;
  isLocalized?: boolean;
  freeRoam?: boolean;
};

const normalizeTime = (value?: string): string => {
  if (!value) {
    return "";
  }
  return value.slice(0, SLOT_PREFIX_LEN);
};

/**
 * Standalone mutation function for cancelling reservations
 * This can be used outside of React hooks (e.g., in context menu handlers)
 */
export async function cancelReservationMutation(
  params: CancelReservationParams
) {
  const service = new ReservationsWsService();
  const response = await service.cancelReservation(params.waId, params.date, {
    ...(params.isLocalized !== undefined
      ? { isLocalized: params.isLocalized }
      : {}),
  });

  if (!response.success) {
    throw new Error(
      response.message ||
        (response as { error?: string }).error ||
        "Failed to cancel reservation"
    );
  }

  return response;
}

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelReservationMutation,

    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-reservations"] });

      const previousData = queryClient.getQueriesData({
        queryKey: ["calendar-reservations"],
      });

      // Mark as local operation to suppress WebSocket echo
      if (params.time) {
        const localKeys = generateLocalOpKeys("reservation_cancelled", {
          id: params.reservationId || "",
          wa_id: params.waId,
          date: params.date,
          time: params.time,
        });
        for (const key of localKeys) {
          markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS);
        }
      }

      const targetTime = normalizeTime(params.time);

      // Optimistically update cache
      queryClient.setQueriesData(
        { queryKey: ["calendar-reservations"] },
        (old: Record<string, Reservation[]> | undefined) => {
          if (!old) {
            return old;
          }

          const updated = { ...old };
          let changed = false;

          if (params.freeRoam) {
            // In free roam, mark as cancelled (keep in cache)
            const freeRoamReservations = updated[params.waId];
            if (freeRoamReservations) {
              updated[params.waId] = freeRoamReservations.map((r) => {
                const matchesById =
                  params.reservationId !== undefined &&
                  r.id === params.reservationId;
                const matchesBySlot =
                  r.date === params.date &&
                  (targetTime
                    ? normalizeTime(r.time_slot) === targetTime
                    : true);

                if (matchesById || matchesBySlot) {
                  changed = true;
                  return { ...r, cancelled: true };
                }
                return r;
              });
            }
          } else {
            // In normal mode, remove from cache
            const normalReservations = updated[params.waId];
            if (normalReservations) {
              const beforeLength = normalReservations.length;
              updated[params.waId] = normalReservations.filter((r) => {
                const matchesById =
                  params.reservationId !== undefined &&
                  r.id === params.reservationId;
                const matchesBySlot =
                  r.date === params.date &&
                  (targetTime
                    ? normalizeTime(r.time_slot) === targetTime
                    : true);

                return !(matchesById || matchesBySlot);
              });

              const afterFilter = updated[params.waId];
              if (afterFilter && afterFilter.length !== beforeLength) {
                changed = true;
              }

              if (afterFilter && afterFilter.length === 0) {
                delete updated[params.waId];
              }
            }
          }

          return changed ? updated : old;
        }
      );

      return { previousData };
    },

    onError: (error, params, context) => {
      // Rollback to snapshot
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      // Show error toast
      const errorMessage =
        error instanceof Error
          ? error.message
          : i18n.getMessage("save_error", params.isLocalized);
      toastService.error(
        i18n.getMessage("save_error", params.isLocalized),
        errorMessage,
        TOAST_TIMEOUT_MS
      );
    },
  });
}
