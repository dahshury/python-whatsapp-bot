export type ActiveRange = { fromDate?: string; toDate?: string } | undefined;
export const MILLISECONDS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const ONE_DAY_MS =
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND;
export const END_OF_DAY_HOUR = HOURS_PER_DAY - 1;
export const END_OF_DAY_MINUTE = MINUTES_PER_HOUR - 1;
export const END_OF_DAY_SECOND = SECONDS_PER_MINUTE - 1;
export const END_OF_DAY_MS = MILLISECONDS_PER_SECOND - 1;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    END_OF_DAY_HOUR,
    END_OF_DAY_MINUTE,
    END_OF_DAY_SECOND,
    END_OF_DAY_MS
  );
}

function differenceInDaysInclusive(from: Date, to: Date): number {
  const fromStart = startOfDay(from).getTime();
  const toEnd = endOfDay(to).getTime();
  return Math.max(1, Math.floor((toEnd - fromStart) / ONE_DAY_MS) + 1);
}

export function isWithinRange(
  d: Date | null,
  activeRange?: ActiveRange
): boolean {
  if (!d) {
    return false;
  }
  const from = activeRange?.fromDate ? new Date(activeRange.fromDate) : null;
  const to = activeRange?.toDate ? new Date(activeRange.toDate) : null;
  if (from) {
    const f = startOfDay(from);
    if (d < f) {
      return false;
    }
  }
  if (to) {
    const t = endOfDay(to);
    if (d > t) {
      return false;
    }
  }
  return true;
}

export function computePreviousRange(
  activeRange?: ActiveRange
): { prevFrom: Date; prevTo: Date } | null {
  const fromStr = activeRange?.fromDate;
  const toStr = activeRange?.toDate;
  if (!fromStr) {
    return null;
  }
  if (!toStr) {
    return null;
  }
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const days = differenceInDaysInclusive(from, to);
  const prevTo = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() - 1
  );
  const prevFrom = new Date(
    prevTo.getFullYear(),
    prevTo.getMonth(),
    prevTo.getDate() - (days - 1)
  );
  return { prevFrom, prevTo };
}

export function isWithinPrevRange(
  d: Date | null,
  activeRange?: ActiveRange
): boolean {
  if (!d) {
    return false;
  }
  const prev = computePreviousRange(activeRange);
  if (!prev) {
    return false;
  }
  const f = startOfDay(prev.prevFrom);
  const t = endOfDay(prev.prevTo);
  if (d < f) {
    return false;
  }
  if (d > t) {
    return false;
  }
  return true;
}
