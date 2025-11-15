import type {
  AppConfigSnapshot,
  CustomCalendarRangeConfig,
  EventColorConfig,
  EventLoadingConfig,
  EventTimeFormatConfig,
  NotificationPreferencesConfig,
} from "../types/app-config.types";
import type {
  ColumnConfigVO,
  CountryCodeVO,
  LanguageListVO,
  LlmProviderVO,
  SlotDurationVO,
  TimezoneVO,
  WorkingHoursVO,
} from "../value-objects";

type AppConfigProps = {
  id: number;
  workingDays: number[];
  defaultWorkingHours: WorkingHoursVO;
  daySpecificWorkingHours: WorkingHoursVO[];
  slotDuration: SlotDurationVO;
  daySpecificSlotDurations: SlotDurationVO[];
  customCalendarRanges: CustomCalendarRangeConfig[];
  expiredCustomRanges: CustomCalendarRangeConfig[];
  calendarColumns: ColumnConfigVO[];
  documentsColumns: ColumnConfigVO[];
  defaultCountry: CountryCodeVO;
  availableLanguages: LanguageListVO;
  timezone: TimezoneVO;
  llmProvider: LlmProviderVO;
  calendarFirstDay: number | null;
  eventTimeFormat: EventTimeFormatConfig | null;
  defaultCalendarView: string | null;
  calendarLocale: string | null;
  calendarDirection: "ltr" | "rtl" | "auto" | null;
  eventColors: EventColorConfig | null;
  notificationPreferences: NotificationPreferencesConfig | null;
  eventLoading: EventLoadingConfig | null;
  createdAt: string;
  updatedAt: string;
};

const cloneDays = (days: number[]) => [...new Set(days)].sort((a, b) => a - b);

export class AppConfig {
  private readonly props: AppConfigProps;

  constructor(props: AppConfigProps) {
    this.props = props;
  }

  get id(): number {
    return this.props.id;
  }

  get workingDays(): number[] {
    return cloneDays(this.props.workingDays);
  }

  get defaultWorkingHours(): WorkingHoursVO {
    return this.props.defaultWorkingHours;
  }

  get daySpecificWorkingHours(): WorkingHoursVO[] {
    return [...this.props.daySpecificWorkingHours];
  }

  get slotDuration(): SlotDurationVO {
    return this.props.slotDuration;
  }

  get daySpecificSlotDurations(): SlotDurationVO[] {
    return [...this.props.daySpecificSlotDurations];
  }

  get customCalendarRanges(): CustomCalendarRangeConfig[] {
    return this.props.customCalendarRanges.map((range) => ({ ...range }));
  }

  get expiredCustomRanges(): CustomCalendarRangeConfig[] {
    return this.props.expiredCustomRanges.map((range) => ({ ...range }));
  }

  get calendarColumns(): ColumnConfigVO[] {
    return [...this.props.calendarColumns];
  }

  get documentsColumns(): ColumnConfigVO[] {
    return [...this.props.documentsColumns];
  }

  get defaultCountry(): CountryCodeVO {
    return this.props.defaultCountry;
  }

  get availableLanguages(): LanguageListVO {
    return this.props.availableLanguages;
  }

  get timezone(): TimezoneVO {
    return this.props.timezone;
  }

  get llmProvider(): LlmProviderVO {
    return this.props.llmProvider;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get updatedAt(): string {
    return this.props.updatedAt;
  }

  get calendarFirstDay(): number | null {
    return this.props.calendarFirstDay;
  }

  get eventTimeFormat(): EventTimeFormatConfig | null {
    return this.props.eventTimeFormat
      ? { ...this.props.eventTimeFormat }
      : null;
  }

  get defaultCalendarView(): string | null {
    return this.props.defaultCalendarView;
  }

  get calendarLocale(): string | null {
    return this.props.calendarLocale;
  }

  get calendarDirection(): "ltr" | "rtl" | "auto" | null {
    return this.props.calendarDirection;
  }

  get eventColors(): EventColorConfig | null {
    return this.props.eventColors
      ? {
          ...this.props.eventColors,
          eventColorByType: { ...this.props.eventColors.eventColorByType },
          eventColorByStatus: this.props.eventColors.eventColorByStatus
            ? { ...this.props.eventColors.eventColorByStatus }
            : null,
          eventColorByPriority: this.props.eventColors.eventColorByPriority
            ? { ...this.props.eventColors.eventColorByPriority }
            : null,
        }
      : null;
  }

  get notificationPreferences(): NotificationPreferencesConfig | null {
    return this.props.notificationPreferences
      ? {
          ...this.props.notificationPreferences,
          quietHours: this.props.notificationPreferences.quietHours
            ? { ...this.props.notificationPreferences.quietHours }
            : null,
        }
      : null;
  }

  get eventLoading(): EventLoadingConfig | null {
    return this.props.eventLoading ? { ...this.props.eventLoading } : null;
  }

  toSnapshot(): AppConfigSnapshot {
    return {
      id: this.props.id,
      workingDays: this.workingDays,
      defaultWorkingHours: this.props.defaultWorkingHours.value,
      daySpecificWorkingHours: this.props.daySpecificWorkingHours.map(
        (hours) => ({
          dayOfWeek: hours.value.daysOfWeek[0] ?? 0,
          startTime: hours.value.startTime,
          endTime: hours.value.endTime,
        })
      ),
      slotDurationHours: this.props.slotDuration.value.hours,
      daySpecificSlotDurations: this.props.daySpecificSlotDurations.map(
        (slot) => ({
          dayOfWeek: slot.value.dayOfWeek ?? 0,
          slotDurationHours: slot.value.hours,
        })
      ),
      customCalendarRanges: this.customCalendarRanges,
      calendarColumns: this.props.calendarColumns.map((col) => col.value),
      documentsColumns: this.props.documentsColumns.map((col) => col.value),
      defaultCountryPrefix: this.props.defaultCountry.value,
      availableLanguages: this.props.availableLanguages.value,
      timezone: this.props.timezone.value,
      llmProvider: this.props.llmProvider.value,
      calendarFirstDay: this.props.calendarFirstDay,
      eventTimeFormat: this.eventTimeFormat,
      defaultCalendarView: this.props.defaultCalendarView,
      calendarLocale: this.props.calendarLocale,
      calendarDirection: this.props.calendarDirection,
      eventColors: this.eventColors,
      notificationPreferences: this.notificationPreferences,
      eventLoading: this.eventLoading,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
