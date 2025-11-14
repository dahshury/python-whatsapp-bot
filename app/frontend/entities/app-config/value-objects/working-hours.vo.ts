import {
  MAX_DAY_OF_WEEK,
  MIN_DAY_OF_WEEK,
} from "@/shared/constants/days-of-week";
import { ValueObject } from "@/shared/domain";
import type { WorkingHoursConfig } from "../types/app-config.types";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalizeDays = (days: number[]): number[] => {
  const unique = Array.from(new Set(days)).filter(
    (day) =>
      Number.isInteger(day) && day >= MIN_DAY_OF_WEEK && day <= MAX_DAY_OF_WEEK
  );
  return unique.sort((a, b) => a - b);
};

export class WorkingHoursVO extends ValueObject<WorkingHoursConfig> {
  constructor(value: WorkingHoursConfig) {
    super({
      ...value,
      daysOfWeek: normalizeDays(value.daysOfWeek),
      startTime: value.startTime.trim(),
      endTime: value.endTime.trim(),
    });
  }

  static forDay(value: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }): WorkingHoursVO {
    return new WorkingHoursVO({
      daysOfWeek: [value.dayOfWeek],
      startTime: value.startTime,
      endTime: value.endTime,
    });
  }

  protected validate(value: WorkingHoursConfig): void {
    if (!Array.isArray(value.daysOfWeek) || value.daysOfWeek.length === 0) {
      throw new Error("Working hours require at least one day of week");
    }
    if (!(TIME_REGEX.test(value.startTime) && TIME_REGEX.test(value.endTime))) {
      throw new Error("Working hours must use HH:MM format");
    }
    if (value.startTime >= value.endTime) {
      throw new Error("Working hours start time must be before end time");
    }
  }
}
