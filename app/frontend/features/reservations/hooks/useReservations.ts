import { useRef } from "react";
import type { CalendarApi } from "@/entities/event";
import type { ReservationsUseCase } from "../usecase/reservations.usecase";

export function createUseReservations(
  createService: (
    calendarApi: CalendarApi,
    isLocalized: boolean,
    refreshCustomerData?: () => Promise<void>
  ) => ReservationsUseCase
) {
  return function useReservations(
    calendarApi: CalendarApi | null,
    isLocalized: boolean,
    refreshCustomerData?: () => Promise<void>
  ): ReservationsUseCase | null {
    const serviceRef = useRef<ReservationsUseCase | null>(null);

    if (!serviceRef.current && calendarApi) {
      serviceRef.current = createService(
        calendarApi,
        isLocalized,
        refreshCustomerData
      );
    }

    return serviceRef.current;
  };
}
