import type { CalendarEvent } from "@/types/calendar";
import { to24h } from "./utils";

export interface ReservationProcessingOptions {
  freeRoam: boolean;
  isRTL: boolean;
  vacationPeriods: Array<{ start: string | Date; end: string | Date }>;
}

export function getReservationEventProcessor() {
  return {
    generateCalendarEvents(
      reservationsByUser: Record<string, any[]>,
      conversationsByUser: Record<string, any[]>,
      options: ReservationProcessingOptions,
    ): CalendarEvent[] {
      if (!reservationsByUser || typeof reservationsByUser !== "object") return [];

      const events: CalendarEvent[] = [];
      const today = new Date();

      // Build reservation events grouped by date+time, sequential within slot
      const groupMap: Record<string, Array<{ waId: string; r: any }>> = {};
      Object.entries(reservationsByUser).forEach(([waId, list]) => {
        (list || []).forEach((r) => {
          const dateStr = r.date;
          const timeStr = r.time_slot;
          if (!dateStr || !timeStr) return;
          const key = `${dateStr}_${timeStr}`;
          if (!groupMap[key]) groupMap[key] = [];
          groupMap[key].push({ waId, r });
        });
      });

      // Sort each group by type then name
      Object.values(groupMap).forEach((arr) => {
        arr.sort((a, b) => {
          const t1 = Number(a.r.type ?? 0);
          const t2 = Number(b.r.type ?? 0);
          if (t1 !== t2) return t1 - t2;
          const n1 = a.r.customer_name || "";
          const n2 = b.r.customer_name || "";
          return n1.localeCompare(n2);
        });
      });

      // Build events spaced within the 2-hour slot
      const slotMinutes = 120;
      const perSlot = 6;

      Object.entries(groupMap).forEach(([key, arr]) => {
        let offsetMinutes = 0;
        arr.forEach(({ waId, r }) => {
          try {
            const baseDate = String(r.date);
            const baseTime = to24h(r.time_slot);

            // Compute start/end times purely via string arithmetic to avoid timezone shifts
            const startTime = addMinutesToClock(baseTime, Math.floor(offsetMinutes));
            const endTime = addMinutesToClock(
              baseTime,
              Math.floor(offsetMinutes + slotMinutes / perSlot),
            );
            offsetMinutes += slotMinutes / perSlot;

            // Determine past-ness using local date-only comparison
            const startComparable = new Date(`${baseDate}T${startTime}`);
            const isPast = startComparable < today;
            const cancelled = Boolean(r.cancelled);
            const type = Number(r.type ?? 0);

            const isConversation = type === 2;
            events.push({
              id: String(r.id ?? waId),
              title: r.customer_name ?? String(waId),
              // Emit timezone-naive strings; FullCalendar interprets them in configured timeZone
              start: `${baseDate}T${startTime}`,
              end: `${baseDate}T${endTime}`,
              backgroundColor: cancelled ? "#e5e1e0" : type === 0 ? "#4caf50" : "#3688d8",
              borderColor: cancelled ? "#e5e1e0" : type === 0 ? "#4caf50" : "#3688d8",
              textColor: cancelled ? "#908584" : undefined,
              // Allow dragging for reservations even if moved to past; backend will validate
              editable: !isConversation && !cancelled,
              extendedProps: { type, cancelled, waId },
            });
          } catch {
            // skip bad rows
          }
        });
      });

      // In freeRoam, add conversation markers as non-editable events using last message timestamp
      if (options.freeRoam && conversationsByUser) {
        Object.entries(conversationsByUser).forEach(([waId, conv]) => {
          if (!Array.isArray(conv) || conv.length === 0) return;
          const last = conv[conv.length - 1];
          if (!last?.date) return;
          const baseDate = String(last.date);
          const baseTime = to24h(last.time || "00:00");
          const startTime = `${baseTime}:00`;
          const endTime = addMinutesToClock(baseTime, Math.floor(120 / 6));
          const convArr: any[] = Array.isArray(conversationsByUser?.[waId]) ? (conversationsByUser as any)[waId] : [];
          const convName = convArr.find((m: any) => m?.customer_name)?.customer_name;
          events.push({
            id: String(waId),
            title: convName ? `Conversation - ${convName}` : `Conversation - ${waId}`,
            start: `${baseDate}T${startTime}`,
            end: `${baseDate}T${endTime}`,
            backgroundColor: "#EDAE49",
            borderColor: "#EDAE49",
            editable: false,
            extendedProps: { type: 2, cancelled: false },
          });
        });
      }

      return events;
    },
  };
}

function cryptoRandom(): string {
  try {
    // Browsers
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return `${arr[0].toString(16)}${arr[1].toString(16)}`;
  } catch {
    // Fallback
    return Math.random().toString(16).slice(2);
  }
}

// Add minutes to an HH:MM clock string and return HH:MM:SS (no timezone)
function addMinutesToClock(baseTime: string, minutesToAdd: number): string {
  try {
    const [h, m] = baseTime.split(":").map((v) => parseInt(v, 10));
    let total = h * 60 + (Number.isFinite(m) ? m : 0) + minutesToAdd;
    // Clamp within the day
    if (total < 0) total = 0;
    if (total > 24 * 60 - 1) total = 24 * 60 - 1;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:00`;
  } catch {
    return `${baseTime}:00`;
  }
}


