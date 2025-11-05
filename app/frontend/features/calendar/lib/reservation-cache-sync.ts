import { to24h } from "@shared/libs/utils";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Reservation } from "@/entities/event";
import type { LocalOpData } from "@/shared/libs/realtime-utils";
import { isLocalOperation } from "@/shared/libs/realtime-utils";
import {
  getPeriodDateRange,
  type ViewType,
} from "../hooks/useCalendarDateRange";

type ReservationEventType =
  | "reservation_created"
  | "reservation_updated"
  | "reservation_reinstated"
  | "reservation_cancelled";

type ReservationRealtimePayload = Partial<Reservation> & {
  id?: number | string;
  wa_id?: string;
  waId?: string;
  date?: string;
  time_slot?: string;
  timeSlot?: string;
  time?: string;
  customer_id?: string;
  customerId?: string;
  status?: string;
  type?: number | string;
  cancelled?: boolean;
};

export type ReservationRealtimeEvent = {
  type: ReservationEventType;
  data?: ReservationRealtimePayload;
};

type ReservationCacheAction =
  | {
      kind: "sync";
      reservation: Reservation;
      eventDate: Date;
      waId: string;
      id: string;
      isCancellation: boolean;
    }
  | {
      kind: "purge-wa";
      waId: string;
    }
  | {
      kind: "purge-id";
      id: string;
    };

type PeriodDescriptor =
  | {
      kind: "period";
      periodKey: string;
      viewType: ViewType;
      start: Date;
      end: Date;
      freeRoam: boolean;
    }
  | {
      kind: "legacy";
      start: Date | null;
      end: Date | null;
      includeCancelled: boolean;
    };

export class ReservationCacheSynchronizer {
  private static readonly SUPPORTED_TYPES: ReservationEventType[] = [
    "reservation_created",
    "reservation_updated",
    "reservation_reinstated",
    "reservation_cancelled",
  ];

  private pendingBackgroundTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  handle(event: ReservationRealtimeEvent | undefined): boolean {
    if (
      !(
        event &&
        ReservationCacheSynchronizer.SUPPORTED_TYPES.includes(event.type)
      )
    ) {
      return false;
    }

    // Check if this is a local echo (from our own mutation) - skip if so
    const payload = (event.data || {}) as LocalOpData;
    if (isLocalOperation(event.type, payload)) {
      return true; // Handled (by ignoring)
    }

    const action = this.normalizeAction(event);
    if (!action) {
      return false;
    }
    switch (action.kind) {
      case "sync":
        this.syncReservation(action);
        // ✅ NO refetch - we already have the updated data and merged it via setQueryData
        // Following TanStack Query best practice: use setQueriesData for updates, invalidate only for unknowns
        return true;
      case "purge-wa":
        this.purgeByWaId(action.waId);
        return true;
      case "purge-id":
        this.purgeByReservationId(action.id);
        return true;
      default:
        return false;
    }
  }

  invalidateAll(): void {
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        const namespace = Array.isArray(key) ? key[0] : undefined;
        return (
          namespace === "calendar-reservations" ||
          namespace === "calendar-conversation-events"
        );
      },
      refetchType: "inactive",
    });
  }

  dispose(): void {
    if (this.pendingBackgroundTimer) {
      clearTimeout(this.pendingBackgroundTimer);
      this.pendingBackgroundTimer = null;
    }
  }

  private normalizeAction(
    event: ReservationRealtimeEvent
  ): ReservationCacheAction | null {
    const payload = (event.data || {}) as ReservationRealtimePayload;
    const waId = this.resolveWaId(payload);
    const reservationId = this.resolveReservationId(payload);
    const eventType = event.type;

    if (!(waId || reservationId)) {
      return null;
    }

    if (!reservationId) {
      if (eventType === "reservation_cancelled" && waId) {
        return { kind: "purge-wa", waId };
      }
      return null;
    }

    const dateStr = this.resolveDate(payload);
    if (!dateStr) {
      if (eventType === "reservation_cancelled") {
        return { kind: "purge-id", id: reservationId };
      }
      return null;
    }
    const eventDate = this.parseDateOnly(dateStr);

    const normalizedWaId = this.resolveNormalizedWaId(payload, waId);

    const reservation = this.buildReservation({
      payload,
      waId: normalizedWaId,
      reservationId,
      date: dateStr,
      isCancellation: eventType === "reservation_cancelled",
    });

    if (!reservation) {
      return null;
    }

    return {
      kind: "sync",
      reservation,
      eventDate,
      waId: reservation.customer_id,
      id: reservationId,
      isCancellation: eventType === "reservation_cancelled",
    };
  }

  private buildReservation(params: {
    payload: ReservationRealtimePayload;
    waId: string;
    reservationId: string;
    date: string;
    isCancellation: boolean;
  }): Reservation | null {
    const { payload, waId, reservationId, date, isCancellation } = params;
    const base = { ...(payload as Record<string, unknown>) };
    const resolvedCustomerId = String(
      payload.customer_id ?? payload.customerId ?? waId
    );
    let resolvedName = resolvedCustomerId;
    if (typeof payload.customer_name === "string") {
      resolvedName = payload.customer_name;
    } else if (typeof payload.customerId === "string") {
      resolvedName = payload.customerId;
    }
    const timeSlot = this.resolveTimeSlot(payload);
    const resolvedTypeRaw =
      payload.type ?? (base.type as number | string | undefined);
    const resolvedType = this.toNumber(resolvedTypeRaw, 0);
    const reservationsIdNumber = this.toNumber(reservationId, undefined);
    const normalizedId =
      typeof reservationsIdNumber === "number"
        ? reservationsIdNumber
        : this.toNumber(payload.id, undefined);

    const baseReservation = { ...(base as Reservation) };
    const { id: _unusedId, ...reservationWithoutId } = baseReservation;

    const reservation: Reservation = {
      ...reservationWithoutId,
      customer_id: resolvedCustomerId,
      date,
      time_slot: timeSlot,
      customer_name: resolvedName,
      type: resolvedType,
      cancelled: isCancellation ? true : Boolean(payload.cancelled ?? false),
    };

    if (typeof normalizedId === "number") {
      reservation.id = normalizedId;
    }

    return reservation;
  }

  private syncReservation(
    action: Extract<ReservationCacheAction, { kind: "sync" }>
  ): void {
    const queries = this.queryClient.getQueriesData<
      Record<string, Reservation[]>
    >({
      queryKey: ["calendar-reservations"],
    });

    for (const [key, data] of queries) {
      if (!data) {
        continue;
      }
      const descriptor = this.resolveDescriptor(key);
      if (!descriptor) {
        continue;
      }
      const { updated, changed } = this.applyReservationToDataset({
        descriptor,
        data,
        reservation: action.reservation,
        id: action.id,
        eventDate: action.eventDate,
        isCancellation: action.isCancellation,
      });
      if (changed) {
        this.queryClient.setQueryData(key, updated);
      }
    }
  }

  private purgeByWaId(waId: string): void {
    const queries = this.queryClient.getQueriesData<
      Record<string, Reservation[]>
    >({
      queryKey: ["calendar-reservations"],
    });
    for (const [key, data] of queries) {
      if (!data) {
        continue;
      }
      let changed = false;
      const next: Record<string, Reservation[]> = {};
      for (const [customerId, reservations] of Object.entries(data)) {
        if (customerId === waId) {
          if (reservations.length > 0) {
            changed = true;
          }
          continue;
        }
        next[customerId] = reservations;
      }
      if (changed) {
        this.queryClient.setQueryData(key, next);
      }
    }
  }

  private purgeByReservationId(reservationId: string): void {
    const queries = this.queryClient.getQueriesData<
      Record<string, Reservation[]>
    >({
      queryKey: ["calendar-reservations"],
    });
    for (const [key, data] of queries) {
      if (!data) {
        continue;
      }
      const { updated, changed } = this.removeReservationFromDataset(
        data,
        reservationId
      );
      if (changed) {
        this.queryClient.setQueryData(key, updated);
      }
    }
  }

  private applyReservationToDataset(params: {
    descriptor: PeriodDescriptor;
    data: Record<string, Reservation[]>;
    reservation: Reservation;
    id: string;
    eventDate: Date;
    isCancellation: boolean;
  }): { updated: Record<string, Reservation[]>; changed: boolean } {
    const { descriptor, data, reservation, id, eventDate, isCancellation } =
      params;

    const {
      updated: removed,
      removedReservation,
      changed: removalChanged,
    } = this.removeReservationFromDataset(data, id);

    let changed = removalChanged;
    let baseline = reservation;
    if (!baseline.customer_name && removedReservation?.customer_name) {
      baseline = {
        ...baseline,
        customer_name: removedReservation.customer_name,
      };
    }

    if (descriptor.kind === "period") {
      const withinRange = this.isDateWithinRange(
        eventDate,
        descriptor.start,
        descriptor.end
      );
      if (!withinRange) {
        return { updated: removed, changed };
      }
      if (isCancellation) {
        if (descriptor.freeRoam) {
          changed =
            this.insertReservation(removed, {
              ...baseline,
              cancelled: true,
            }) || changed;
        }
        return { updated: removed, changed };
      }
      changed =
        this.insertReservation(removed, {
          ...baseline,
          cancelled: false,
        }) || changed;
      return { updated: removed, changed };
    }

    const withinLegacyRange = this.isWithinLegacyRange(descriptor, eventDate);
    if (!withinLegacyRange) {
      return { updated: removed, changed };
    }
    if (isCancellation) {
      if (descriptor.includeCancelled) {
        changed =
          this.insertReservation(removed, {
            ...baseline,
            cancelled: true,
          }) || changed;
      }
      return { updated: removed, changed };
    }
    changed =
      this.insertReservation(removed, {
        ...baseline,
        cancelled: false,
      }) || changed;
    return { updated: removed, changed };
  }

  private removeReservationFromDataset(
    data: Record<string, Reservation[]>,
    reservationId: string
  ): {
    updated: Record<string, Reservation[]>;
    removedReservation: Reservation | undefined;
    changed: boolean;
  } {
    let changed = false;
    let removedReservation: Reservation | undefined;
    const updatedEntries: Record<string, Reservation[]> = {};
    for (const [customerId, reservations] of Object.entries(data)) {
      const filtered = reservations.filter((r) => {
        const matches = this.matchesReservationId(r, reservationId);
        if (matches && !removedReservation) {
          removedReservation = r;
        }
        return !matches;
      });
      if (filtered.length !== reservations.length) {
        changed = true;
      }
      if (filtered.length > 0) {
        updatedEntries[customerId] = filtered;
      }
    }
    return { updated: updatedEntries, removedReservation, changed };
  }

  private insertReservation(
    data: Record<string, Reservation[]>,
    reservation: Reservation
  ): boolean {
    const customerId = reservation.customer_id;
    if (!customerId) {
      return false;
    }
    const next = Array.isArray(data[customerId]) ? [...data[customerId]] : [];
    next.push({ ...reservation });
    next.sort((a, b) => this.compareReservations(a, b));
    data[customerId] = next;
    return true;
  }

  private compareReservations(a: Reservation, b: Reservation): number {
    const aKey = this.buildReservationSortKey(a);
    const bKey = this.buildReservationSortKey(b);
    if (aKey === bKey) {
      return 0;
    }
    return aKey < bKey ? -1 : 1;
  }

  private buildReservationSortKey(reservation: Reservation): string {
    const date = reservation.date || "1970-01-01";
    const time = this.normalizeToIsoTime(reservation.time_slot);
    return `${date}T${time}`;
  }

  private static readonly TIME_SLOT_HHMM_LENGTH = 5;
  private static readonly DEFAULT_TIME = "00:00";

  private normalizeToIsoTime(value?: string): string {
    const raw =
      typeof value === "string"
        ? value
        : ReservationCacheSynchronizer.DEFAULT_TIME;
    const normalized = to24h(raw);
    return normalized.length ===
      ReservationCacheSynchronizer.TIME_SLOT_HHMM_LENGTH
      ? `${normalized}:00`
      : normalized;
  }

  private resolveTimeSlot(payload: ReservationRealtimePayload): string {
    const raw =
      payload.time_slot ?? payload.timeSlot ?? payload.time ?? "00:00";
    return to24h(String(raw || "00:00"));
  }

  private resolveWaId(payload: ReservationRealtimePayload): string | null {
    const wa =
      payload.wa_id ??
      payload.waId ??
      payload.customer_id ??
      payload.customerId;
    return typeof wa === "string" && wa.trim().length > 0 ? String(wa) : null;
  }

  private resolveReservationId(
    payload: ReservationRealtimePayload
  ): string | null {
    if (typeof payload.id === "number" || typeof payload.id === "string") {
      const id = String(payload.id);
      return id.trim().length > 0 ? id : null;
    }
    return null;
  }

  private resolveDate(payload: ReservationRealtimePayload): string | null {
    const date = payload.date;
    if (typeof date === "string" && date.trim().length > 0) {
      return date;
    }
    return null;
  }

  private parseDateOnly(value: string): Date {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private resolveNormalizedWaId(
    payload: ReservationRealtimePayload,
    explicitWaId: string | null
  ): string {
    const candidate =
      explicitWaId ?? payload.customer_id ?? payload.customerId ?? null;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      return trimmed;
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
    return "";
  }

  private resolveDescriptor(key: QueryKey): PeriodDescriptor | null {
    if (!Array.isArray(key)) {
      return null;
    }
    if (key.length < 2) {
      return null;
    }
    if (key[1] === "legacy") {
      const includeCancelled = Boolean(key[3]);
      const fromDate =
        typeof key[4] === "string" && key[4]
          ? this.parseDateOnly(key[4])
          : null;
      const toDate =
        typeof key[5] === "string" && key[5]
          ? this.parseDateEndOfDay(key[5] as string)
          : null;
      return {
        kind: "legacy",
        start: fromDate,
        end: toDate,
        includeCancelled,
      };
    }
    const periodKey = typeof key[1] === "string" ? (key[1] as string) : null;
    if (!periodKey) {
      return null;
    }
    const viewType = this.inferViewType(periodKey);
    if (!viewType) {
      return null;
    }
    const { start, end } = getPeriodDateRange(viewType, periodKey);
    return {
      kind: "period",
      periodKey,
      viewType,
      start,
      end,
      freeRoam: Boolean(key[2]),
    };
  }

  private static readonly YEAR_REGEX = /^\d{4}$/;
  private static readonly YEAR_MONTH_REGEX = /^\d{4}-\d{2}$/;
  private static readonly YEAR_WEEK_REGEX = /^\d{4}-W\d{2}$/;
  private static readonly YEAR_MONTH_DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  private inferViewType(periodKey: string): ViewType | null {
    if (ReservationCacheSynchronizer.YEAR_REGEX.test(periodKey)) {
      return "multiMonthYear";
    }
    if (ReservationCacheSynchronizer.YEAR_MONTH_REGEX.test(periodKey)) {
      return "dayGridMonth";
    }
    if (ReservationCacheSynchronizer.YEAR_WEEK_REGEX.test(periodKey)) {
      return "timeGridWeek";
    }
    if (ReservationCacheSynchronizer.YEAR_MONTH_DAY_REGEX.test(periodKey)) {
      return "timeGridDay";
    }
    return null;
  }

  private static readonly END_OF_DAY_HOUR = 23;
  private static readonly END_OF_DAY_MINUTE = 59;
  private static readonly END_OF_DAY_SECOND = 59;
  private static readonly END_OF_DAY_MILLISECOND = 999;

  private parseDateEndOfDay(value: string): Date {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    return new Date(
      year,
      month - 1,
      day,
      ReservationCacheSynchronizer.END_OF_DAY_HOUR,
      ReservationCacheSynchronizer.END_OF_DAY_MINUTE,
      ReservationCacheSynchronizer.END_OF_DAY_SECOND,
      ReservationCacheSynchronizer.END_OF_DAY_MILLISECOND
    );
  }

  private isDateWithinRange(date: Date, start: Date, end: Date): boolean {
    const ts = date.getTime();
    return ts >= start.getTime() && ts <= end.getTime();
  }

  private isWithinLegacyRange(
    descriptor: Extract<PeriodDescriptor, { kind: "legacy" }>,
    date: Date
  ): boolean {
    if (!(descriptor.start && descriptor.end)) {
      return true;
    }
    return this.isDateWithinRange(date, descriptor.start, descriptor.end);
  }

  private matchesReservationId(
    reservation: Reservation,
    reservationId: string
  ): boolean {
    if (typeof reservation.id === "number") {
      return String(reservation.id) === reservationId;
    }
    if (
      typeof (reservation as { reservation_id?: number }).reservation_id ===
      "number"
    ) {
      return (
        String((reservation as { reservation_id?: number }).reservation_id) ===
        reservationId
      );
    }
    return false;
  }

  private toNumber<TFallback>(
    value: unknown,
    fallback: TFallback
  ): number | TFallback {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }
}
