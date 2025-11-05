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

export type MutateReservationParams = {
  waId: string;
  reservationId?: number;
  date: string;
  time: string;
  title?: string;
  type?: number;
  approximate?: boolean;
  isLocalized?: boolean;
};

type InternalMutateParams = MutateReservationParams & {
  previousDate?: string;
  previousTimeSlot?: string;
};

const normalizeTime = (value?: string): string => {
  if (!value) {
    return "";
  }
  return value.slice(0, SLOT_PREFIX_LEN);
};

export function useMutateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InternalMutateParams) => {
      const service = new ReservationsWsService();
      const {
        previousDate: _previousDate,
        previousTimeSlot: _previousTimeSlot,
        ...apiParams
      } = params;
      const response = await service.modifyReservation(
        apiParams.waId,
        {
          date: apiParams.date,
          time: apiParams.time,
          ...(apiParams.title !== undefined ? { title: apiParams.title } : {}),
          ...(apiParams.type !== undefined ? { type: apiParams.type } : {}),
          ...(apiParams.reservationId !== undefined
            ? { reservationId: apiParams.reservationId }
            : {}),
          approximate:
            apiParams.approximate !== undefined ? apiParams.approximate : false,
        },
        {
          ...(apiParams.isLocalized !== undefined
            ? { isLocalized: apiParams.isLocalized }
            : {}),
        }
      );

      if (!response.success) {
        throw new Error(
          response.message ||
            (response as { error?: string }).error ||
            "Failed to modify reservation"
        );
      }

      return response;
    },

    onMutate: async (params) => {
      const extendedParams = params as InternalMutateParams;
      await queryClient.cancelQueries({ queryKey: ["calendar-reservations"] });

      const previousData = queryClient.getQueriesData({
        queryKey: ["calendar-reservations"],
      });

      const localKeys = generateLocalOpKeys("reservation_updated", {
        id: params.reservationId || "",
        wa_id: params.waId,
        date: params.date,
        time: params.time,
      });
      for (const key of localKeys) {
        markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS);
      }

      const previousDate = extendedParams.previousDate || params.date;
      const previousTimeSlot = normalizeTime(
        extendedParams.previousTimeSlot || params.time
      );
      const nextTimeSlot = normalizeTime(params.time);

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
            const nextReservations = reservations.map((r) => {
              const matchesById =
                params.reservationId !== undefined &&
                r.id === params.reservationId;
              const matchesBySlot =
                customerId === params.waId &&
                r.date === previousDate &&
                normalizeTime(r.time_slot) === previousTimeSlot;

              if (matchesById || matchesBySlot) {
                mutated = true;
                return {
                  ...r,
                  date: params.date,
                  time_slot: nextTimeSlot,
                  ...(params.title !== undefined
                    ? { customer_name: params.title }
                    : {}),
                  ...(params.type !== undefined ? { type: params.type } : {}),
                  cancelled: false,
                };
              }
              return r;
            });

            if (mutated) {
              updated[customerId] = nextReservations;
              anyChanges = true;
            }
          }

          return anyChanges ? updated : old;
        }
      );

      return { previousData };
    },

    onSuccess: (response, params) => {
      const extendedParams = params as InternalMutateParams;
      const previousDate = extendedParams.previousDate || params.date;
      const previousTimeSlot = normalizeTime(
        extendedParams.previousTimeSlot || params.time
      );
      const nextTimeSlot = normalizeTime(params.time);
      if (response.data) {
        queryClient.setQueriesData(
          { queryKey: ["calendar-reservations"] },
          (old: Record<string, Reservation[]> | undefined) => {
            if (!old) {
              return old;
            }

            const updated = { ...old };
            let anyChanges = false;
            const payload = response.data as Partial<Reservation>;
            const responseTimeSlot = normalizeTime(
              payload?.time_slot as string | undefined
            );

            for (const [customerId, reservations] of Object.entries(updated)) {
              let mutated = false;
              const nextReservations = reservations.map((r) => {
                const matchesById =
                  params.reservationId !== undefined &&
                  r.id === params.reservationId;
                const matchesBySlot =
                  customerId === params.waId &&
                  r.date === previousDate &&
                  normalizeTime(r.time_slot) === previousTimeSlot;

                if (matchesById || matchesBySlot) {
                  mutated = true;
                  return {
                    ...r,
                    ...payload,
                    date: params.date,
                    time_slot: responseTimeSlot || nextTimeSlot,
                    ...(params.title !== undefined
                      ? { customer_name: params.title }
                      : {}),
                    ...(params.type !== undefined ? { type: params.type } : {}),
                  };
                }
                return r;
              });

              if (mutated) {
                updated[customerId] = nextReservations;
                anyChanges = true;
              }
            }

            return anyChanges ? updated : old;
          }
        );
      }
    },

    onError: (error, params, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }

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
