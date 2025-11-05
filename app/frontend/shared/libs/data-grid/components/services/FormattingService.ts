const PERCENT_NORMALIZATION_FACTOR = 100;
const HALF_DAY_HOURS = 12;
const MIDNIGHT_HOUR = 0;
const AM_SUFFIX = "AM";
const PM_SUFFIX = "PM";
const ISO_TIME_PREFIX = "2000-01-01T";
const PERCENTAGE_FRACTION_DIGITS = 1;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;
const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;
const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;
const DAYS_PER_MONTH_APPROX = 30;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_YEAR_APPROX = 365;
const JUST_NOW_THRESHOLD_MINUTES = 1;
const DAYS_PER_WEEK = 7;
const SINGLE_DAY_OFFSET = 1;
const AM_PM_TIME_REGEX =
  /(?<hour>\d{1,2}):(?<minutes>\d{2})\s*(?<meridiem>AM|PM)/i;
const TWENTY_FOUR_HOUR_TIME_REGEX = /^(?<hour>\d{1,2}):(?<minutes>\d{2})$/;
const FLEXIBLE_TIME_REGEX =
  /(?<hour>\d{1,2}):(?<minutes>\d{2})\s*(?<meridiem>AM|PM)?/i;

/**
 * Format a value based on its column type and format specification
 */
export function formatValue(
  value: unknown,
  columnType: string,
  format: string
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  switch (columnType) {
    case "number":
    case "progress":
      return formatNumber(
        typeof value === "number" || typeof value === "string"
          ? (value as number | string)
          : String(value),
        format
      );
    case "date":
      return formatDate(
        value instanceof Date || typeof value === "string"
          ? (value as string | Date)
          : String(value),
        format
      );
    case "time":
      return formatTime(
        value instanceof Date || typeof value === "string"
          ? (value as string | Date)
          : String(value),
        format
      );
    case "datetime":
      return formatDateTime(
        value instanceof Date || typeof value === "string"
          ? (value as string | Date)
          : String(value),
        format
      );
    default:
      return String(value);
  }
}

// Provide a service-style named export for modules that import { FormattingService }
export const FormattingService = {
  formatValue,
};

function formatNumber(value: number | string, format: string): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) {
    return String(value);
  }

  switch (format) {
    case "automatic":
      return num.toLocaleString();
    case "localized":
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    case "plain":
      return String(num);
    case "compact":
      return new Intl.NumberFormat(undefined, {
        notation: "compact",
        compactDisplay: "short",
      }).format(num);
    case "dollar":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num);
    case "euro":
      return new Intl.NumberFormat("en-EU", {
        style: "currency",
        currency: "EUR",
      }).format(num);
    case "yen":
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(num);
    case "percent":
      return new Intl.NumberFormat(undefined, {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    case "scientific":
      return num.toExponential(2);
    case "percentage":
      return new Intl.NumberFormat(undefined, {
        style: "percent",
        minimumFractionDigits: PERCENTAGE_FRACTION_DIGITS,
        maximumFractionDigits: PERCENTAGE_FRACTION_DIGITS,
      }).format(num / PERCENT_NORMALIZATION_FACTOR);
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    case "accounting":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        currencySign: "accounting",
      }).format(num);
    default:
      return num.toLocaleString();
  }
}

function formatDate(value: string | Date, format: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  switch (format) {
    case "localized":
      // Jun 23, 2025
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    case "automatic":
      // ISO format: 2025-06-23
      return (
        date.toISOString().split("T")[0] || date.toLocaleDateString("en-GB")
      );
    case "distance":
      return formatRelativeTime(date);
    default:
      return date.toLocaleDateString("en-GB");
  }
}

function formatTime(value: string | Date, format: string): string {
  const date =
    value instanceof Date ? value : new Date(`${ISO_TIME_PREFIX}${value}`);
  if (Number.isNaN(date.getTime())) {
    // Try parsing with enhanced format handling
    return parseAndFormatTimeString(String(value), format);
  }

  switch (format) {
    case "localized":
      // 3:45 PM
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    case "automatic":
      // 24-hour format: 15:45
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
    default:
      return date.toLocaleTimeString();
  }
}

/**
 * Enhanced time string parsing and formatting
 * Handles various input formats including AM/PM, 24h, ISO strings
 */
function parseAndFormatTimeString(time: string, format?: string): string {
  if (!time) {
    return "";
  }

  // Handle ISO date strings
  if (time.includes("T")) {
    const date = new Date(time);
    if (!Number.isNaN(date.getTime())) {
      const hours = date.getHours();
      const minutes = date.getMinutes();

      if (format === "automatic") {
        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
      }
      const meridiem = hours >= HALF_DAY_HOURS ? PM_SUFFIX : AM_SUFFIX;
      const hour12 = hours % HALF_DAY_HOURS || HALF_DAY_HOURS;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
    }
  }

  // Normalize the time string
  const normalizedTime = time.trim().replace(/\s+/g, " ");

  // Handle AM/PM format
  if (
    normalizedTime.includes(AM_SUFFIX) ||
    normalizedTime.includes(PM_SUFFIX)
  ) {
    const match = normalizedTime.match(AM_PM_TIME_REGEX);
    const hourGroup = match?.groups?.hour;
    const minutesGroup = match?.groups?.minutes;
    const meridiemGroup = match?.groups?.meridiem;
    if (hourGroup && minutesGroup && meridiemGroup) {
      const hour = Number.parseInt(hourGroup, 10);
      const normalizedMeridiem = meridiemGroup.toUpperCase();

      if (format === "automatic") {
        let hour24 = hour;
        if (normalizedMeridiem === PM_SUFFIX && hour !== HALF_DAY_HOURS) {
          hour24 += HALF_DAY_HOURS;
        }
        if (normalizedMeridiem === AM_SUFFIX && hour === HALF_DAY_HOURS) {
          hour24 = MIDNIGHT_HOUR;
        }
        return `${hour24.toString().padStart(2, "0")}:${minutesGroup}`;
      }
      return `${hour}:${minutesGroup} ${normalizedMeridiem}`;
    }
  }

  // Handle 24h format
  const timeMatch = normalizedTime.match(TWENTY_FOUR_HOUR_TIME_REGEX);
  const hourGroup = timeMatch?.groups?.hour;
  const minutesGroup = timeMatch?.groups?.minutes;
  if (hourGroup && minutesGroup) {
    const hour = Number.parseInt(hourGroup, 10);

    if (format === "automatic") {
      return `${hour.toString().padStart(2, "0")}:${minutesGroup}`;
    }
    const meridiem = hour >= HALF_DAY_HOURS ? PM_SUFFIX : AM_SUFFIX;
    const hour12 = hour % HALF_DAY_HOURS || HALF_DAY_HOURS;
    return `${hour12}:${minutesGroup} ${meridiem}`;
  }

  return time;
}

/**
 * Parse formatted time string to hours and minutes
 */
export function parseFormattedTime(formattedTime: string): {
  hours: number;
  minutes: number;
} {
  let hours = 0;
  let minutes = 0;

  if (formattedTime) {
    const timeMatch = formattedTime.match(FLEXIBLE_TIME_REGEX);
    const hourGroup = timeMatch?.groups?.hour;
    const minutesGroup = timeMatch?.groups?.minutes;
    const meridiemGroup = timeMatch?.groups?.meridiem?.toUpperCase();
    if (hourGroup && minutesGroup) {
      hours = Number.parseInt(hourGroup, 10);
      minutes = Number.parseInt(minutesGroup, 10);

      if (meridiemGroup) {
        const isPm = meridiemGroup === PM_SUFFIX;
        if (isPm && hours !== HALF_DAY_HOURS) {
          hours += HALF_DAY_HOURS;
        }
        if (!isPm && meridiemGroup === AM_SUFFIX && hours === HALF_DAY_HOURS) {
          hours = MIDNIGHT_HOUR;
        }
      }
    }
  }

  return { hours, minutes };
}

function formatDateTime(value: string | Date, format: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  switch (format) {
    case "localized":
      // Jun 23, 2025 3:45 PM
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    case "automatic":
      // ISO format
      return date.toISOString();
    case "distance":
      return formatRelativeTime(date);
    case "calendar":
      return formatCalendarTime(date);
    default:
      return date.toLocaleString();
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / MS_PER_DAY);
  const diffHours = Math.round(diffMs / MS_PER_HOUR);
  const diffMinutes = Math.round(diffMs / MS_PER_MINUTE);

  if (Math.abs(diffMinutes) < JUST_NOW_THRESHOLD_MINUTES) {
    return "just now";
  }
  if (Math.abs(diffMinutes) < MINUTES_PER_HOUR) {
    return diffMinutes > 0
      ? `in ${diffMinutes} minutes`
      : `${-diffMinutes} minutes ago`;
  }
  if (Math.abs(diffHours) < HOURS_PER_DAY) {
    return diffHours > 0 ? `in ${diffHours} hours` : `${-diffHours} hours ago`;
  }
  if (Math.abs(diffDays) < DAYS_PER_MONTH_APPROX) {
    return diffDays > 0 ? `in ${diffDays} days` : `${-diffDays} days ago`;
  }

  const diffMonths = Math.round(diffDays / DAYS_PER_MONTH_APPROX);
  if (Math.abs(diffMonths) < MONTHS_PER_YEAR) {
    return diffMonths > 0
      ? `in ${diffMonths} months`
      : `${-diffMonths} months ago`;
  }

  const diffYears = Math.round(diffDays / DAYS_PER_YEAR_APPROX);
  return diffYears > 0 ? `in ${diffYears} years` : `${-diffYears} years ago`;
}

function formatCalendarTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (dateDay.getTime() - today.getTime()) / MS_PER_DAY
  );

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }
  if (diffDays === SINGLE_DAY_OFFSET) {
    return `Tomorrow at ${timeStr}`;
  }
  if (diffDays === -SINGLE_DAY_OFFSET) {
    return `Yesterday at ${timeStr}`;
  }
  if (diffDays > SINGLE_DAY_OFFSET && diffDays < DAYS_PER_WEEK) {
    const dayName = date.toLocaleDateString(undefined, { weekday: "long" });
    return `${dayName} at ${timeStr}`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
