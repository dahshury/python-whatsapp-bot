import type { AppConfig } from "../core/app-config.domain";
import { AppConfigFactory } from "../core/app-config.factory";
import type {
  AppConfigDto,
  AppConfigSnapshot,
  AppConfigUpdateDto,
  AppConfigUpdateInput,
  ColumnConfig,
  ColumnConfigDto,
  CustomCalendarRangeConfig,
  CustomCalendarRangeDto,
  DaySpecificSlotDurationConfig,
  DaySpecificWorkingHoursConfig,
  EventColorConfig,
  EventColorDto,
  EventLoadingConfig,
  EventLoadingDto,
  EventTimeFormatConfig,
  EventTimeFormatDto,
  NotificationPreferencesConfig,
  NotificationPreferencesDto,
  WorkingHoursConfig,
} from "../types/app-config.types";

const toWorkingHoursDto = (value: WorkingHoursConfig) => ({
  days_of_week: value.daysOfWeek,
  start_time: value.startTime,
  end_time: value.endTime,
});

const toDaySpecificHoursDto = (value: DaySpecificWorkingHoursConfig) => ({
  day_of_week: value.dayOfWeek,
  start_time: value.startTime,
  end_time: value.endTime,
});

const toDaySpecificSlotDurationDto = (
  value: DaySpecificSlotDurationConfig
) => ({
  day_of_week: value.dayOfWeek,
  slot_duration_hours: value.slotDurationHours,
});

const toColumnDto = (column: ColumnConfig): ColumnConfigDto => ({
  id: column.id,
  name: column.name,
  title: column.title,
  data_type: column.dataType,
  is_editable: column.isEditable,
  is_required: column.isRequired,
  width: column.width ?? null,
  metadata: column.metadata ?? null,
});

const toCustomRangeDto = (
  range: CustomCalendarRangeConfig
): CustomCalendarRangeDto => ({
  name: range.name,
  start_date: range.startDate,
  end_date: range.endDate,
  working_days: range.workingDays,
  start_time: range.startTime,
  end_time: range.endTime,
  slot_duration_hours: range.slotDurationHours ?? null,
});

const fromWorkingHoursDto = (dto: {
  days_of_week: number[];
  start_time: string;
  end_time: string;
}): WorkingHoursConfig => ({
  daysOfWeek: dto.days_of_week ?? [],
  startTime: dto.start_time,
  endTime: dto.end_time,
});

const fromDaySpecificHoursDto = (dto: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): DaySpecificWorkingHoursConfig => ({
  dayOfWeek: dto.day_of_week,
  startTime: dto.start_time,
  endTime: dto.end_time,
});

const fromDaySpecificSlotDurationDto = (dto: {
  day_of_week: number;
  slot_duration_hours: number;
}): DaySpecificSlotDurationConfig => ({
  dayOfWeek: dto.day_of_week,
  slotDurationHours: dto.slot_duration_hours,
});

const fromColumnDto = (dto: ColumnConfigDto): ColumnConfig => ({
  id: dto.id,
  name: dto.name,
  title: dto.title,
  dataType: dto.data_type,
  isEditable: dto.is_editable,
  isRequired: dto.is_required,
  width: dto.width ?? null,
  metadata: dto.metadata ?? null,
});

const fromCustomRangeDto = (
  dto: CustomCalendarRangeDto
): CustomCalendarRangeConfig => ({
  name: dto.name,
  startDate: dto.start_date,
  endDate: dto.end_date,
  workingDays: dto.working_days,
  startTime: dto.start_time,
  endTime: dto.end_time,
  slotDurationHours: dto.slot_duration_hours ?? null,
});

const fromEventTimeFormatDto = (
  dto: EventTimeFormatDto | null | undefined
): EventTimeFormatConfig | null => {
  if (!dto) {
    return null;
  }
  return {
    format: dto.format,
    showMinutes: dto.show_minutes,
    showMeridiem: dto.show_meridiem,
  };
};

const toEventTimeFormatDto = (
  config: EventTimeFormatConfig | null | undefined
): EventTimeFormatDto | null => {
  if (!config) {
    return null;
  }
  return {
    format: config.format,
    show_minutes: config.showMinutes,
    show_meridiem: config.showMeridiem,
  };
};

const normalizeDtoColor = (
  value: string | { background: string; border: string } | undefined
): { background: string; border: string } | string => {
  if (!value) {
    return value as string;
  }
  if (typeof value === "string") {
    return value;
  }
  return value;
};

const fromEventColorDto = (
  dto: EventColorDto | null | undefined
): EventColorConfig | null => {
  if (!dto) {
    return null;
  }
  const normalizedColors: Record<
    string,
    string | { background: string; border: string }
  > = {};
  for (const [key, value] of Object.entries(dto.event_color_by_type)) {
    normalizedColors[key] = normalizeDtoColor(value);
  }
  return {
    defaultEventColor: dto.default_event_color,
    eventColorByType: normalizedColors,
    useEventColors: dto.use_event_colors,
    eventColorByStatus: dto.event_color_by_status ?? null,
    eventColorByPriority: dto.event_color_by_priority ?? null,
    documentStrokeColor: dto.document_stroke_color ?? null,
  };
};

const toEventColorDto = (
  config: EventColorConfig | null | undefined
): EventColorDto | null => {
  if (!config) {
    return null;
  }
  return {
    default_event_color: config.defaultEventColor,
    event_color_by_type: config.eventColorByType,
    use_event_colors: config.useEventColors,
    event_color_by_status: config.eventColorByStatus ?? null,
    event_color_by_priority: config.eventColorByPriority ?? null,
    document_stroke_color: config.documentStrokeColor ?? null,
  };
};

const fromNotificationPreferencesDto = (
  dto: NotificationPreferencesDto | null | undefined
): NotificationPreferencesConfig | null => {
  if (!dto) {
    return null;
  }
  return {
    notifyOnEventCreate: dto.notify_on_event_create,
    notifyOnEventUpdate: dto.notify_on_event_update,
    notifyOnEventDelete: dto.notify_on_event_delete,
    notifyOnEventReminder: dto.notify_on_event_reminder,
    notificationSound: dto.notification_sound,
    notificationDesktop: dto.notification_desktop,
    quietHours: dto.quiet_hours ?? null,
  };
};

const toNotificationPreferencesDto = (
  config: NotificationPreferencesConfig | null | undefined
): NotificationPreferencesDto | null => {
  if (!config) {
    return null;
  }
  return {
    notify_on_event_create: config.notifyOnEventCreate,
    notify_on_event_update: config.notifyOnEventUpdate,
    notify_on_event_delete: config.notifyOnEventDelete,
    notify_on_event_reminder: config.notifyOnEventReminder,
    notification_sound: config.notificationSound,
    notification_desktop: config.notificationDesktop,
    quiet_hours: config.quietHours ?? null,
  };
};

const fromEventLoadingDto = (
  dto: EventLoadingDto | null | undefined
): EventLoadingConfig | null => {
  if (!dto) {
    return null;
  }
  return {
    dayMaxEvents: dto.day_max_events,
    dayMaxEventRows: dto.day_max_event_rows,
    moreLinkClick: dto.more_link_click,
  };
};

const toEventLoadingDto = (
  config: EventLoadingConfig | null | undefined
): EventLoadingDto | null => {
  if (!config) {
    return null;
  }
  return {
    day_max_events: config.dayMaxEvents,
    day_max_event_rows: config.dayMaxEventRows,
    more_link_click: config.moreLinkClick,
  };
};

export function appConfigToDomain(dto: AppConfigDto): AppConfig {
  const snapshot: AppConfigSnapshot = {
    id: dto.id,
    workingDays: dto.working_days ?? [],
    defaultWorkingHours: fromWorkingHoursDto(dto.default_working_hours),
    daySpecificWorkingHours: (dto.day_specific_hours ?? []).map(
      fromDaySpecificHoursDto
    ),
    slotDurationHours: dto.slot_duration_hours,
    daySpecificSlotDurations: (dto.day_specific_slot_durations ?? []).map(
      fromDaySpecificSlotDurationDto
    ),
    customCalendarRanges: (dto.custom_calendar_ranges ?? []).map(
      fromCustomRangeDto
    ),
    calendarColumns: (dto.calendar_columns ?? []).map(fromColumnDto),
    documentsColumns: (dto.documents_columns ?? []).map(fromColumnDto),
    defaultCountryPrefix: dto.default_country_prefix,
    availableLanguages: dto.available_languages ?? [],
    timezone: dto.timezone ?? "Asia/Riyadh",
    llmProvider:
      dto.llm_provider === "gemini" ? "google" : (dto.llm_provider ?? "openai"),
    calendarFirstDay: dto.calendar_first_day ?? null,
    eventTimeFormat: fromEventTimeFormatDto(dto.event_time_format),
    defaultCalendarView: dto.default_calendar_view ?? null,
    calendarLocale: dto.calendar_locale ?? null,
    calendarDirection: dto.calendar_direction ?? null,
    eventColors: fromEventColorDto(dto.event_colors),
    notificationPreferences: fromNotificationPreferencesDto(
      dto.notification_preferences
    ),
    eventLoading: fromEventLoadingDto(dto.event_loading),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
  return AppConfigFactory.create(snapshot);
}

export function appConfigToDto(config: AppConfig): AppConfigDto {
  const snapshot = config.toSnapshot();
  return {
    id: snapshot.id,
    working_days: snapshot.workingDays,
    default_working_hours: toWorkingHoursDto(snapshot.defaultWorkingHours),
    day_specific_hours: snapshot.daySpecificWorkingHours.map(
      toDaySpecificHoursDto
    ),
    slot_duration_hours: snapshot.slotDurationHours,
    day_specific_slot_durations: snapshot.daySpecificSlotDurations.map(
      toDaySpecificSlotDurationDto
    ),
    custom_calendar_ranges: snapshot.customCalendarRanges.map(toCustomRangeDto),
    calendar_columns: snapshot.calendarColumns.map(toColumnDto),
    documents_columns: snapshot.documentsColumns.map(toColumnDto),
    default_country_prefix: snapshot.defaultCountryPrefix,
    available_languages: snapshot.availableLanguages,
    timezone: snapshot.timezone,
    llm_provider:
      snapshot.llmProvider === "google" ? "gemini" : snapshot.llmProvider,
    calendar_first_day: snapshot.calendarFirstDay ?? null,
    event_time_format: toEventTimeFormatDto(snapshot.eventTimeFormat),
    default_calendar_view: snapshot.defaultCalendarView ?? null,
    calendar_locale: snapshot.calendarLocale ?? null,
    calendar_direction: snapshot.calendarDirection ?? null,
    event_colors: toEventColorDto(snapshot.eventColors),
    notification_preferences: toNotificationPreferencesDto(
      snapshot.notificationPreferences
    ),
    event_loading: toEventLoadingDto(snapshot.eventLoading),
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt,
  };
}

export function appConfigToUpdateDto(
  input: AppConfigUpdateInput
): AppConfigUpdateDto {
  const dto: AppConfigUpdateDto = {};
  if (input.workingDays) {
    dto.working_days = input.workingDays;
  }
  if (input.defaultWorkingHours) {
    dto.default_working_hours = toWorkingHoursDto(
      input.defaultWorkingHours
    ) as AppConfigDto["default_working_hours"];
  }
  if (input.daySpecificWorkingHours) {
    dto.day_specific_hours = input.daySpecificWorkingHours.map(
      toDaySpecificHoursDto
    );
  }
  if (input.slotDurationHours !== undefined) {
    dto.slot_duration_hours = input.slotDurationHours;
  }
  if (input.daySpecificSlotDurations) {
    dto.day_specific_slot_durations = input.daySpecificSlotDurations.map(
      toDaySpecificSlotDurationDto
    );
  }
  if (input.customCalendarRanges) {
    dto.custom_calendar_ranges =
      input.customCalendarRanges.map(toCustomRangeDto);
  }
  if (input.calendarColumns) {
    dto.calendar_columns = input.calendarColumns.map(toColumnDto);
  }
  if (input.documentsColumns) {
    dto.documents_columns = input.documentsColumns.map(toColumnDto);
  }
  if (input.defaultCountryPrefix) {
    dto.default_country_prefix = input.defaultCountryPrefix;
  }
  if (input.availableLanguages) {
    dto.available_languages = input.availableLanguages;
  }
  if (input.timezone) {
    dto.timezone = input.timezone;
  }
  if (input.llmProvider) {
    dto.llm_provider =
      input.llmProvider === "google" ? "gemini" : input.llmProvider;
  }
  if (input.calendarFirstDay !== undefined) {
    dto.calendar_first_day = input.calendarFirstDay;
  }
  if (input.eventTimeFormat !== undefined) {
    dto.event_time_format = toEventTimeFormatDto(input.eventTimeFormat);
  }
  if (input.defaultCalendarView !== undefined) {
    dto.default_calendar_view = input.defaultCalendarView;
  }
  if (input.calendarLocale !== undefined) {
    dto.calendar_locale = input.calendarLocale;
  }
  if (input.calendarDirection !== undefined) {
    dto.calendar_direction = input.calendarDirection;
  }
  if (input.eventColors !== undefined) {
    dto.event_colors = toEventColorDto(input.eventColors);
  }
  if (input.notificationPreferences !== undefined) {
    dto.notification_preferences = toNotificationPreferencesDto(
      input.notificationPreferences
    );
  }
  if (input.eventLoading !== undefined) {
    dto.event_loading = toEventLoadingDto(input.eventLoading);
  }
  return dto;
}

// Legacy export for backward compatibility
export const AppConfigMapper = {
  toDomain: appConfigToDomain,
  toDto: appConfigToDto,
  toUpdateDto: appConfigToUpdateDto,
};
