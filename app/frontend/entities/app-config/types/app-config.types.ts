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
  created_at: string;
  updated_at: string;
};

export type AppConfigUpdateDto = Partial<AppConfigDto>;
