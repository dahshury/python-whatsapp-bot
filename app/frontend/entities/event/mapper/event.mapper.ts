import type {
  CalendarEventDto,
  ReservationDto,
} from "../infrastructure/dto/event.dto";
import type { CalendarEvent, Reservation } from "../types/event.types";

export function toCalendarEventDto(event: CalendarEvent): CalendarEventDto {
  const { id, title, start, end, allDay, ...rest } = event;
  const dto: CalendarEventDto = { id, title, start, ...rest };
  if (end !== undefined) {
    dto.end = end;
  }
  if (allDay !== undefined) {
    dto.allDay = allDay;
  }
  return dto;
}

export function toReservationDto(reservation: Reservation): ReservationDto {
  const {
    id,
    customer_id,
    date,
    time_slot,
    customer_name,
    type,
    cancelled,
    ...rest
  } = reservation;
  const dto: ReservationDto = {
    customer_id,
    date,
    time_slot,
    customer_name,
    type,
    ...rest,
  };
  if (typeof id === "number") {
    dto.id = id;
  }
  if (cancelled !== undefined) {
    dto.cancelled = cancelled;
  }
  return dto;
}
