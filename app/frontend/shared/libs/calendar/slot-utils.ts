import {
  getSlotTimes,
  SLOT_DURATION_HOURS,
} from "@shared/libs/calendar/calendar-config";
import { to24h } from "@shared/libs/utils";

// Normalize a time to the start of its slot window for the given date
export function normalizeToSlotBase(dateStr: string, timeStr: string): string {
  try {
    const baseTime = to24h(String(timeStr || "00:00"));
    const baseParts = baseTime.split(":");
    const hh = Number.parseInt(String(baseParts[0] ?? "0"), 10);
    const mm = Number.parseInt(String(baseParts[1] ?? "0"), 10);
    const minutes =
      (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
    const day = new Date(`${dateStr}T00:00:00`);
    const res = getSlotTimes(day, false, "") || { slotMinTime: "00:00:00" };
    const TIME_PREFIX_LENGTH = 5;
    const slotMin = String(res.slotMinTime || "00:00:00").slice(
      0,
      TIME_PREFIX_LENGTH
    );
    const parts = slotMin.split(":");
    const sH = Number.parseInt(String(parts[0] ?? "0"), 10);
    const sM = Number.parseInt(String(parts[1] ?? "0"), 10);
    const minMinutes =
      (Number.isFinite(sH) ? sH : 0) * 60 + (Number.isFinite(sM) ? sM : 0);
    const DEFAULT_SLOT_HOURS = 2;
    const MIN_SLOT_MINUTES = 60;
    const duration = Math.max(
      MIN_SLOT_MINUTES,
      (SLOT_DURATION_HOURS || DEFAULT_SLOT_HOURS) * 60
    );
    const rel = Math.max(0, minutes - minMinutes);
    const slotIndex = Math.floor(rel / duration);
    const baseMinutes = minMinutes + slotIndex * duration;
    const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, "0");
    const mmOut = String(baseMinutes % 60).padStart(2, "0");
    return `${hhOut}:${mmOut}`;
  } catch {
    return to24h(String(timeStr || "00:00"));
  }
}
