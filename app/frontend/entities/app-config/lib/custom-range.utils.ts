import type { CustomCalendarRangeConfig } from "../types/app-config.types";

type RangeWithEndDate = Pick<CustomCalendarRangeConfig, "endDate"> & {
  endDate: string;
};

const startOfToday = (): Date => {
  const reference = new Date();
  reference.setHours(0, 0, 0, 0);
  return reference;
};

const parseDateOrNull = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const isRangeExpired = (
  range: RangeWithEndDate,
  referenceDate: Date
): boolean => {
  const endDate = parseDateOrNull(range.endDate);
  if (!endDate) {
    return false;
  }
  return endDate < referenceDate;
};

export const splitCustomRangesByExpiry = <T extends RangeWithEndDate>(
  ranges: T[],
  referenceDate: Date = startOfToday()
) => {
  const expired: T[] = [];
  const active: T[] = [];

  for (const range of ranges ?? []) {
    if (isRangeExpired(range, referenceDate)) {
      expired.push(range);
    } else {
      active.push(range);
    }
  }

  return { active, expired };
};

export const filterActiveCustomRanges = <T extends RangeWithEndDate>(
  ranges: T[],
  referenceDate: Date = startOfToday()
): T[] => splitCustomRangesByExpiry(ranges, referenceDate).active;

export const collectExpiredCustomRanges = <T extends RangeWithEndDate>(
  ranges: T[],
  referenceDate: Date = startOfToday()
): T[] => splitCustomRangesByExpiry(ranges, referenceDate).expired;

export const hasExpiredCustomRanges = (ranges: RangeWithEndDate[]): boolean =>
  collectExpiredCustomRanges(ranges).length > 0;
