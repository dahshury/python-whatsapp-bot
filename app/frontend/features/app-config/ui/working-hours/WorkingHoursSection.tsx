"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Controller, type UseFormReturn, useFieldArray } from "react-hook-form";
import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import type { AppConfigFormValues } from "../../model";
import { createDefaultCustomRange } from "../../model";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Helper function to convert time string (HH:MM) to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Helper function to format time range for display
function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

type WorkingHoursSectionProps = {
  form: UseFormReturn<AppConfigFormValues>;
  className?: string;
};

const WorkingDayToggleGroup = ({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) => {
  const safeValue = Array.isArray(value) ? value : [];

  const toggleDay = (day: number) => {
    const next = safeValue.includes(day)
      ? safeValue.filter((current) => current !== day)
      : [...safeValue, day];
    onChange(next.sort((a, b) => a - b));
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {DAYS_OF_WEEK.map((day) => {
        const active = safeValue.includes(day.value);
        return (
          <Button
            key={day.value}
            onClick={() => toggleDay(day.value)}
            type="button"
            variant={active ? "default" : "outline"}
          >
            {day.label}
          </Button>
        );
      })}
    </div>
  );
};

const DayOfWeekSelect = ({
  value,
  onChange,
  disabledDays,
}: {
  value: number;
  onChange: (day: number) => void;
  disabledDays?: number[];
}) => {
  const disabledSet = useMemo(
    () => new Set(disabledDays ?? []),
    [disabledDays]
  );
  return (
    <Select
      onValueChange={(val) => onChange(Number.parseInt(val, 10))}
      value={String(value)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DAYS_OF_WEEK.map((day) => (
          <SelectItem
            disabled={disabledSet.has(day.value) && day.value !== value}
            key={day.value}
            value={String(day.value)}
          >
            {day.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <Card className="space-y-4 border bg-background/40 p-4">
    <div className="space-y-1">
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    {children}
  </Card>
);

export const WorkingHoursSection = ({
  form,
  className,
}: WorkingHoursSectionProps) => {
  const { control, getValues, watch } = form;

  const daySpecificHoursArray = useFieldArray({
    control,
    name: "daySpecificWorkingHours",
  });

  const slotDurationArray = useFieldArray({
    control,
    name: "daySpecificSlotDurations",
  });

  const customRangeArray = useFieldArray({
    control,
    name: "customCalendarRanges",
  });

  const addDaySpecificHours = () => {
    const usedDays = new Set(
      getValues("daySpecificWorkingHours").map((entry) => entry.dayOfWeek)
    );
    const availableDay =
      DAYS_OF_WEEK.find((day) => !usedDays.has(day.value))?.value ?? 0;
    daySpecificHoursArray.append({
      id: `day-hours-${availableDay}-${Date.now()}`,
      dayOfWeek: availableDay,
      startTime: "09:00",
      endTime: "17:00",
    });
  };

  const addDaySpecificSlotDuration = () => {
    const usedDays = new Set(
      getValues("daySpecificSlotDurations").map((entry) => entry.dayOfWeek)
    );
    const availableDay =
      DAYS_OF_WEEK.find((day) => !usedDays.has(day.value))?.value ?? 0;
    slotDurationArray.append({
      id: `day-slot-${availableDay}-${Date.now()}`,
      dayOfWeek: availableDay,
      slotDurationHours: 2,
    });
  };

  const addCustomRange = () => {
    customRangeArray.append(createDefaultCustomRange());
  };

  return (
    <div className={cn("space-y-4", className)}>
      <SectionCard
        description="Choose working days and default hours"
        title="Working Days"
      >
        <div className="space-y-4">
          <Controller
            control={control}
            name="workingDays"
            render={({ field }) => (
              <WorkingDayToggleGroup
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="defaultWorkingHours.startTime"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Default Start Time</Label>
                  <Input type="time" {...field} />
                </div>
              )}
            />
            <Controller
              control={control}
              name="defaultWorkingHours.endTime"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Default End Time</Label>
                  <Input type="time" {...field} />
                </div>
              )}
            />
          </div>
          <Controller
            control={control}
            name="slotDurationHours"
            render={({ field }) => {
              // Watch startTime and endTime to trigger validation updates
              const startTime = watch("defaultWorkingHours.startTime");
              const endTime = watch("defaultWorkingHours.endTime");
              const duration = field.value;

              // Validate that duration evenly divides the time range
              let errorMessage: string | undefined;
              if (startTime && endTime && duration) {
                const startMinutes = timeToMinutes(startTime);
                const endMinutes = timeToMinutes(endTime);
                const rangeMinutes = endMinutes - startMinutes;
                const durationMinutes = duration * 60;

                if (rangeMinutes > 0 && durationMinutes > 0) {
                  const slots = rangeMinutes / durationMinutes;
                  if (!Number.isInteger(slots) || slots <= 0) {
                    errorMessage = `Duration must evenly divide the time range (${formatTimeRange(startTime, endTime)})`;
                  }
                }
              }

              return (
                <div className="space-y-2">
                  <Label>Default Slot Duration (hours)</Label>
                  <Input
                    max={24}
                    min={1}
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      field.onChange(Number.isNaN(value) ? 0 : value);
                    }}
                  />
                  {errorMessage && (
                    <p className="text-destructive text-sm">{errorMessage}</p>
                  )}
                  {!errorMessage && startTime && endTime && duration && (
                    <p className="text-muted-foreground text-sm">
                      Creates{" "}
                      {Math.floor(
                        (timeToMinutes(endTime) - timeToMinutes(startTime)) /
                          (duration * 60)
                      )}{" "}
                      slots per day
                    </p>
                  )}
                </div>
              );
            }}
          />
        </div>
      </SectionCard>

      <SectionCard
        description="Override hours for specific days"
        title="Day-specific Working Hours"
      >
        <div className="space-y-3">
          {daySpecificHoursArray.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No overrides added yet.
            </p>
          ) : (
            daySpecificHoursArray.fields.map((field, index) => (
              <div
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr,1fr,1fr,auto]"
                key={field.id}
              >
                <Controller
                  control={control}
                  name={`daySpecificWorkingHours.${index}.dayOfWeek`}
                  render={({ field: controllerField }) => (
                    <DayOfWeekSelect
                      disabledDays={getValues("daySpecificWorkingHours")
                        .map((entry, entryIndex) =>
                          entryIndex === index ? null : entry.dayOfWeek
                        )
                        .filter((day): day is number => day !== null)}
                      onChange={controllerField.onChange}
                      value={controllerField.value}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`daySpecificWorkingHours.${index}.startTime`}
                  render={({ field: controllerField }) => (
                    <Input type="time" {...controllerField} />
                  )}
                />
                <Controller
                  control={control}
                  name={`daySpecificWorkingHours.${index}.endTime`}
                  render={({ field: controllerField }) => {
                    // Watch values to trigger validation updates
                    const startTime = watch(
                      `daySpecificWorkingHours.${index}.startTime`
                    );
                    const endTime = controllerField.value;
                    const defaultDuration = watch("slotDurationHours");
                    const daySpecificDuration = watch(
                      "daySpecificSlotDurations"
                    ).find(
                      (d) =>
                        d.dayOfWeek ===
                        watch(`daySpecificWorkingHours.${index}.dayOfWeek`)
                    )?.slotDurationHours;
                    const duration = daySpecificDuration ?? defaultDuration;

                    // Validate that duration evenly divides the time range
                    let errorMessage: string | undefined;
                    if (startTime && endTime && duration) {
                      const startMinutes = timeToMinutes(startTime);
                      const endMinutes = timeToMinutes(endTime);
                      const rangeMinutes = endMinutes - startMinutes;
                      const durationMinutes = duration * 60;

                      if (rangeMinutes > 0 && durationMinutes > 0) {
                        const slots = rangeMinutes / durationMinutes;
                        if (!Number.isInteger(slots) || slots <= 0) {
                          errorMessage = `Time range must be evenly divisible by slot duration (${duration}h)`;
                        }
                      }
                    }

                    return (
                      <div className="space-y-1">
                        <Input type="time" {...controllerField} />
                        {errorMessage && (
                          <p className="text-destructive text-xs">
                            {errorMessage}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Button
                  onClick={() => daySpecificHoursArray.remove(index)}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
          <Button onClick={addDaySpecificHours} type="button" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Day-specific Hours
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        description="Override slot duration for specific days"
        title="Slot Duration Overrides"
      >
        <div className="space-y-3">
          {slotDurationArray.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No slot overrides added yet.
            </p>
          ) : (
            slotDurationArray.fields.map((field, index) => (
              <div
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr,1fr,auto]"
                key={field.id}
              >
                <Controller
                  control={control}
                  name={`daySpecificSlotDurations.${index}.dayOfWeek`}
                  render={({ field: controllerField }) => (
                    <DayOfWeekSelect
                      disabledDays={getValues("daySpecificSlotDurations")
                        .map((entry, entryIndex) =>
                          entryIndex === index ? null : entry.dayOfWeek
                        )
                        .filter((day): day is number => day !== null)}
                      onChange={controllerField.onChange}
                      value={controllerField.value}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`daySpecificSlotDurations.${index}.slotDurationHours`}
                  render={({ field: controllerField }) => {
                    // Watch values to trigger validation updates
                    const dayOfWeek = watch(
                      `daySpecificSlotDurations.${index}.dayOfWeek`
                    );
                    const duration = controllerField.value;

                    // Find the working hours for this day (day-specific or default)
                    const daySpecificHours = watch(
                      "daySpecificWorkingHours"
                    ).find((h) => h.dayOfWeek === dayOfWeek);
                    const startTime =
                      daySpecificHours?.startTime ??
                      watch("defaultWorkingHours.startTime");
                    const endTime =
                      daySpecificHours?.endTime ??
                      watch("defaultWorkingHours.endTime");

                    // Validate that duration evenly divides the time range
                    let errorMessage: string | undefined;
                    if (startTime && endTime && duration) {
                      const startMinutes = timeToMinutes(startTime);
                      const endMinutes = timeToMinutes(endTime);
                      const rangeMinutes = endMinutes - startMinutes;
                      const durationMinutes = duration * 60;

                      if (rangeMinutes > 0 && durationMinutes > 0) {
                        const slots = rangeMinutes / durationMinutes;
                        if (!Number.isInteger(slots) || slots <= 0) {
                          errorMessage = `Must evenly divide ${formatTimeRange(startTime, endTime)}`;
                        }
                      }
                    }

                    return (
                      <div className="space-y-1">
                        <Input
                          max={24}
                          min={1}
                          type="number"
                          {...controllerField}
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value, 10);
                            controllerField.onChange(
                              Number.isNaN(value) ? 0 : value
                            );
                          }}
                        />
                        {errorMessage && (
                          <p className="text-destructive text-xs">
                            {errorMessage}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Button
                  onClick={() => slotDurationArray.remove(index)}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
          <Button
            onClick={addDaySpecificSlotDuration}
            type="button"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Slot Override
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        description="Custom calendar ranges like Ramadan schedules"
        title="Custom Calendar Ranges"
      >
        <div className="space-y-3">
          {customRangeArray.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No custom ranges defined.
            </p>
          ) : (
            customRangeArray.fields.map((field, index) => (
              <div className="space-y-3 rounded-lg border p-3" key={field.id}>
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`customCalendarRanges.${index}.name`}
                    render={({ field: controllerField }) => (
                      <Input placeholder="Range name" {...controllerField} />
                    )}
                  />
                  <Button
                    onClick={() => customRangeArray.remove(index)}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Controller
                    control={control}
                    name={`customCalendarRanges.${index}.startDate`}
                    render={({ field: controllerField }) => (
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" {...controllerField} />
                      </div>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`customCalendarRanges.${index}.endDate`}
                    render={({ field: controllerField }) => (
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" {...controllerField} />
                      </div>
                    )}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Controller
                    control={control}
                    name={`customCalendarRanges.${index}.startTime`}
                    render={({ field: controllerField }) => (
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input type="time" {...controllerField} />
                      </div>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`customCalendarRanges.${index}.endTime`}
                    render={({ field: controllerField }) => (
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input type="time" {...controllerField} />
                      </div>
                    )}
                  />
                </div>
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.workingDays`}
                  render={({ field: controllerField }) => (
                    <WorkingDayToggleGroup
                      onChange={controllerField.onChange}
                      value={controllerField.value}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.slotDurationHours`}
                  render={({ field: controllerField }) => {
                    // Watch values to trigger validation updates
                    const startTime = watch(
                      `customCalendarRanges.${index}.startTime`
                    );
                    const endTime = watch(
                      `customCalendarRanges.${index}.endTime`
                    );
                    const duration = controllerField.value;

                    // Validate that duration evenly divides the time range
                    let errorMessage: string | undefined;
                    if (
                      startTime &&
                      endTime &&
                      duration !== null &&
                      duration !== undefined
                    ) {
                      const startMinutes = timeToMinutes(startTime);
                      const endMinutes = timeToMinutes(endTime);
                      const rangeMinutes = endMinutes - startMinutes;
                      const durationMinutes = duration * 60;

                      if (rangeMinutes > 0 && durationMinutes > 0) {
                        const slots = rangeMinutes / durationMinutes;
                        if (!Number.isInteger(slots) || slots <= 0) {
                          errorMessage = `Must evenly divide ${formatTimeRange(startTime, endTime)}`;
                        }
                      }
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={controllerField.value !== null}
                            onCheckedChange={(checked) =>
                              controllerField.onChange(
                                checked ? 2 : null // default to 2 hours when enabled
                              )
                            }
                          />
                          {controllerField.value !== null && (
                            <Input
                              className="max-w-[120px]"
                              max={24}
                              min={1}
                              onChange={(event) => {
                                const value = Number.parseInt(
                                  event.target.value,
                                  10
                                );
                                controllerField.onChange(
                                  Number.isNaN(value) ? 0 : value
                                );
                              }}
                              type="number"
                              value={controllerField.value}
                            />
                          )}
                          <span className="text-muted-foreground text-sm">
                            Slot duration override
                          </span>
                        </div>
                        {errorMessage && (
                          <p className="text-destructive text-sm">
                            {errorMessage}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
            ))
          )}
          <Button onClick={addCustomRange} type="button" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Range
          </Button>
        </div>
      </SectionCard>
    </div>
  );
};
