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
  return dto;
}

// Legacy export for backward compatibility
export const AppConfigMapper = {
  toDomain: appConfigToDomain,
  toDto: appConfigToDto,
  toUpdateDto: appConfigToUpdateDto,
};
