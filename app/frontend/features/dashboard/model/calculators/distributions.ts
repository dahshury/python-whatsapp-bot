import {
  getMessageDate,
  getReservationDate,
} from "@/features/dashboard/model/normalize";
import type {
  CustomerActivity,
  DailyData,
  DashboardConversationMessage,
  DashboardReservation,
  MessageHeatmapData,
  TimeSlotData,
  TypeDistribution,
} from "@/features/dashboard/types";
import { type ActiveRange, isWithinRange } from "@/shared/libs/date/range";

export type ReservationEntries = [string, DashboardReservation[]][];
export type ConversationEntries = [string, DashboardConversationMessage[]][];

export function computeDailyTrends(
  filteredReservations: ReservationEntries,
  allReservations: ReservationEntries,
  activeRange?: ActiveRange
): DailyData[] {
  const dailyMap = new Map<
    string,
    { reservations: number; cancellations: number; modifications: number }
  >();
  for (const [, items] of filteredReservations) {
    for (const r of Array.isArray(items) ? items : []) {
      const d = getReservationDate(r);
      if (!d) {
        continue;
      }
      const key = d.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) || {
        reservations: 0,
        cancellations: 0,
        modifications: 0,
      };
      entry.reservations += 1;
      if (r.cancelled === true) {
        entry.cancellations += 1;
      }
      dailyMap.set(key, entry);
    }
  }
  // Modifications within active range based on modification timestamps in full set
  const mayParse = (v?: string) => {
    if (!v) {
      return null;
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  for (const [, items] of allReservations) {
    for (const r of Array.isArray(items) ? items : []) {
      const ts =
        mayParse(r.updated_at) ||
        mayParse(r.modified_at) ||
        mayParse(r.last_modified) ||
        mayParse(r.modified_on) ||
        mayParse(r.update_ts);
      if (!ts) {
        continue;
      }
      if (!isWithinRange(ts, activeRange)) {
        continue;
      }
      const key = ts.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) || {
        reservations: 0,
        cancellations: 0,
        modifications: 0,
      };
      entry.modifications += 1;
      dailyMap.set(key, entry);
    }
  }
  return Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      reservations: v.reservations,
      cancellations: v.cancellations,
      modifications: v.modifications,
    }));
}

export function computeTypeDistribution(
  filteredReservations: ReservationEntries
): TypeDistribution[] {
  let checkup = 0;
  let followup = 0;
  for (const [, items] of filteredReservations) {
    for (const r of Array.isArray(items) ? items : []) {
      if (typeof r.type === "number") {
        if (r.type === 1) {
          followup += 1;
        } else {
          checkup += 1;
        }
      } else {
        const title = (r.title || "").toString().toLowerCase();
        if (title.includes("follow")) {
          followup += 1;
        } else {
          checkup += 1;
        }
      }
    }
  }
  const TYPE_CHECKUP = 0;
  const TYPE_FOLLOWUP = 1;
  return [
    { type: TYPE_CHECKUP, label: "Checkup", count: checkup },
    { type: TYPE_FOLLOWUP, label: "Followup", count: followup },
  ];
}

export function computeTimeSlots(
  filteredReservations: ReservationEntries
): TimeSlotData[] {
  const map = new Map<string, number>();
  for (const [, items] of filteredReservations) {
    for (const r of Array.isArray(items) ? items : []) {
      const d = getReservationDate(r);
      if (!d) {
        continue;
      }
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const key = `${hh}:${mm}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, count]) => ({
      slot: time,
      time,
      count,
      normalized: count,
      type: "regular" as const,
      availDays: 0,
    }));
}

export function computeMessageHeatmap(
  filteredConversations: ConversationEntries
): MessageHeatmapData[] {
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ] as const;
  const map = new Map<string, number>();
  for (const [, msgs] of filteredConversations) {
    for (const m of Array.isArray(msgs) ? msgs : []) {
      const d = getMessageDate(m);
      if (!d) {
        continue;
      }
      const dayIndex = d.getDay();
      if (dayIndex < 0 || dayIndex >= weekdays.length) {
        continue;
      }
      const key = `${weekdays[dayIndex]}_${d.getHours()}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([k, count]) => {
      const parts = k.split("_");
      if (parts.length !== 2) {
        return null;
      }
      const [weekday, hourStr] = parts;
      const hour = Number(hourStr);
      if (!weekday || Number.isNaN(hour)) {
        return null;
      }
      return { weekday, hour, count };
    })
    .filter((x): x is MessageHeatmapData => x !== null);
}

export function computeTopCustomers(
  filteredConversations: ConversationEntries,
  filteredReservations: ReservationEntries,
  uniqueCustomerIds: Set<string>
): CustomerActivity[] {
  const map = new Map<
    string,
    { messageCount: number; reservationCount: number; lastActivity: string }
  >();
  for (const id of uniqueCustomerIds) {
    const msgs = (filteredConversations.find(([k]) => k === id)?.[1] ??
      []) as DashboardConversationMessage[];
    const resv = (filteredReservations.find(([k]) => k === id)?.[1] ??
      []) as DashboardReservation[];
    const lastMsg = msgs
      .map((m) => getMessageDate(m))
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
      | Date
      | undefined;
    const lastRes = resv
      .map((r) => getReservationDate(r))
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
      | Date
      | undefined;
    let last: Date | undefined;
    if (lastMsg && lastRes) {
      last = lastMsg > lastRes ? lastMsg : lastRes;
    } else {
      last = lastMsg ?? lastRes;
    }
    map.set(id, {
      messageCount: Array.isArray(msgs) ? msgs.length : 0,
      reservationCount: Array.isArray(resv) ? resv.length : 0,
      lastActivity: last
        ? last.toISOString().slice(0, 10)
        : new Date(0).toISOString().slice(0, 10),
    });
  }
  const TOP_CUSTOMERS_LIMIT = 100;
  return Array.from(map.entries())
    .map(([wa_id, v]) => ({ wa_id, ...v }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, TOP_CUSTOMERS_LIMIT);
}
