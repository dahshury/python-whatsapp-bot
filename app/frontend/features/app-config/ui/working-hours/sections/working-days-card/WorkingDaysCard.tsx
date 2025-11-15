import { useEffect, useMemo } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { cn } from "@/shared/libs/utils";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AppConfigFormValues } from "../../../../model";
import { SectionCard } from "../../components/section-card";
import { WorkingDayMultiSelect } from "../../components/working-day-multi-select";
import {
  computeSlotDurationOptions,
  formatTimeRange,
  timeToMinutes,
} from "../../lib";

type WorkingDaysCardProps = {
  form: UseFormReturn<AppConfigFormValues>;
};

export const WorkingDaysCard = ({ form }: WorkingDaysCardProps) => {
  const { control, getValues, setValue, watch } = form;

  const workingDays = watch("workingDays") || [];
  const defaultStartTime = watch("defaultWorkingHours.startTime");
  const defaultEndTime = watch("defaultWorkingHours.endTime");
  const slotDurationHours = watch("slotDurationHours");

  // Validation helper
  const getCalendarValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!workingDays || workingDays.length === 0) {
      errors.push("At least one working day");
    }
    if (!defaultStartTime) {
      errors.push("Start time");
    }
    if (!defaultEndTime) {
      errors.push("End time");
    }
    if (!slotDurationHours || slotDurationHours <= 0) {
      errors.push("Slot duration");
    }
    return errors;
  };

  const calendarValidationErrors = getCalendarValidationErrors();
  const isCalendarValid = calendarValidationErrors.length === 0;

  const slotDurationOptions = useMemo(
    () => computeSlotDurationOptions(defaultStartTime, defaultEndTime),
    [defaultStartTime, defaultEndTime]
  );

  useEffect(() => {
    if (!slotDurationOptions.length) {
      return;
    }
    const currentValue = getValues("slotDurationHours");
    const firstOption = slotDurationOptions[0];
    if (
      !slotDurationOptions.includes(currentValue) &&
      firstOption !== undefined
    ) {
      setValue("slotDurationHours", firstOption, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [getValues, setValue, slotDurationOptions]);

  return (
    <SectionCard
      description="Choose working days and default hours"
      title="Working Days"
    >
      <div
        className={cn(
          "space-y-4",
          !isCalendarValid &&
            "-m-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4"
        )}
      >
        {!isCalendarValid && (
          <p className="font-medium text-destructive text-xs">
            Missing: {calendarValidationErrors.join(", ")}
          </p>
        )}
        <Controller
          control={control}
          name="workingDays"
          render={({ field }) => {
            const isInvalid = !field.value || field.value.length === 0;
            return (
              <div className="space-y-2">
                <WorkingDayMultiSelect
                  onChange={field.onChange}
                  value={field.value}
                />
                {isInvalid && (
                  <p className="text-destructive text-xs">
                    At least one working day is required *
                  </p>
                )}
              </div>
            );
          }}
        />
        <div className="grid grid-cols-3 gap-3">
          <Controller
            control={control}
            name="defaultWorkingHours.startTime"
            render={({ field }) => {
              const isInvalid = !field.value;
              return (
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    className={isInvalid ? "border-destructive" : ""}
                    type="time"
                    {...field}
                  />
                  {isInvalid && (
                    <p className="text-destructive text-xs">Required</p>
                  )}
                </div>
              );
            }}
          />
          <Controller
            control={control}
            name="defaultWorkingHours.endTime"
            render={({ field }) => {
              const isInvalid = !field.value;
              return (
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input
                    className={isInvalid ? "border-destructive" : ""}
                    type="time"
                    {...field}
                  />
                  {isInvalid && (
                    <p className="text-destructive text-xs">Required</p>
                  )}
                </div>
              );
            }}
          />
          <Controller
            control={control}
            name="slotDurationHours"
            render={({ field }) => {
              const isInvalid = !field.value || field.value <= 0;
              // Use watched values to trigger validation updates
              const startTime = defaultStartTime;
              const endTime = defaultEndTime;
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
                  <Label>Slot Duration *</Label>
                  <Select
                    disabled={slotDurationOptions.length === 0}
                    onValueChange={(value) => field.onChange(Number(value))}
                    {...(slotDurationOptions.includes(field.value)
                      ? { value: String(field.value) }
                      : {})}
                  >
                    <SelectTrigger
                      className={isInvalid ? "border-destructive" : ""}
                      disabled={slotDurationOptions.length === 0}
                    >
                      <SelectValue
                        placeholder={
                          slotDurationOptions.length === 0
                            ? "No valid durations"
                            : "Select duration"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {slotDurationOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option} hour{option > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && (
                    <p className="text-destructive text-xs">Required</p>
                  )}
                  {errorMessage && (
                    <p className="text-destructive text-xs">{errorMessage}</p>
                  )}
                  {!errorMessage && startTime && endTime && duration && (
                    <p className="text-muted-foreground text-xs">
                      Creates{" "}
                      {Math.floor(
                        (timeToMinutes(endTime) - timeToMinutes(startTime)) /
                          (duration * 60)
                      )}{" "}
                      slots per day
                    </p>
                  )}
                  {slotDurationOptions.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Available:{" "}
                      {slotDurationOptions
                        .map((option) => `${option}h`)
                        .join(", ")}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>
    </SectionCard>
  );
};
