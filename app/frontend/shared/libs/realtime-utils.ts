import { useRef } from "react";

// Regex patterns for time parsing - defined at top level for performance
const TIME_12HOUR_REGEX = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
const TIME_24HOUR_REGEX = /^(\d{2}):(\d{2})$/;
const TIME_24HOUR_FLEXIBLE_REGEX = /^(\d{1,2}):(\d{2})$/;

// Time conversion constants
const HOURS_IN_HALF_DAY = 12;
const MIDNIGHT_HOUR = 0;
const PADDING_WIDTH = 2;
const PADDING_CHAR = "0";
// Maximum time window (ms) for considering a calendar move as local
const LOCAL_MOVE_WINDOW_MS = 4000;

export type UpdateType =
  | "reservation_created"
  | "reservation_updated"
  | "reservation_cancelled"
  | "reservation_reinstated"
  | "conversation_new_message"
  | "vacation_period_updated"
  | "customer_updated"
  | "customer_deleted"
  | "customer_removed"
  | "customer_created"
  | "metrics_updated"
  | "snapshot"
  | "modify_reservation_ack"
  | "modify_reservation_nack";

export function normalizeTime12To24(
  time12?: string | null,
  fallback?: string
): string {
  try {
    const t = (time12 || "").trim();
    if (!t) {
      return fallback || "";
    }
    const m = TIME_12HOUR_REGEX.exec(t);
    if (!m) {
      return t;
    }
    let h = Number.parseInt(m[1] || "0", 10);
    const mm = m[2] || "00";
    const ap = (m[3] || "").toUpperCase();
    if (ap === "PM" && h < HOURS_IN_HALF_DAY) {
      h += HOURS_IN_HALF_DAY;
    }
    if (ap === "AM" && h === HOURS_IN_HALF_DAY) {
      h = MIDNIGHT_HOUR;
    }
    return `${String(h).padStart(PADDING_WIDTH, PADDING_CHAR)}:${mm}`;
  } catch {
    return fallback || "";
  }
}

export type LocalOpData = {
  id?: string | number;
  wa_id?: string;
  date?: string;
  time_slot?: string;
  time?: string;
  [key: string]: unknown;
};

/**
 * Generate local operation keys for marking/checking
 * Ensures consistent key generation between marking and checking logic
 * Generates all the same variants that buildLocalOpCandidates would check
 */
export function generateLocalOpKeys(
  type: string,
  params: {
    id?: string | number;
    wa_id?: string;
    date: string;
    time: string; // Time in 24-hour format (what services use)
  }
): string[] {
  const idPart = String(params?.id ?? "");
  const waPart = String(params?.wa_id ?? "");
  const datePart = String(params?.date ?? "");
  const time24 = String(params?.time ?? "");

  const keys = new Set<string>();

  // Generate the same variants that buildLocalOpCandidates would check
  // We need to cover both 12-hour and 24-hour formats since we don't know
  // what format the WebSocket message will have

  if (idPart) {
    keys.add(`${type}:${idPart}:${datePart}:${time24}`); // 24-hour format
    // Also try common 12-hour variants the backend might send
    if (TIME_24HOUR_REGEX.test(time24)) {
      const time12 = convertTo12Hour(time24);
      if (time12) {
        keys.add(`${type}:${idPart}:${datePart}:${time12}`);
      }
    }
  }
  if (waPart) {
    keys.add(`${type}:${waPart}:${datePart}:${time24}`); // 24-hour format
    // Also try common 12-hour variants the backend might send
    if (TIME_24HOUR_REGEX.test(time24)) {
      const time12 = convertTo12Hour(time24);
      if (time12) {
        keys.add(`${type}:${waPart}:${datePart}:${time12}`);
      }
    }
  }

  return Array.from(keys);
}

/**
 * Convert 24-hour time to 12-hour format
 */
function convertTo12Hour(time24: string): string | null {
  try {
    const match = TIME_24HOUR_FLEXIBLE_REGEX.exec(time24);
    if (!match) {
      return null;
    }

    let hour = Number.parseInt(match[1] || "0", 10);
    const minute = match[2] || "00";
    const ampm = hour >= HOURS_IN_HALF_DAY ? "PM" : "AM";

    if (hour === MIDNIGHT_HOUR) {
      hour = HOURS_IN_HALF_DAY;
    } else if (hour > HOURS_IN_HALF_DAY) {
      hour -= HOURS_IN_HALF_DAY;
    }

    return `${hour.toString().padStart(PADDING_WIDTH, PADDING_CHAR)}:${minute} ${ampm}`;
  } catch {
    return null;
  }
}

export function buildLocalOpCandidates(
  type: string,
  data: LocalOpData
): string[] {
  const idPart = String(data?.id ?? "");
  const waPart = String(data?.wa_id ?? "");
  const datePart = String(data?.date ?? "");
  const time12 = String(data?.time_slot ?? "");
  const time24 = normalizeTime12To24(time12, String(data?.time ?? ""));
  const cands = new Set<string>();

  // For conversation messages, use simpler key pattern since we know the format
  if (type === "conversation_new_message") {
    // Conversation messages always have time in 24-hour format
    const timeFromData = String(data?.time ?? "");
    if (waPart) {
      cands.add(`${type}:${waPart}:${datePart}:${timeFromData}`);
    }
    if (idPart) {
      cands.add(`${type}:${idPart}:${datePart}:${timeFromData}`);
    }
  } else if (type === "vacation_period_updated") {
    // Vacation updates have no id/wa_id/date/time, so the key is just the type with empty fields
    cands.add(`${type}:::`);
  } else {
    // For reservation operations, use the full variant logic
    cands.add(`${type}:${idPart}:${datePart}:${time12}`);
    cands.add(`${type}:${idPart}:${datePart}:${time24}`);
    cands.add(`${type}:${waPart}:${datePart}:${time12}`);
    cands.add(`${type}:${waPart}:${datePart}:${time24}`);
  }

  const candidatesArray = Array.from(cands);

  return candidatesArray;
}

export function isLocalOperation(type: string, data: LocalOpData): boolean {
  try {
    const candidates = buildLocalOpCandidates(type, data);
    (globalThis as { __localOps?: Set<string> }).__localOps =
      (globalThis as { __localOps?: Set<string> }).__localOps ||
      new Set<string>();

    const localOps = (globalThis as { __localOps?: Set<string> }).__localOps;

    for (const k of candidates) {
      if (localOps?.has(k)) {
        return true;
      }
    }
  } catch {
    // Local operation detection failed - continue to fallback
  }
  // Fallback: detect very recent local DnD moves tracked by calendar
  try {
    const moves: Map<string, number> | undefined = (
      globalThis as { __calendarLocalMoves?: Map<string, number> }
    ).__calendarLocalMoves;
    const ts1 = moves?.get(String(data?.id ?? ""));
    const ts2 = moves?.get(String(data?.wa_id ?? ""));
    const now = Date.now();
    if (
      (ts1 && now - ts1 < LOCAL_MOVE_WINDOW_MS) ||
      (ts2 && now - ts2 < LOCAL_MOVE_WINDOW_MS)
    ) {
      return true;
    }
  } catch {
    // Calendar move detection failed - operation not local
  }
  return false;
}

export function useDedupeKeyRef() {
  const ref = useRef<string>("");
  const isDuplicate = (type: string, data: LocalOpData): boolean => {
    const candidates = buildLocalOpCandidates(type, data);
    const key =
      candidates[0] ||
      `${type}:${String(data?.id ?? "")}:${String(data?.date ?? "")}:${String(data?.time_slot ?? "")}`;
    if (key && ref.current === key) {
      return true;
    }
    ref.current = key;
    return false;
  };
  return { isDuplicate };
}
