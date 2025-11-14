import { splitCustomRangesByExpiry } from "../lib/custom-range.utils";
import type { AppConfigSnapshot } from "../types/app-config.types";
import {
  ColumnConfigVO,
  CountryCodeVO,
  LanguageListVO,
  LlmProviderVO,
  SlotDurationVO,
  TimezoneVO,
  WorkingHoursVO,
} from "../value-objects";
import { AppConfig } from "./app-config.domain";

const cloneRanges = (ranges: AppConfigSnapshot["customCalendarRanges"]) =>
  ranges.map((range) => ({ ...range }));

export function createAppConfig(snapshot: AppConfigSnapshot): AppConfig {
  const { active: activeRanges, expired: expiredRanges } =
    splitCustomRangesByExpiry(snapshot.customCalendarRanges);

  return new AppConfig({
    id: snapshot.id,
    workingDays: [...snapshot.workingDays],
    defaultWorkingHours: new WorkingHoursVO(snapshot.defaultWorkingHours),
    daySpecificWorkingHours: snapshot.daySpecificWorkingHours.map((hours) =>
      WorkingHoursVO.forDay(hours)
    ),
    slotDuration: new SlotDurationVO({
      hours: snapshot.slotDurationHours,
    }),
    daySpecificSlotDurations: snapshot.daySpecificSlotDurations.map((slot) =>
      SlotDurationVO.forDay({
        dayOfWeek: slot.dayOfWeek,
        hours: slot.slotDurationHours,
      })
    ),
    customCalendarRanges: cloneRanges(activeRanges),
    expiredCustomRanges: cloneRanges(expiredRanges),
    calendarColumns: snapshot.calendarColumns.map(
      (column) => new ColumnConfigVO(column)
    ),
    documentsColumns: snapshot.documentsColumns.map(
      (column) => new ColumnConfigVO(column)
    ),
    defaultCountry: CountryCodeVO.fromUnknown(
      snapshot.defaultCountryPrefix ?? "SA"
    ),
    availableLanguages: LanguageListVO.fromUnknown(snapshot.availableLanguages),
    timezone: TimezoneVO.fromUnknown(snapshot.timezone),
    llmProvider: LlmProviderVO.fromUnknown(snapshot.llmProvider),
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  });
}

export function mergeAppConfig(
  config: AppConfig,
  patch: Partial<AppConfigSnapshot>
): AppConfig {
  return createAppConfig({
    ...config.toSnapshot(),
    ...patch,
  });
}

// Legacy export for backward compatibility
export const AppConfigFactory = {
  create: createAppConfig,
  merge: mergeAppConfig,
};
