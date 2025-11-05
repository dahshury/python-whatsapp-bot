// Time format constants
const TIME_HHMM_LENGTH = 5;
const TIME_SECONDS_SUFFIX = ":00";

// Regex pattern for time format validation (HH:MM or HH:MM:SS)
const TIME_FORMAT_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

export function normalizeTimeToHHmm(t?: string | null): string {
  try {
    if (!t) {
      return "";
    }
    const s = String(t);
    return s.length >= TIME_HHMM_LENGTH ? s.slice(0, TIME_HHMM_LENGTH) : s;
  } catch {
    return String(t || "");
  }
}

export function formatMessageTimestamp(
  dateStr?: string,
  timeStr?: string,
  locale = "en-US"
): string {
  try {
    const datePart = typeof dateStr === "string" ? dateStr.trim() : "";
    const timePartRaw = typeof timeStr === "string" ? timeStr.trim() : "";
    if (!(datePart || timePartRaw)) {
      return "";
    }

    // Build ISO-like string when possible
    if (datePart) {
      let t = timePartRaw;
      if (t && TIME_FORMAT_REGEX.test(t)) {
        if (t.length === TIME_HHMM_LENGTH) {
          t = `${t}${TIME_SECONDS_SUFFIX}`;
        }
        const iso = `${datePart}T${t}`;
        const d = new Date(iso);
        if (!Number.isNaN(d.getTime())) {
          const dayName = d.toLocaleDateString(locale, { weekday: "short" });
          const formattedDate = d.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          });
          const formattedTime = d.toLocaleTimeString(locale, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          return `${dayName}, ${formattedDate}${timePartRaw ? ` • ${formattedTime}` : ""}`;
        }
      } else {
        // If time is missing or invalid, try midnight for date-only
        const d = new Date(`${datePart}T00:00:00`);
        if (!Number.isNaN(d.getTime())) {
          const dayName = d.toLocaleDateString(locale, { weekday: "short" });
          const formattedDate = d.toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          });
          return `${dayName}, ${formattedDate}`;
        }
      }
    }

    // Fallback to raw values without producing "Invalid Date"
    const dateLabel = datePart || "Unknown date";
    const timeLabel = timePartRaw || "";
    return timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;
  } catch {
    const dateLabel = dateStr || "Unknown date";
    const timeLabel = timeStr || "";
    return timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;
  }
}
