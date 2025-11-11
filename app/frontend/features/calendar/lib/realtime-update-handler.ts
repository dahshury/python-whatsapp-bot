import { to24h } from "@shared/libs/utils";
import { computeSlotBase } from "./compute-slot-base";
import { reflowSlot } from "./reflow-slot";
import { getWindowProperty } from "./window-utils";

type CalendarEventDetail = {
  type: string;
  data: { id?: string | number; [key: string]: unknown };
};

type ReservationData = {
  id?: string | number;
  date?: string;
  time_slot?: string;
  customer_name?: string;
  wa_id?: string;
  waId?: string;
  type?: number;
  [key: string]: unknown;
};

type CalendarEventApi = {
  setProp?: (key: string, value: unknown) => void;
  setExtendedProp?: (key: string, value: unknown) => void;
  setDates?: (start: Date, end: Date) => void;
  remove?: () => void;
  extendedProps?: Record<string, unknown>;
} | null;

type CalendarEventInput = {
  id: string;
  title: string;
  start: string;
  end: Date;
  extendedProps?: Record<string, unknown>;
};

const DEFAULT_RESERVATION_DURATION_MINUTES = 20;
const DEFAULT_TIME_SLOT = "00:00";
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DEFAULT_SUPPRESS_MS = 1000;
const TIME_SLOT_PREFIX_LENGTH = 5;

export function createRealtimeHandler(
  api: {
    getEventById?: (id: string) => CalendarEventApi;
    addEvent?: (e: CalendarEventInput) => void;
    getEvents?: () => unknown[];
  },
  opts?: { suppressMs?: number }
) {
  const SUPPRESS_MS =
    typeof opts?.suppressMs === "number"
      ? opts?.suppressMs
      : DEFAULT_SUPPRESS_MS;
  return (ev: Event) => {
    const detail: CalendarEventDetail = (ev as CustomEvent).detail || {
      type: "",
      data: {},
    };
    const { type, data } = detail;
    try {
      if (!(type && data)) {
        return;
      }
      const reservationData = data as ReservationData;
      if (type === "reservation_created") {
        const existing = api.getEventById?.(String(reservationData.id));
        if (!existing) {
          const baseTime = to24h(
            String(reservationData.time_slot || DEFAULT_TIME_SLOT)
          ).slice(0, TIME_SLOT_PREFIX_LENGTH);
          const start = `${reservationData.date}T${baseTime}:00`;
          const startDate = new Date(start);
          api.addEvent?.({
            id: String(reservationData.id),
            title: String(
              reservationData?.customer_name || reservationData?.wa_id || ""
            ),
            start,
            end: new Date(
              startDate.getTime() +
                DEFAULT_RESERVATION_DURATION_MINUTES * MILLISECONDS_PER_MINUTE
            ),
            extendedProps: {
              type: Number(reservationData.type ?? 0),
              cancelled: false,
              waId: reservationData.wa_id || reservationData.waId,
              wa_id: reservationData.wa_id || reservationData.waId,
              reservationId: String(reservationData.id),
              slotDate: reservationData.date,
              slotTime: baseTime,
            },
          });
        }
        reflowSlot(
          api,
          String(reservationData.date),
          to24h(String(reservationData.time_slot || DEFAULT_TIME_SLOT)).slice(
            0,
            TIME_SLOT_PREFIX_LENGTH
          )
        );
      } else if (
        type === "reservation_updated" ||
        type === "reservation_reinstated"
      ) {
        const localMoves = getWindowProperty<Map<string, number> | undefined>(
          "__calendarLocalMoves",
          undefined
        );
        const ts = localMoves?.get(String(reservationData.id));
        const age = ts ? Date.now() - ts : null;
        if (ts && age && age < SUPPRESS_MS) {
          return;
        }
        const evObj = api.getEventById?.(String(reservationData.id));
        const startBase = to24h(
          String(reservationData.time_slot || DEFAULT_TIME_SLOT)
        ).slice(0, TIME_SLOT_PREFIX_LENGTH);
        const start = `${reservationData.date}T${startBase}:00`;
        if (evObj) {
          try {
            evObj.setProp?.(
              "title",
              String(
                reservationData?.customer_name || reservationData?.wa_id || ""
              )
            );
          } catch {
            /* noop */
          }
          try {
            evObj.setExtendedProp?.("type", Number(reservationData.type ?? 0));
          } catch {
            /* noop */
          }
          try {
            evObj.setExtendedProp?.("cancelled", false);
          } catch {
            /* noop */
          }
          try {
            evObj.setExtendedProp?.(
              "waId",
              reservationData.wa_id ||
                (evObj?.extendedProps?.waId as string | undefined) ||
                (evObj?.extendedProps?.wa_id as string | undefined)
            );
          } catch {
            /* noop */
          }
          try {
            evObj.setExtendedProp?.(
              "wa_id",
              reservationData.wa_id ||
                (evObj?.extendedProps?.wa_id as string | undefined) ||
                (evObj?.extendedProps?.waId as string | undefined)
            );
          } catch {
            /* noop */
          }
          try {
            evObj.setExtendedProp?.("slotDate", reservationData.date);
          } catch {
            /* noop */
          }
          try {
            evObj.setExtendedProp?.("slotTime", startBase);
          } catch {
            /* noop */
          }
          try {
            const startDate = new Date(start);
            const endDate = new Date(
              startDate.getTime() +
                DEFAULT_RESERVATION_DURATION_MINUTES * MILLISECONDS_PER_MINUTE
            );
            const currentDepth = getWindowProperty(
              "__suppressEventChangeDepth",
              0
            );
            (
              window as unknown as Record<string, unknown>
            ).__suppressEventChangeDepth = currentDepth + 1;
            evObj.setDates?.(startDate, endDate);
          } catch {
            /* noop */
          } finally {
            try {
              const currentDepth = getWindowProperty(
                "__suppressEventChangeDepth",
                0
              );
              if (currentDepth > 0) {
                (
                  window as unknown as Record<string, unknown>
                ).__suppressEventChangeDepth = currentDepth - 1;
              }
            } catch {
              /* noop */
            }
          }
        } else {
          api.addEvent?.({
            id: String(reservationData.id),
            title: String(
              reservationData?.customer_name || reservationData?.wa_id || ""
            ),
            start,
            end: new Date(
              new Date(start).getTime() +
                DEFAULT_RESERVATION_DURATION_MINUTES * MILLISECONDS_PER_MINUTE
            ),
            extendedProps: {
              type: Number(reservationData.type ?? 0),
              cancelled: false,
              waId: reservationData.wa_id || reservationData.waId,
              wa_id: reservationData.wa_id || reservationData.waId,
              reservationId: String(reservationData.id),
              slotDate: reservationData.date,
              slotTime: startBase,
            },
          });
        }
        reflowSlot(api, String(reservationData.date), startBase);
      } else if (type === "reservation_cancelled") {
        const evObj = api.getEventById?.(String(reservationData.id));
        try {
          const currentDepth = getWindowProperty(
            "__suppressEventChangeDepth",
            0
          );
          (
            window as unknown as Record<string, unknown>
          ).__suppressEventChangeDepth = currentDepth + 1;
          evObj?.setExtendedProp?.("cancelled", true);
          try {
            evObj?.remove?.();
          } catch {
            /* noop */
          }
          setTimeout(() => {
            try {
              const d = getWindowProperty("__suppressEventChangeDepth", 0);
              if (d > 0) {
                (
                  window as unknown as Record<string, unknown>
                ).__suppressEventChangeDepth = d - 1;
              }
            } catch {
              /* noop */
            }
          }, 0);
        } catch {
          /* noop */
        }
        try {
          reflowSlot(
            api,
            String(reservationData.date),
            computeSlotBase(
              String(reservationData.date),
              String(reservationData.time_slot || DEFAULT_TIME_SLOT)
            )
          );
        } catch {
          /* noop */
        }
      }
    } catch {
      /* noop */
    }
  };
}
