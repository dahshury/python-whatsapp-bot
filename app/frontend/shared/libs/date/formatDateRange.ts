import { formatHijriDate } from "@shared/libs/date/hijri-utils";

export type DateRange = {
  start: string;
  end?: string | null;
};

const MS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;
const HOUR_MS = MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND;

export function formatDateRange(
  selectedDateRange: DateRange | null | undefined,
  isLocalized: boolean,
  slotDurationHours: number
): string {
  if (!selectedDateRange) {
    return "";
  }

  const startDate = new Date(selectedDateRange.start);
  const endDate = selectedDateRange.end
    ? new Date(selectedDateRange.end)
    : null;
  const hasTimeInfo = selectedDateRange.start.includes("T");

  if (isLocalized) {
    let computedEnd: Date | undefined;
    if (
      hasTimeInfo &&
      (!endDate || endDate.getTime() === startDate.getTime())
    ) {
      computedEnd = new Date(startDate.getTime() + slotDurationHours * HOUR_MS);
    } else {
      computedEnd = endDate || undefined;
    }

    const dayOptions: Intl.DateTimeFormatOptions = { weekday: "long" };
    const startDayName = startDate.toLocaleDateString("ar-SA", dayOptions);
    const isSameCalendarDay =
      computedEnd &&
      startDate.getFullYear() === computedEnd.getFullYear() &&
      startDate.getMonth() === computedEnd.getMonth() &&
      startDate.getDate() === computedEnd.getDate();

    if (hasTimeInfo && computedEnd && isSameCalendarDay) {
      const dateStr = formatHijriDate(startDate);
      const startTimeStr = startDate.toLocaleTimeString("ar-SA", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTimeStr = computedEnd.toLocaleTimeString("ar-SA", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${startDayName}, ${dateStr} ${startTimeStr} - ${endTimeStr}`;
    }

    if (!computedEnd || isSameCalendarDay) {
      return `${startDayName}, ${formatHijriDate(startDate)}`;
    }
    const endDayName = computedEnd.toLocaleDateString("ar-SA", dayOptions);
    return `${startDayName}, ${formatHijriDate(startDate)} - ${endDayName}, ${formatHijriDate(computedEnd)}`;
  }

  if (hasTimeInfo) {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const dayOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
    };

    const startDayName = startDate.toLocaleDateString(undefined, dayOptions);
    const startDateStr = startDate.toLocaleDateString(undefined, dateOptions);
    const startTimeStr = startDate.toLocaleTimeString(undefined, timeOptions);

    let computedEnd: Date | null = null;
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      computedEnd = endDate;
    } else {
      computedEnd = new Date(startDate.getTime() + slotDurationHours * HOUR_MS);
    }

    const endDateStr = computedEnd.toLocaleDateString(undefined, dateOptions);
    const endTimeStr = computedEnd.toLocaleTimeString(undefined, timeOptions);

    if (startDateStr !== endDateStr) {
      const endDayName = computedEnd.toLocaleDateString(undefined, dayOptions);
      return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endDayName}, ${endDateStr} ${endTimeStr}`;
    }
    return `${startDayName}, ${startDateStr} ${startTimeStr} - ${endTimeStr}`;
  }

  const dayOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
  };
  const startDayName = startDate.toLocaleDateString(undefined, dayOptions);

  if (endDate && startDate.toDateString() !== endDate.toDateString()) {
    const endDayName = endDate.toLocaleDateString(undefined, dayOptions);
    return `${startDayName}, ${startDate.toLocaleDateString()} - ${endDayName}, ${endDate.toLocaleDateString()}`;
  }
  return `${startDayName}, ${startDate.toLocaleDateString()}`;
}
