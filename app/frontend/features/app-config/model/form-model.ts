import type {
  AppConfig,
  AppConfigSnapshot,
  AppConfigUpdateInput,
  ColumnConfig,
  CustomCalendarRangeConfig,
  EventColorConfig,
  EventLoadingConfig,
  EventTimeFormatConfig,
  EventTypeColorConfig,
  NotificationPreferencesConfig,
} from "@/entities/app-config";
import { CountryCodeVO } from "@/entities/app-config/value-objects";
import {
  DOCUMENT_EVENT_STROKE_COLOR,
  EVENT_TYPE_COLOR_DEFAULTS,
} from "@/shared/constants/calendar-colors";
import { DEFAULT_WORKING_DAYS } from "@/shared/constants/days-of-week";
import type { AppConfig as LegacyAppConfig } from "@/shared/services/config-service";

// Calendar configuration constants
const DEFAULT_CALENDAR_FIRST_DAY = 6; // Saturday (0 = Sunday, 6 = Saturday)

const createTempId = (() => {
  let counter = 0;
  return (prefix: string) => {
    const id = `${prefix}-${Date.now()}-${counter}`;
    counter += 1;
    return id;
  };
})();

type EventTypeColorKey = keyof typeof EVENT_TYPE_COLOR_DEFAULTS;

const CONVERSATION_TYPE_KEY: EventTypeColorKey = "2";

const createDefaultEventColors = (): EventColorConfig => ({
  defaultEventColor:
    EVENT_TYPE_COLOR_DEFAULTS[CONVERSATION_TYPE_KEY].background,
  eventColorByType: {
    "0": EVENT_TYPE_COLOR_DEFAULTS["0"],
    "1": EVENT_TYPE_COLOR_DEFAULTS["1"],
    "2": EVENT_TYPE_COLOR_DEFAULTS["2"],
  },
  useEventColors: true,
  eventColorByStatus: null,
  eventColorByPriority: null,
  documentStrokeColor: DOCUMENT_EVENT_STROKE_COLOR,
});

const normalizeEventColor = (
  value: string | EventTypeColorConfig | undefined,
  defaultColor: EventTypeColorConfig
): EventTypeColorConfig => {
  if (!value) {
    return defaultColor;
  }
  if (typeof value === "string") {
    // Legacy format: single string color, use as both background and border
    return {
      border: value,
      background: value,
    };
  }
  // Ensure both background and border are present
  if (typeof value === "object") {
    return {
      background: value.background ?? defaultColor.background,
      border: value.border ?? defaultColor.border,
    };
  }
  return value;
};

const ensureEventColorsEnabled = (
  config?: EventColorConfig | null
): EventColorConfig => {
  const defaults = createDefaultEventColors();
  if (!config) {
    return defaults;
  }
  // Preserve user's colors exactly as-is, normalize to new format
  const userColors = config.eventColorByType ?? {};
  const mergedByType: Record<string, EventTypeColorConfig> = {};

  // Normalize all colors to the new format
  for (const key of Object.keys(defaults.eventColorByType)) {
    const defaultColor = defaults.eventColorByType[key] as EventTypeColorConfig;
    mergedByType[key] = normalizeEventColor(userColors[key], defaultColor);
  }

  // Use user's defaultEventColor if provided, otherwise derive from conversation color
  const conversationColorConfig =
    mergedByType[CONVERSATION_TYPE_KEY] ??
    (defaults.eventColorByType[CONVERSATION_TYPE_KEY] as EventTypeColorConfig);
  const conversationColor =
    config.defaultEventColor ?? conversationColorConfig.background;

  return {
    defaultEventColor: conversationColor,
    eventColorByType: mergedByType,
    useEventColors: true, // Always enabled
    eventColorByStatus: config.eventColorByStatus ?? null,
    eventColorByPriority: config.eventColorByPriority ?? null,
    documentStrokeColor:
      config.documentStrokeColor ?? defaults.documentStrokeColor ?? null,
  };
};

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
  calendarFirstDay: number | null;
  eventTimeFormat: EventTimeFormatConfig | null;
  defaultCalendarView: string | null;
  calendarLocale: string | null;
  calendarDirection: "ltr" | "rtl" | "auto" | null;
  eventColors: EventColorConfig | null;
  notificationPreferences: NotificationPreferencesConfig | null;
  eventLoading: EventLoadingConfig | null;
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
    id: overrides?.id ?? "",
    name: overrides?.name ?? "",
    title: overrides?.title ?? "",
    dataType: overrides?.dataType ?? "text",
    isEditable: overrides?.isEditable ?? true,
    isRequired: overrides?.isRequired ?? false,
    width: overrides?.width ?? null,
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
  availableLanguages: ["ar", "en"].sort(),
  timezone: "Asia/Riyadh",
  llmProvider: "openai",
  calendarFirstDay: DEFAULT_CALENDAR_FIRST_DAY,
  eventTimeFormat: {
    format: "auto",
    showMinutes: true,
    showMeridiem: true,
  },
  defaultCalendarView: "timeGridWeek",
  calendarLocale: null,
  calendarDirection: "auto",
  eventColors: ensureEventColorsEnabled(),
  notificationPreferences: {
    notifyOnEventCreate: true,
    notifyOnEventUpdate: true,
    notifyOnEventDelete: true,
    notifyOnEventReminder: false,
    notificationSound: false,
    notificationDesktop: false,
    quietHours: null,
  },
  eventLoading: {
    dayMaxEvents: true,
    dayMaxEventRows: true,
    moreLinkClick: "popover",
  },
});

export const createAppConfigFormValues = (
  config: AppConfig
): AppConfigFormValues => {
  const snapshot = normalizeSnapshot(config.toSnapshot());
  const slotDurationEntries = snapshot.daySpecificSlotDurations.map((slot) => ({
    id: createTempId(`day-slot-${slot.dayOfWeek}`),
    dayOfWeek: slot.dayOfWeek,
    slotDurationHours: slot.slotDurationHours,
  }));
  const slotDurationDays = new Set(
    slotDurationEntries.map((slot) => slot.dayOfWeek)
  );

  return {
    workingDays: snapshot.workingDays,
    defaultWorkingHours: {
      startTime: snapshot.defaultWorkingHours.startTime,
      endTime: snapshot.defaultWorkingHours.endTime,
    },
    daySpecificWorkingHours: snapshot.daySpecificWorkingHours.map((hours) => {
      if (!slotDurationDays.has(hours.dayOfWeek)) {
        slotDurationEntries.push({
          id: createTempId(`day-slot-${hours.dayOfWeek}`),
          dayOfWeek: hours.dayOfWeek,
          slotDurationHours: snapshot.slotDurationHours,
        });
        slotDurationDays.add(hours.dayOfWeek);
      }
      return {
        id: createTempId(`day-hours-${hours.dayOfWeek}`),
        dayOfWeek: hours.dayOfWeek,
        startTime: hours.startTime,
        endTime: hours.endTime,
      };
    }),
    slotDurationHours: snapshot.slotDurationHours,
    daySpecificSlotDurations: slotDurationEntries,
    customCalendarRanges: snapshot.customCalendarRanges,
    calendarColumns: snapshot.calendarColumns,
    documentsColumns: snapshot.documentsColumns,
    defaultCountryPrefix: CountryCodeVO.fromUnknown(
      snapshot.defaultCountryPrefix
    ).value,
    availableLanguages: (() => {
      const languages = [...snapshot.availableLanguages];
      if (!languages.includes("en")) {
        languages.push("en");
      }
      return languages.sort();
    })(),
    timezone: snapshot.timezone,
    llmProvider: snapshot.llmProvider,
    calendarFirstDay: snapshot.calendarFirstDay ?? DEFAULT_CALENDAR_FIRST_DAY,
    eventTimeFormat: snapshot.eventTimeFormat ?? {
      format: "auto",
      showMinutes: true,
      showMeridiem: true,
    },
    defaultCalendarView: snapshot.defaultCalendarView ?? "timeGridWeek",
    calendarLocale: snapshot.calendarLocale ?? null,
    calendarDirection: snapshot.calendarDirection ?? "auto",
    eventColors: ensureEventColorsEnabled(snapshot.eventColors),
    notificationPreferences: snapshot.notificationPreferences ?? {
      notifyOnEventCreate: true,
      notifyOnEventUpdate: true,
      notifyOnEventDelete: true,
      notifyOnEventReminder: false,
      notificationSound: false,
      notificationDesktop: false,
      quietHours: null,
    },
    eventLoading: snapshot.eventLoading ?? {
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: "popover",
    },
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
  availableLanguages: (() => {
    const languages = [...values.availableLanguages];
    if (!languages.includes("en")) {
      languages.push("en");
    }
    return languages.sort();
  })(),
  timezone: values.timezone,
  llmProvider: values.llmProvider,
  calendarFirstDay: values.calendarFirstDay,
  eventTimeFormat: values.eventTimeFormat,
  defaultCalendarView: values.defaultCalendarView,
  calendarLocale: values.calendarLocale,
  calendarDirection: values.calendarDirection,
  eventColors: ensureEventColorsEnabled(values.eventColors ?? undefined),
  notificationPreferences: values.notificationPreferences,
  eventLoading: values.eventLoading,
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
