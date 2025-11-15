"use client";

import allLocales from "@fullcalendar/core/locales-all";
import { Controller, type UseFormReturn } from "react-hook-form";
import type { EventTypeColorConfig } from "@/entities/app-config";
import { EVENT_TYPE } from "@/entities/event";
import {
  DOCUMENT_EVENT_STROKE_COLOR,
  EVENT_TYPE_COLOR_DEFAULTS,
} from "@/shared/constants/calendar-colors";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/shared/ui/color-picker";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import type { AppConfigFormValues } from "../../model";
import { SectionCard } from "../working-hours/components/section-card";

type LocaleOption = {
  value: string;
  label: string;
};

const DEFAULT_LOCALE_VALUE = "__app-default__";

const formatLocaleLabel = (code?: string): string => {
  if (!code) {
    return "";
  }
  const normalizedCode = code.replace("_", "-");
  try {
    if (
      typeof Intl !== "undefined" &&
      "DisplayNames" in Intl &&
      typeof Intl.DisplayNames === "function"
    ) {
      const baseCode = normalizedCode.split("-")[0] ?? normalizedCode;
      const displayNames = new Intl.DisplayNames([normalizedCode], {
        type: "language",
      });
      const displayName = displayNames.of(baseCode);
      if (displayName && displayName.toLowerCase() !== baseCode.toLowerCase()) {
        return `${displayName} (${code})`;
      }
    }
  } catch {
    // Ignore unsupported locale codes and fall back to the raw code
  }
  return code;
};

const FULLCALENDAR_LOCALE_OPTIONS: LocaleOption[] = Array.from(
  new Map(
    allLocales
      .filter((locale) => Boolean(locale?.code))
      .map((locale) => [locale.code, locale])
  ).values()
)
  .map((locale) => ({
    value: locale.code,
    label: formatLocaleLabel(locale.code),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

type CalendarDisplaySectionProps = {
  form: UseFormReturn<AppConfigFormValues>;
  className?: string;
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Default calendar first day: Saturday (6)
const DEFAULT_CALENDAR_FIRST_DAY = 6;

const CALENDAR_VIEWS = [
  { value: "timeGridWeek", label: "Week (Time Grid)" },
  { value: "dayGridMonth", label: "Month" },
  { value: "dayGridWeek", label: "Week (Day Grid)" },
  { value: "listMonth", label: "List" },
  { value: "multiMonthYear", label: "Multi-Month" },
];

const TIME_FORMATS = [
  { value: "12h", label: "12-hour (AM/PM)" },
  { value: "24h", label: "24-hour" },
  { value: "auto", label: "Auto (responsive)" },
];

const DIRECTION_OPTIONS = [
  { value: "ltr", label: "Left to Right" },
  { value: "rtl", label: "Right to Left" },
  { value: "auto", label: "Auto (detect from locale)" },
];

type EventColorMeta = {
  typeValue: number;
  label: string;
  defaultColors: EventTypeColorConfig;
  description: string;
};

const EVENT_TYPE_COLOR_META: EventColorMeta[] = [
  {
    typeValue: EVENT_TYPE.CheckUp,
    label: "Check-up (Type 0)",
    defaultColors: EVENT_TYPE_COLOR_DEFAULTS["0"],
    description: "Background and border colors for check-up reservations.",
  },
  {
    typeValue: EVENT_TYPE.FollowUp,
    label: "Follow-up (Type 1)",
    defaultColors: EVENT_TYPE_COLOR_DEFAULTS["1"],
    description: "Background and border colors for follow-up reservations.",
  },
  {
    typeValue: EVENT_TYPE.Conversation,
    label: "Conversation (Type 2)",
    defaultColors: EVENT_TYPE_COLOR_DEFAULTS["2"],
    description: "Background and border colors for conversation events.",
  },
];

export const CalendarDisplaySection = ({
  form,
  className,
}: CalendarDisplaySectionProps) => {
  const { control } = form;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Calendar First Day */}
      <SectionCard
        description="Set which day the week starts on"
        title="Week Start Day"
      >
        <Controller
          control={control}
          name="calendarFirstDay"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>First Day of Week</Label>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? DEFAULT_CALENDAR_FIRST_DAY)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </SectionCard>

      {/* Event Time Format */}
      <SectionCard
        description="Configure how event times are displayed"
        title="Event Time Format"
      >
        <div className="space-y-4">
          <Controller
            control={control}
            name="eventTimeFormat.format"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Time Format</Label>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? "auto"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          <Controller
            control={control}
            name="eventTimeFormat.showMinutes"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
                <div className="space-y-0.5">
                  <Label className="font-medium text-sm">Show Minutes</Label>
                  <p className="text-muted-foreground text-xs">
                    Display minutes in event times
                  </p>
                </div>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          <Controller
            control={control}
            name="eventTimeFormat.showMeridiem"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
                <div className="space-y-0.5">
                  <Label className="font-medium text-sm">Show AM/PM</Label>
                  <p className="text-muted-foreground text-xs">
                    Display meridiem for 12-hour format
                  </p>
                </div>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </div>
      </SectionCard>

      {/* Default Calendar View */}
      <SectionCard
        description="Set the default view when opening the calendar"
        title="Default Calendar View"
      >
        <Controller
          control={control}
          name="defaultCalendarView"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Default View</Label>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "timeGridWeek"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_VIEWS.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                      {view.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </SectionCard>

      {/* Calendar Locale & Direction */}
      <SectionCard
        description="Configure calendar language and text direction"
        title="Calendar Locale & Direction"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="calendarLocale"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Locale</Label>
                <Select
                  onValueChange={(value) =>
                    field.onChange(
                      value === DEFAULT_LOCALE_VALUE ? null : value
                    )
                  }
                  value={field.value ?? DEFAULT_LOCALE_VALUE}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select locale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_LOCALE_VALUE}>
                      App Default (English)
                    </SelectItem>
                    {FULLCALENDAR_LOCALE_OPTIONS.map((locale) => (
                      <SelectItem key={locale.value} value={locale.value}>
                        {locale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Choose from FullCalendar&apos;s locale list or leave empty to
                  inherit the default.
                </p>
              </div>
            )}
          />
          <Controller
            control={control}
            name="calendarDirection"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Text Direction</Label>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value as "ltr" | "rtl" | "auto")
                  }
                  value={field.value ?? "auto"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </div>
      </SectionCard>

      {/* Event Colors */}
      <SectionCard
        description="Configure event color scheme by event type"
        title="Event Colors"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <p className="font-medium text-sm">
              Color coding is always enabled.
            </p>
            <p className="text-muted-foreground text-xs">
              These presets mirror the palette defined in FullCalendar’s CSS
              variables so the config matches what users see in the calendar.
            </p>
          </div>
          <div className="space-y-4 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
            {EVENT_TYPE_COLOR_META.map((meta) => {
              const typeKey = String(meta.typeValue);
              return (
                <div className="space-y-3" key={typeKey}>
                  <div className="space-y-1">
                    <Label className="font-medium text-sm">{meta.label}</Label>
                    <p className="text-muted-foreground text-xs">
                      {meta.description}
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name={`eventColors.eventColorByType.${typeKey}`}
                    render={({ field }) => {
                      const currentColors =
                        (field.value as EventTypeColorConfig | undefined) ??
                        meta.defaultColors;
                      return (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Background</Label>
                            <div className="flex items-center gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    aria-label={`${meta.label} background color picker`}
                                    className="h-9 w-24 border-2 p-1"
                                    style={{
                                      backgroundColor: currentColors.background,
                                    }}
                                    variant="outline"
                                  >
                                    <div
                                      className="h-full w-full rounded"
                                      style={{
                                        backgroundColor:
                                          currentColors.background,
                                      }}
                                    />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4">
                                  <ColorPicker
                                    className="w-full max-w-[300px]"
                                    defaultValue={meta.defaultColors.background}
                                    onChange={(hex) => {
                                      field.onChange({
                                        background: hex,
                                        border: currentColors.border,
                                      });
                                    }}
                                    value={currentColors.background}
                                  >
                                    <ColorPickerSelection />
                                    <div className="flex items-center gap-4">
                                      <ColorPickerEyeDropper />
                                      <div className="grid w-full gap-1">
                                        <ColorPickerHue />
                                        <ColorPickerAlpha />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <ColorPickerOutput />
                                      <ColorPickerFormat />
                                    </div>
                                  </ColorPicker>
                                </PopoverContent>
                              </Popover>
                              <Input
                                aria-label={`${meta.label} background hex value`}
                                className="flex-1"
                                onChange={(e) => {
                                  field.onChange({
                                    background:
                                      e.target.value ||
                                      meta.defaultColors.background,
                                    border: currentColors.border,
                                  });
                                }}
                                placeholder={meta.defaultColors.background}
                                type="text"
                                value={currentColors.background}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Border/Stroke</Label>
                            <div className="flex items-center gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    aria-label={`${meta.label} border color picker`}
                                    className="h-9 w-24 border-2 p-1"
                                    style={{
                                      backgroundColor: currentColors.border,
                                    }}
                                    variant="outline"
                                  >
                                    <div
                                      className="h-full w-full rounded"
                                      style={{
                                        backgroundColor: currentColors.border,
                                      }}
                                    />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4">
                                  <ColorPicker
                                    className="w-full max-w-[300px]"
                                    defaultValue={meta.defaultColors.border}
                                    onChange={(hex) => {
                                      field.onChange({
                                        background: currentColors.background,
                                        border: hex,
                                      });
                                    }}
                                    value={currentColors.border}
                                  >
                                    <ColorPickerSelection />
                                    <div className="flex items-center gap-4">
                                      <ColorPickerEyeDropper />
                                      <div className="grid w-full gap-1">
                                        <ColorPickerHue />
                                        <ColorPickerAlpha />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <ColorPickerOutput />
                                      <ColorPickerFormat />
                                    </div>
                                  </ColorPicker>
                                </PopoverContent>
                              </Popover>
                              <Input
                                aria-label={`${meta.label} border hex value`}
                                className="flex-1"
                                onChange={(e) => {
                                  field.onChange({
                                    background: currentColors.background,
                                    border:
                                      e.target.value ||
                                      meta.defaultColors.border,
                                  });
                                }}
                                placeholder={meta.defaultColors.border}
                                type="text"
                                value={currentColors.border}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="space-y-3 rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
            <Label className="font-medium text-sm">Document Highlight</Label>
            <p className="text-muted-foreground text-xs">
              Events with uploaded documents automatically receive a colored
              stroke so users can spot paperwork at a glance.
            </p>
            <Controller
              control={control}
              name="eventColors.documentStrokeColor"
              render={({ field }) => {
                const currentValue =
                  (field.value as string | undefined) ??
                  DOCUMENT_EVENT_STROKE_COLOR;
                return (
                  <div className="space-y-2">
                    <Label className="text-xs">Stroke Color</Label>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            aria-label="Document stroke color picker"
                            className="h-9 w-24 border-2 p-1"
                            style={{ backgroundColor: currentValue }}
                            variant="outline"
                          >
                            <div
                              className="h-full w-full rounded"
                              style={{ backgroundColor: currentValue }}
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4">
                          <ColorPicker
                            className="w-full max-w-[300px]"
                            defaultValue={DOCUMENT_EVENT_STROKE_COLOR}
                            onChange={(hex) => field.onChange(hex)}
                            value={currentValue}
                          >
                            <ColorPickerSelection />
                            <div className="flex items-center gap-4">
                              <ColorPickerEyeDropper />
                              <div className="grid w-full gap-1">
                                <ColorPickerHue />
                                <ColorPickerAlpha />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ColorPickerOutput />
                              <ColorPickerFormat />
                            </div>
                          </ColorPicker>
                        </PopoverContent>
                      </Popover>
                      <Input
                        aria-label="Document stroke hex value"
                        className="flex-1"
                        onChange={(e) =>
                          field.onChange(
                            e.target.value || DOCUMENT_EVENT_STROKE_COLOR
                          )
                        }
                        placeholder={DOCUMENT_EVENT_STROKE_COLOR}
                        type="text"
                        value={currentValue}
                      />
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Event Loading Behavior */}
      <SectionCard
        description="Control how many events appear per day and how the '+X more' link behaves"
        title="Event Display Limits"
      >
        <div className="space-y-4">
          <Controller
            control={control}
            name="eventLoading.dayMaxEvents"
            render={({ field }) => {
              const currentValue = field.value ?? true;
              const limitEnabled = currentValue !== false;
              const numericValue =
                typeof currentValue === "number" ? String(currentValue) : "";
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border bg-background/40 p-3 backdrop-blur-sm">
                    <div className="space-y-0.5">
                      <Label className="font-medium text-sm">
                        Limit Events Per Day
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Show "+X more" link when day has too many events
                      </p>
                    </div>
                    <Switch
                      checked={limitEnabled}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          field.onChange(false);
                          return;
                        }
                        if (
                          typeof field.value === "number" &&
                          field.value > 0
                        ) {
                          field.onChange(field.value);
                          return;
                        }
                        field.onChange(true);
                      }}
                    />
                  </div>
                  {limitEnabled && (
                    <div className="space-y-2">
                      <Label>Specific Limit (optional)</Label>
                      <Input
                        min={1}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            field.onChange(true);
                            return;
                          }
                          const num = Number(e.target.value);
                          if (num > 0 && Number.isFinite(num)) {
                            field.onChange(num);
                          }
                        }}
                        placeholder="Leave blank to let FullCalendar decide"
                        type="number"
                        value={numericValue}
                      />
                      <p className="text-muted-foreground text-xs">
                        Provide a concrete number of events before "+X more"
                        appears, or leave blank to rely on FullCalendar&apos;s
                        automatic behavior.
                      </p>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Controller
            control={control}
            name="eventLoading.moreLinkClick"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>More Link Behavior</Label>
                <Select
                  onValueChange={(value) =>
                    field.onChange(
                      value as
                        | "popover"
                        | "week"
                        | "day"
                        | "timeGridWeek"
                        | "timeGridDay"
                    )
                  }
                  value={field.value ?? "popover"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popover">
                      Popover (show events in popup)
                    </SelectItem>
                    <SelectItem value="week">Navigate to Week View</SelectItem>
                    <SelectItem value="day">Navigate to Day View</SelectItem>
                    <SelectItem value="timeGridWeek">
                      Navigate to Time Grid Week
                    </SelectItem>
                    <SelectItem value="timeGridDay">
                      Navigate to Time Grid Day
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  What happens when user clicks "+X more" link
                </p>
              </div>
            )}
          />
        </div>
      </SectionCard>
    </div>
  );
};
