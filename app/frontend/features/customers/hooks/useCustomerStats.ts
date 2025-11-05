"use client";

import { useQuery } from "@tanstack/react-query";

import type { Reservation } from "@/entities/event";
import { callPythonBackend } from "@/shared/libs/backend";

type CustomerStatsApiReservation = {
  id?: number;
  date: string;
  time_slot: string;
  type: number;
  status: string;
  cancelled: boolean;
};

type CustomerStatsApiMessage = {
  date?: string | null;
  time?: string | null;
};

type CustomerStatsApiResponse = {
  success: boolean;
  data?: {
    wa_id: string;
    customer_name?: string | null;
    message_count: number;
    reservation_count: number;
    reservations: CustomerStatsApiReservation[];
    first_message?: CustomerStatsApiMessage | null;
    last_message?: CustomerStatsApiMessage | null;
  };
  message?: string;
};

export type CustomerMessageSnapshot = {
  date: string | null;
  time: string | null;
};

export type CustomerStats = {
  waId: string;
  customerName: string | null;
  messageCount: number;
  reservationCount: number;
  reservations: Reservation[];
  firstMessage: CustomerMessageSnapshot | null;
  lastMessage: CustomerMessageSnapshot | null;
};

type UseCustomerStatsOptions = {
  enabled?: boolean;
  initialData?: CustomerStats;
  placeholderData?: CustomerStats;
};

function buildQueryKey(waId: string | null) {
  return ["customer-stats", waId];
}

function mapReservation(
  waId: string,
  customerName: string | null,
  reservation: CustomerStatsApiReservation
): Reservation {
  return {
    id: reservation.id,
    customer_id: waId,
    customer_name: customerName ?? waId,
    date: reservation.date,
    time_slot: reservation.time_slot,
    type: reservation.type,
    cancelled: reservation.cancelled,
    status: reservation.status,
  } as Reservation;
}

function mapApiResponse(payload: CustomerStatsApiResponse): CustomerStats {
  if (!(payload.success && payload.data)) {
    throw new Error(payload.message || "Failed to load customer stats");
  }

  const {
    wa_id: waId,
    customer_name: customerName = null,
    message_count: messageCount,
    reservation_count: reservationCount,
    reservations,
    first_message: firstMessage,
    last_message: lastMessage,
  } = payload.data;

  return {
    waId,
    customerName,
    messageCount,
    reservationCount,
    reservations: reservations.map((reservation) =>
      mapReservation(waId, customerName, reservation)
    ),
    firstMessage: firstMessage
      ? {
          date: firstMessage.date ?? null,
          time: firstMessage.time ?? null,
        }
      : null,
    lastMessage: lastMessage
      ? {
          date: lastMessage.date ?? null,
          time: lastMessage.time ?? null,
        }
      : null,
  };
}

export function useCustomerStats(
  waId: string | null,
  options?: UseCustomerStatsOptions
) {
  const enabled = Boolean(waId) && (options?.enabled ?? true);

  return useQuery<CustomerStats, Error>({
    queryKey: buildQueryKey(waId),
    queryFn: async () =>
      mapApiResponse(
        await callPythonBackend<CustomerStatsApiResponse>(
          `/customers/${waId}/stats`
        )
      ),
    enabled,
    staleTime: 120_000,
    gcTime: 300_000,
    retry: 1,
    refetchOnWindowFocus: false,
    ...(options?.initialData ? { initialData: options.initialData } : {}),
    ...(options?.placeholderData
      ? { placeholderData: options.placeholderData }
      : {}),
  });
}
