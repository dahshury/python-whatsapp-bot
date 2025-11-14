import type {
  AppConfig,
  AppConfigSnapshot,
  AppConfigUpdateInput,
  ColumnConfig,
  CustomCalendarRangeConfig,
} from "@/entities/app-config";
import { CountryCodeVO } from "@/entities/app-config/value-objects";
import { DEFAULT_WORKING_DAYS } from "@/shared/constants/days-of-week";
import type { AppConfig as LegacyAppConfig } from "@/shared/services/config-service";

const DEFAULT_COLUMN_WIDTH = 150;

const createTempId = (() => {
  let counter = 0;
  return (prefix: string) => {
    const id = `${prefix}-${Date.now()}-${counter}`;
    counter += 1;
    return id;
  };
})();

export type WorkingHoursFormValue = {
  startTime: string;
  endTime: string;
};

export type DaySpecificWorkingHoursFormValue = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type DaySpecificSlotDurationFormValue = {
  id: string;
  dayOfWeek: number;
  slotDurationHours: number;
};

export type CustomCalendarRangeFormValue = CustomCalendarRangeConfig & {
  id: string;
};

export type ColumnFormValue = ColumnConfig & {
  id: string;
};

export type AppConfigFormValues = {
  workingDays: number[];
  defaultWorkingHours: WorkingHoursFormValue;
  daySpecificWorkingHours: DaySpecificWorkingHoursFormValue[];
  slotDurationHours: number;
  daySpecificSlotDurations: DaySpecificSlotDurationFormValue[];
  customCalendarRanges: CustomCalendarRangeFormValue[];
  calendarColumns: ColumnFormValue[];
  documentsColumns: ColumnFormValue[];
  defaultCountryPrefix: string;
  availableLanguages: string[];
  timezone: string;
  llmProvider: string;
};

const cloneRange = (
  range: CustomCalendarRangeConfig
): CustomCalendarRangeFormValue => ({
  ...range,
  id: createTempId(`range-${range.name}`),
  workingDays: [...range.workingDays],
});

const cloneColumn = (column: ColumnConfig): ColumnFormValue => ({
  ...column,
  id: column.id || createTempId("column"),
  metadata: column.metadata ? { ...column.metadata } : null,
});

const normalizeSnapshot = (snapshot: AppConfigSnapshot) => ({
  ...snapshot,
  workingDays: [...snapshot.workingDays],
  customCalendarRanges: snapshot.customCalendarRanges.map(cloneRange),
  calendarColumns: snapshot.calendarColumns.map(cloneColumn),
  documentsColumns: snapshot.documentsColumns.map(cloneColumn),
});

export const createDefaultColumn = (
  overrides?: Partial<ColumnConfig>
): ColumnFormValue =>
  cloneColumn({
    id: overrides?.id ?? createTempId("column"),
    name: overrides?.name ?? "new_column",
    title: overrides?.title ?? "New Column",
    dataType: overrides?.dataType ?? "text",
    isEditable: overrides?.isEditable ?? true,
    isRequired: overrides?.isRequired ?? false,
    width: overrides?.width ?? DEFAULT_COLUMN_WIDTH,
    metadata: overrides?.metadata ?? null,
  });

export const createDefaultCustomRange = (
  overrides?: Partial<CustomCalendarRangeConfig>
): CustomCalendarRangeFormValue => {
  const today = new Date().toISOString().split("T");
  const todayDate = today[0] ?? "";
  return cloneRange({
    name: overrides?.name ?? "Custom Range",
    startDate: overrides?.startDate ?? todayDate,
    endDate: overrides?.endDate ?? todayDate,
    workingDays: overrides?.workingDays ?? DEFAULT_WORKING_DAYS,
    startTime: overrides?.startTime ?? "10:00",
    endTime: overrides?.endTime ?? "16:00",
    slotDurationHours: overrides?.slotDurationHours ?? null,
  });
};

export const createDefaultAppConfigFormValues = (): AppConfigFormValues => ({
  workingDays: DEFAULT_WORKING_DAYS,
  defaultWorkingHours: {
    startTime: "11:00",
    endTime: "17:00",
  },
  daySpecificWorkingHours: [],
  slotDurationHours: 2,
  daySpecificSlotDurations: [],
  customCalendarRanges: [],
  calendarColumns: [],
  documentsColumns: [],
  defaultCountryPrefix: "SA",
  availableLanguages: ["en", "ar"],
  timezone: "Asia/Riyadh",
  llmProvider: "openai",
});

export const createAppConfigFormValues = (
  config: AppConfig
): AppConfigFormValues => {
  const snapshot = normalizeSnapshot(config.toSnapshot());

  return {
    workingDays: snapshot.workingDays,
    defaultWorkingHours: {
      startTime: snapshot.defaultWorkingHours.startTime,
      endTime: snapshot.defaultWorkingHours.endTime,
    },
    daySpecificWorkingHours: snapshot.daySpecificWorkingHours.map((hours) => ({
      id: createTempId(`day-hours-${hours.dayOfWeek}`),
      dayOfWeek: hours.dayOfWeek,
      startTime: hours.startTime,
      endTime: hours.endTime,
    })),
    slotDurationHours: snapshot.slotDurationHours,
    daySpecificSlotDurations: snapshot.daySpecificSlotDurations.map((slot) => ({
      id: createTempId(`day-slot-${slot.dayOfWeek}`),
      dayOfWeek: slot.dayOfWeek,
      slotDurationHours: slot.slotDurationHours,
    })),
    customCalendarRanges: snapshot.customCalendarRanges,
    calendarColumns: snapshot.calendarColumns,
    documentsColumns: snapshot.documentsColumns,
    defaultCountryPrefix: CountryCodeVO.fromUnknown(
      snapshot.defaultCountryPrefix
    ).value,
    availableLanguages: [...snapshot.availableLanguages],
    timezone: snapshot.timezone,
    llmProvider: snapshot.llmProvider,
  };
};

export const mapFormValuesToUpdateInput = (
  values: AppConfigFormValues
): AppConfigUpdateInput => ({
  workingDays: values.workingDays,
  defaultWorkingHours: {
    daysOfWeek: values.workingDays.filter((day) =>
      values.daySpecificWorkingHours.every((d) => d.dayOfWeek !== day)
    ),
    startTime: values.defaultWorkingHours.startTime,
    endTime: values.defaultWorkingHours.endTime,
  },
  daySpecificWorkingHours: values.daySpecificWorkingHours.map((entry) => ({
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
  })),
  slotDurationHours: values.slotDurationHours,
  daySpecificSlotDurations: values.daySpecificSlotDurations.map((entry) => ({
    dayOfWeek: entry.dayOfWeek,
    slotDurationHours: entry.slotDurationHours,
  })),
  customCalendarRanges: values.customCalendarRanges.map((range) => ({
    name: range.name,
    startDate: range.startDate,
    endDate: range.endDate,
    workingDays: range.workingDays,
    startTime: range.startTime,
    endTime: range.endTime,
    slotDurationHours: range.slotDurationHours ?? null,
  })),
  calendarColumns: values.calendarColumns.map((column) => ({
    ...column,
    metadata: column.metadata ?? null,
  })),
  documentsColumns: values.documentsColumns.map((column) => ({
    ...column,
    metadata: column.metadata ?? null,
  })),
  defaultCountryPrefix: CountryCodeVO.fromUnknown(values.defaultCountryPrefix)
    .value,
  availableLanguages: values.availableLanguages,
  timezone: values.timezone,
  llmProvider: values.llmProvider,
});

export const snapshotToLegacyConfig = (
  snapshot: AppConfigSnapshot
): LegacyAppConfig => ({
  id: snapshot.id,
  working_days: snapshot.workingDays,
  default_working_hours: {
    days_of_week: snapshot.defaultWorkingHours.daysOfWeek,
    start_time: snapshot.defaultWorkingHours.startTime,
    end_time: snapshot.defaultWorkingHours.endTime,
  },
  day_specific_hours: snapshot.daySpecificWorkingHours.map((hours) => ({
    day_of_week: hours.dayOfWeek,
    start_time: hours.startTime,
    end_time: hours.endTime,
  })),
  slot_duration_hours: snapshot.slotDurationHours,
  day_specific_slot_durations: snapshot.daySpecificSlotDurations.map(
    (slot) => ({
      day_of_week: slot.dayOfWeek,
      slot_duration_hours: slot.slotDurationHours,
    })
  ),
  custom_calendar_ranges: snapshot.customCalendarRanges.map((range) => ({
    name: range.name,
    start_date: range.startDate,
    end_date: range.endDate,
    working_days: range.workingDays,
    start_time: range.startTime,
    end_time: range.endTime,
    slot_duration_hours: range.slotDurationHours ?? null,
  })),
  calendar_columns: snapshot.calendarColumns.map((column) => ({
    id: column.id,
    name: column.name,
    title: column.title,
    data_type: column.dataType,
    is_editable: column.isEditable,
    is_required: column.isRequired,
    width: column.width ?? null,
    metadata: column.metadata ?? null,
  })),
  documents_columns: snapshot.documentsColumns.map((column) => ({
    id: column.id,
    name: column.name,
    title: column.title,
    data_type: column.dataType,
    is_editable: column.isEditable,
    is_required: column.isRequired,
    width: column.width ?? null,
    metadata: column.metadata ?? null,
  })),
  default_country_prefix: snapshot.defaultCountryPrefix,
  available_languages: snapshot.availableLanguages,
  created_at: snapshot.createdAt,
  updated_at: snapshot.updatedAt,
});
