import type { DateRestrictions } from "@shared/libs/date/date-restrictions";
import type { TempusFormat, TempusTheme } from "./tempus-dominus.types";

const MINUTES_PER_HOUR = 60;
const DEFAULT_STEPPING_MINUTES = 120;

export type BuildOptionsParams = {
  format: TempusFormat;
  restrictions: DateRestrictions;
  theme: TempusTheme;
  locale?: string; // default en-GB
  steppingMinutes?: number; // default from env or 120
};

export function getDefaultStepping(): number {
  try {
    const env = process.env.NEXT_PUBLIC_SLOT_DURATION_HOURS;
    const parsed = env !== undefined ? Number(env) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? Math.max(1, Math.floor(parsed * MINUTES_PER_HOUR))
      : DEFAULT_STEPPING_MINUTES;
  } catch {
    return DEFAULT_STEPPING_MINUTES;
  }
}

export function buildTempusDominusOptions({
  format,
  restrictions,
  theme,
  locale = "en-GB",
  steppingMinutes,
}: BuildOptionsParams) {
  const isTime = format === "time";
  const isDate = format === "date";

  const components = {
    calendar: !isTime,
    date: !isTime,
    month: !isTime,
    year: !isTime,
    decades: !isTime,
    clock: !isDate,
    hours: !isDate,
    minutes: !isDate,
    seconds: false,
  };

  let formatString: string;
  if (isTime) {
    formatString = "hh:mm A";
  } else if (isDate) {
    formatString = "dd/MM/yyyy";
  } else {
    formatString = "dd/MM/yyyy hh:mm A";
  }

  const options = {
    display: {
      components,
      theme,
      buttons: { today: true, clear: false, close: false },
      placement: "bottom" as const,
      keepOpen: true,
      icons: {
        type: "icons",
        time: "fas fa-clock",
        date: "fas fa-calendar",
        up: "fas fa-arrow-up",
        down: "fas fa-arrow-down",
        previous: "fas fa-chevron-left",
        next: "fas fa-chevron-right",
        today: "fas fa-calendar-day",
        clear: "fas fa-trash",
        close: "fas fa-times",
      },
    },
    restrictions: {
      ...(restrictions.minDate && { minDate: restrictions.minDate }),
      ...(restrictions.maxDate && { maxDate: restrictions.maxDate }),
      ...(restrictions.disabledDates && {
        disabledDates: restrictions.disabledDates,
      }),
      ...(restrictions.daysOfWeekDisabled && {
        daysOfWeekDisabled: restrictions.daysOfWeekDisabled,
      }),
      ...(restrictions.enabledHours && {
        enabledHours: restrictions.enabledHours,
      }),
    },
    localization: {
      locale,
      format: formatString,
      hourCycle: "h12" as const,
    },
    container: undefined as undefined | HTMLElement,
    stepping: steppingMinutes ?? getDefaultStepping(),
  };

  if (typeof document !== "undefined") {
    options.container = document.body as HTMLElement;
  }

  return options as unknown as import("./tempus-dominus.types").TempusDominusOptions;
}
