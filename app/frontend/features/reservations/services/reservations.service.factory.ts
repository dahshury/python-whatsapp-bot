import type { CalendarApi } from "@/entities/event";
import { ReservationsService } from "./reservations.service";

export const createReservationsService = (
  calendarApi: CalendarApi,
  isLocalized: boolean,
  refreshCustomerData?: () => Promise<void>
) => ReservationsService(calendarApi, isLocalized, refreshCustomerData);
