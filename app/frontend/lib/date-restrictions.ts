import type { VacationPeriod } from "./vacation-context";

export interface DateRestrictions {
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  daysOfWeekDisabled?: number[];
  enabledHours?: number[];
}

export function getDateRestrictions(
  vacationPeriods: VacationPeriod[],
  freeRoam: boolean,
  baseDate?: Date,
): DateRestrictions {
  if (freeRoam) return {};
  const disabledDates: Date[] = [];
  for (const vp of vacationPeriods) {
    const d = new Date(vp.start);
    while (d <= vp.end) {
      disabledDates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
  }
  return { disabledDates };
}

export function formatForTempusDominus(r: DateRestrictions) {
  return r;
}

