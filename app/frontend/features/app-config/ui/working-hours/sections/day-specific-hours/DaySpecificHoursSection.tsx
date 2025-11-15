import { Plus, Trash2 } from "lucide-react";
import {
  Controller,
  type UseFormReturn,
  type useFieldArray,
} from "react-hook-form";
import { Button } from "@/shared/ui/button";
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
import { DayOfWeekSelect } from "../../components/day-of-week-select";
import { SectionCard } from "../../components/section-card";
import { useSlotDurationManager } from "../../hooks";
import { computeSlotDurationOptions, timeToMinutes } from "../../lib";

type DaySpecificHoursSectionProps = {
  form: UseFormReturn<AppConfigFormValues>;
  daySpecificHoursArray: ReturnType<
    typeof useFieldArray<AppConfigFormValues, "daySpecificWorkingHours">
  >;
};

export const DaySpecificHoursSection = ({
  form,
  daySpecificHoursArray,
}: DaySpecificHoursSectionProps) => {
  const { control, getValues, watch } = form;
  const daySpecificSlotDurations = watch("daySpecificSlotDurations") ?? [];

  const slotDurationManager = useSlotDurationManager(form);
  const {
    setSlotDurationForDay,
    updateSlotDurationDay,
    removeSlotDurationForDay,
  } = slotDurationManager;

  const handleAddDaySpecificHours = () => {
    slotDurationManager.addDaySpecificHours(daySpecificHoursArray);
  };

  return (
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
          daySpecificHoursArray.fields.map((field, index) => {
            // Calculate values at map level so they're accessible to all components
            const startTime = watch(
              `daySpecificWorkingHours.${index}.startTime`
            );
            const endTime = watch(`daySpecificWorkingHours.${index}.endTime`);
            const dayOfWeek = watch(
              `daySpecificWorkingHours.${index}.dayOfWeek`
            );
            const defaultDuration = watch("slotDurationHours");
            const daySpecificDuration = daySpecificSlotDurations.find(
              (d: { dayOfWeek: number }) => d.dayOfWeek === dayOfWeek
            )?.slotDurationHours;
            const duration = daySpecificDuration ?? defaultDuration;
            const slotOptions = computeSlotDurationOptions(startTime, endTime);
            const hasValidSlotSelection =
              typeof duration === "number" && slotOptions.includes(duration);

            return (
              <div className="space-y-3 rounded-lg border p-3" key={field.id}>
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <div className="flex items-center justify-between gap-2">
                    <Controller
                      control={control}
                      name={`daySpecificWorkingHours.${index}.dayOfWeek`}
                      render={({ field: controllerField }) => (
                        <div className="flex-1">
                          <DayOfWeekSelect
                            disabledDays={getValues("daySpecificWorkingHours")
                              .map(
                                (
                                  entry: { dayOfWeek: number },
                                  entryIndex: number
                                ) =>
                                  entryIndex === index ? null : entry.dayOfWeek
                              )
                              .filter((day): day is number => day !== null)}
                            onChange={(value) => {
                              const previousDay = controllerField.value;
                              controllerField.onChange(value);
                              updateSlotDurationDay(previousDay, value);
                            }}
                            value={controllerField.value}
                          />
                        </div>
                      )}
                    />
                    <Button
                      onClick={() => {
                        const dayOfWeekToRemove = getValues(
                          `daySpecificWorkingHours.${index}.dayOfWeek`
                        );
                        daySpecificHoursArray.remove(index);
                        if (typeof dayOfWeekToRemove === "number") {
                          removeSlotDurationForDay(dayOfWeekToRemove);
                        }
                      }}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Controller
                    control={control}
                    name={`daySpecificWorkingHours.${index}.startTime`}
                    render={({ field: controllerField }) => (
                      <div className="space-y-1">
                        <Label className="text-xs">Start</Label>
                        <Input type="time" {...controllerField} />
                      </div>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`daySpecificWorkingHours.${index}.endTime`}
                    render={({ field: controllerField }) => {
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
                          <Label className="text-xs">End</Label>
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
                  <div className="space-y-1">
                    <Label className="text-xs">Slot Duration</Label>
                    <Select
                      disabled={slotOptions.length === 0}
                      onValueChange={(value) => {
                        const parsed = Number.parseInt(value, 10);
                        if (!Number.isNaN(parsed)) {
                          setSlotDurationForDay(dayOfWeek, parsed);
                        }
                      }}
                      {...(hasValidSlotSelection && typeof duration === "number"
                        ? { value: String(duration) }
                        : {})}
                    >
                      <SelectTrigger disabled={slotOptions.length === 0}>
                        <SelectValue
                          placeholder={
                            slotOptions.length === 0
                              ? "No valid durations"
                              : "Select duration"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {slotOptions.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option} hour{option > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {startTime && endTime && duration && (
                      <p className="text-muted-foreground text-xs">
                        Creates{" "}
                        {Math.floor(
                          (timeToMinutes(endTime) - timeToMinutes(startTime)) /
                            (duration * 60)
                        )}{" "}
                        slots per day
                      </p>
                    )}
                    {slotOptions.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Available:{" "}
                        {slotOptions.map((option) => `${option}h`).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <Button
          onClick={handleAddDaySpecificHours}
          type="button"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Day-specific Hours
        </Button>
      </div>
    </SectionCard>
  );
};
