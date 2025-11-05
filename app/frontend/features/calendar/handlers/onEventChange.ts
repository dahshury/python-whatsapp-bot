import { i18n } from "@shared/libs/i18n";
import { orchestrateCalendarDrag } from "@/features/calendar";
import { WSReservationRepository } from "@/features/calendar/infrastructure/reservation.ws-repo";
import { ReservationService } from "@/features/calendar/services/reservation.service";
import type {
  CalendarEventData,
  FullCalendarApi,
  FullCalendarEventChangeInfo,
} from "@/features/calendar/types/fullcalendar";
import type { MutateReservationParams } from "@/features/reservations/hooks";
import { normalizeToSlotBase } from "@/shared/libs/calendar/slot-utils";

export function handleEventChange(args: {
  info: FullCalendarEventChangeInfo;
  isVacationDate: (date: string) => boolean;
  isLocalized: boolean;
  currentView: string;
  onRefresh: () => Promise<void>;
  getCalendarApi?: () => FullCalendarApi | undefined;
  updateEvent: (id: string, event: CalendarEventData) => void;
  resolveEvent?: (
    id: string
  ) => { extendedProps?: Record<string, unknown> } | undefined;
}): Promise<void> {
  const api = args.getCalendarApi?.();
  if (!api) {
    return Promise.resolve();
  }
  const service = new ReservationService(new WSReservationRepository());
  const mutateReservation = async (payload: MutateReservationParams) => {
    const previousStartStr = args.info?.oldEvent?.startStr || "";
    const previousDateCandidate =
      previousStartStr.split("T")[0] || payload.date;
    const SLOT_TIME_PREFIX_LENGTH = 5;
    const previousTimeRaw = (
      previousStartStr.split("T")[1] || payload.time
    ).slice(0, SLOT_TIME_PREFIX_LENGTH);
    const extendedPayload: MutateReservationParams & {
      previousDate?: string;
      previousTimeSlot?: string;
    } = {
      previousDate: previousDateCandidate,
      previousTimeSlot: normalizeToSlotBase(
        previousDateCandidate,
        previousTimeRaw
      ),
      ...payload,
    };
    const {
      previousDate: _previousDate,
      previousTimeSlot: _previousTimeSlot,
      ...apiParams
    } = extendedPayload;
    const result = await service.modify({
      waId: apiParams.waId,
      date: apiParams.date,
      time: apiParams.time,
      ...(apiParams.title ? { title: apiParams.title } : {}),
      ...(apiParams.type !== undefined ? { type: apiParams.type } : {}),
      ...(apiParams.approximate !== undefined
        ? { approximate: apiParams.approximate }
        : {}),
      ...(apiParams.reservationId !== undefined
        ? { reservationId: apiParams.reservationId }
        : {}),
      ...(apiParams.isLocalized !== undefined
        ? { isLocalized: apiParams.isLocalized }
        : {}),
    });
    if (!result.success) {
      throw new Error(
        result.message ||
          i18n.getMessage("slot_fully_booked", apiParams.isLocalized)
      );
    }
    return result;
  };
  return orchestrateCalendarDrag({
    calendarApi: api as unknown as import("@/entities/event").CalendarApi,
    info: args.info as unknown as import("@/features/calendar/services/calendar-events.service").EventChangeInfo,
    isVacationDate: args.isVacationDate,
    currentView: args.currentView,
    updateEvent: args.updateEvent as unknown as (
      id: string,
      event: { id: string; title?: string; start?: string; end?: string }
    ) => void,
    resolveEvent:
      args.resolveEvent ||
      (() =>
        undefined as unknown as { extendedProps?: Record<string, unknown> }),
    isLocalized: args.isLocalized,
    mutateReservation,
  });
}
