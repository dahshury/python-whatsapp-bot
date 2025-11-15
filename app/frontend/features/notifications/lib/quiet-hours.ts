const FALSE_FLAG = false;

// Time validation constants
const MAX_HOUR = 23;
const MAX_MINUTE = 59;

type QuietHours =
  | {
      start: string | null | undefined;
      end: string | null | undefined;
    }
  | null
  | undefined;

const MINUTES_PER_DAY = 24 * 60;

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string) {
  if (!timeFormatterCache.has(timezone)) {
    timeFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
  const formatter = timeFormatterCache.get(timezone);
  if (!formatter) {
    throw new Error(`Failed to create formatter for timezone: ${timezone}`);
  }
  return formatter;
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > MAX_HOUR ||
    minute < 0 ||
    minute > MAX_MINUTE
  ) {
    return null;
  }
  return hour * 60 + minute;
}

function getCurrentMinutesInTimezone(timezone: string): number {
  try {
    const formatter = getFormatter(timezone);
    const parts = formatter.formatToParts(new Date());
    const hour = Number(
      parts.find((p) => p.type === "hour")?.value ?? new Date().getUTCHours()
    );
    const minute = Number(
      parts.find((p) => p.type === "minute")?.value ??
        new Date().getUTCMinutes()
    );
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
    return hour * 60 + minute;
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
}

export function isWithinQuietHours(
  quietHours: QuietHours,
  timezone: string
): boolean {
  if (!quietHours) {
    return FALSE_FLAG;
  }
  const startMinutes = parseTimeToMinutes(quietHours.start);
  const endMinutes = parseTimeToMinutes(quietHours.end);
  if (startMinutes === null || endMinutes === null) {
    return FALSE_FLAG;
  }
  if (startMinutes === endMinutes) {
    return FALSE_FLAG;
  }
  const nowMinutes = getCurrentMinutesInTimezone(timezone || "UTC");
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Window crosses midnight
  return (
    nowMinutes >= startMinutes || nowMinutes < endMinutes % MINUTES_PER_DAY
  );
}
