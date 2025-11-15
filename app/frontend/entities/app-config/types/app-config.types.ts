export type WorkingHoursConfig = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
};

export type DaySpecificWorkingHoursConfig = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type DaySpecificSlotDurationConfig = {
  dayOfWeek: number;
  slotDurationHours: number;
};

export type CustomCalendarRangeConfig = {
  name: string;
  startDate: string;
  endDate: string;
  workingDays: number[];
  startTime: string;
  endTime: string;
  slotDurationHours?: number | null;
};

export type ColumnConfig = {
  id: string;
  name: string;
  title: string;
  dataType: string;
  isEditable: boolean;
  isRequired: boolean;
  width?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type EventTimeFormatConfig = {
  format: "12h" | "24h" | "auto";
  showMinutes: boolean;
  showMeridiem: boolean;
};

export type EventTypeColorConfig = {
  background: string;
  border: string;
};

export type EventColorConfig = {
  defaultEventColor: string;
  eventColorByType: Record<string, string | EventTypeColorConfig>;
  useEventColors: boolean;
  eventColorByStatus?: Record<string, string> | null;
  eventColorByPriority?: Record<string, string> | null;
  documentStrokeColor?: string | null;
};

export type NotificationPreferencesConfig = {
  notifyOnEventCreate: boolean;
  notifyOnEventUpdate: boolean;
  notifyOnEventDelete: boolean;
  notifyOnEventReminder: boolean;
  notificationSound: boolean;
  notificationDesktop: boolean;
  quietHours?: { start: string; end: string } | null;
};

export type EventLoadingConfig = {
  dayMaxEvents: number | boolean;
  dayMaxEventRows: number | boolean;
  moreLinkClick: "popover" | "week" | "day" | "timeGridWeek" | "timeGridDay";
};

export type AppConfigSnapshot = {
  id: number;
  workingDays: number[];
  defaultWorkingHours: WorkingHoursConfig;
  daySpecificWorkingHours: DaySpecificWorkingHoursConfig[];
  slotDurationHours: number;
  daySpecificSlotDurations: DaySpecificSlotDurationConfig[];
  customCalendarRanges: CustomCalendarRangeConfig[];
  calendarColumns: ColumnConfig[];
  documentsColumns: ColumnConfig[];
  defaultCountryPrefix: string;
  availableLanguages: string[];
  timezone: string;
  llmProvider: string;
  calendarFirstDay?: number | null;
  eventTimeFormat?: EventTimeFormatConfig | null;
  defaultCalendarView?: string | null;
  calendarLocale?: string | null;
  calendarDirection?: "ltr" | "rtl" | "auto" | null;
  eventColors?: EventColorConfig | null;
  notificationPreferences?: NotificationPreferencesConfig | null;
  eventLoading?: EventLoadingConfig | null;
  createdAt: string;
  updatedAt: string;
};

export type AppConfigUpdateInput = Partial<{
  workingDays: number[];
  defaultWorkingHours: WorkingHoursConfig;
  daySpecificWorkingHours: DaySpecificWorkingHoursConfig[];
  slotDurationHours: number;
  daySpecificSlotDurations: DaySpecificSlotDurationConfig[];
  customCalendarRanges: CustomCalendarRangeConfig[];
  calendarColumns: ColumnConfig[];
  documentsColumns: ColumnConfig[];
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
}>;

export type WorkingHoursDto = {
  days_of_week: number[];
  start_time: string;
  end_time: string;
};

export type DaySpecificWorkingHoursDto = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type DaySpecificSlotDurationDto = {
  day_of_week: number;
  slot_duration_hours: number;
};

export type CustomCalendarRangeDto = {
  name: string;
  start_date: string;
  end_date: string;
  working_days: number[];
  start_time: string;
  end_time: string;
  slot_duration_hours?: number | null;
};

export type ColumnConfigDto = {
  id: string;
  name: string;
  title: string;
  data_type: string;
  is_editable: boolean;
  is_required: boolean;
  width?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type EventTimeFormatDto = {
  format: "12h" | "24h" | "auto";
  show_minutes: boolean;
  show_meridiem: boolean;
};

export type EventColorDto = {
  default_event_color: string;
  event_color_by_type: Record<
    string,
    string | { background: string; border: string }
  >;
  use_event_colors: boolean;
  event_color_by_status?: Record<string, string> | null;
  event_color_by_priority?: Record<string, string> | null;
  document_stroke_color?: string | null;
};

export type NotificationPreferencesDto = {
  notify_on_event_create: boolean;
  notify_on_event_update: boolean;
  notify_on_event_delete: boolean;
  notify_on_event_reminder: boolean;
  notification_sound: boolean;
  notification_desktop: boolean;
  quiet_hours?: { start: string; end: string } | null;
};

export type EventLoadingDto = {
  day_max_events: number | boolean;
  day_max_event_rows: number | boolean;
  more_link_click: "popover" | "week" | "day" | "timeGridWeek" | "timeGridDay";
};

export type AppConfigDto = {
  id: number;
  working_days: number[];
  default_working_hours: WorkingHoursDto;
  day_specific_hours: DaySpecificWorkingHoursDto[];
  slot_duration_hours: number;
  day_specific_slot_durations: DaySpecificSlotDurationDto[];
  custom_calendar_ranges: CustomCalendarRangeDto[];
  calendar_columns: ColumnConfigDto[];
  documents_columns: ColumnConfigDto[];
  default_country_prefix: string;
  available_languages: string[];
  timezone: string;
  llm_provider: string;
  calendar_first_day?: number | null;
  event_time_format?: EventTimeFormatDto | null;
  default_calendar_view?: string | null;
  calendar_locale?: string | null;
  calendar_direction?: "ltr" | "rtl" | "auto" | null;
  event_colors?: EventColorDto | null;
  notification_preferences?: NotificationPreferencesDto | null;
  event_loading?: EventLoadingDto | null;
  created_at: string;
  updated_at: string;
};

export type AppConfigUpdateDto = Partial<AppConfigDto>;
