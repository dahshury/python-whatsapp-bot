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
import { createDefaultCustomRange } from "../../../../model";
import { SectionCard } from "../../components/section-card";
import { WorkingDayMultiSelect } from "../../components/working-day-multi-select";
import {
  computeSlotDurationOptions,
  formatTimeRange,
  timeToMinutes,
} from "../../lib";

type CustomCalendarRangesSectionProps = {
  form: UseFormReturn<AppConfigFormValues>;
  customRangeArray: ReturnType<
    typeof useFieldArray<AppConfigFormValues, "customCalendarRanges">
  >;
};

export const CustomCalendarRangesSection = ({
  form,
  customRangeArray,
}: CustomCalendarRangesSectionProps) => {
  const { control, watch } = form;

  const addCustomRange = () => {
    customRangeArray.append(createDefaultCustomRange());
  };

  return (
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
              <div className="space-y-2">
                <Label>Range Name</Label>
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`customCalendarRanges.${index}.name`}
                    render={({ field: controllerField }) => (
                      <Input
                        className="flex-1"
                        placeholder="Range name"
                        {...controllerField}
                      />
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
              </div>
              <div className="space-y-2">
                <Label>Working Days</Label>
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.workingDays`}
                  render={({ field: controllerField }) => (
                    <WorkingDayMultiSelect
                      onChange={controllerField.onChange}
                      value={controllerField.value}
                    />
                  )}
                />
              </div>
              <div className="flex flex-row gap-3">
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.startDate`}
                  render={({ field: controllerField }) => (
                    <div className="flex-1 space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" {...controllerField} />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.endDate`}
                  render={({ field: controllerField }) => (
                    <div className="flex-1 space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" {...controllerField} />
                    </div>
                  )}
                />
              </div>
              <div className="flex flex-row gap-3">
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.startTime`}
                  render={({ field: controllerField }) => (
                    <div className="flex-1 space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" {...controllerField} />
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name={`customCalendarRanges.${index}.endTime`}
                  render={({ field: controllerField }) => (
                    <div className="flex-1 space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" {...controllerField} />
                    </div>
                  )}
                />
              </div>
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
                  const slotOptions = computeSlotDurationOptions(
                    startTime,
                    endTime
                  );

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
                      <Label>Slot Duration</Label>
                      <Select
                        onValueChange={(value) => {
                          if (value === "none") {
                            controllerField.onChange(null);
                          } else {
                            controllerField.onChange(
                              Number.parseInt(value, 10)
                            );
                          }
                        }}
                        value={
                          duration !== null && duration !== undefined
                            ? String(duration)
                            : "none"
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            None (use default)
                          </SelectItem>
                          {slotOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option} hour{option > 1 ? "s" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {startTime &&
                        endTime &&
                        duration !== null &&
                        duration !== undefined && (
                          <p className="text-muted-foreground text-xs">
                            Creates{" "}
                            {Math.floor(
                              (timeToMinutes(endTime) -
                                timeToMinutes(startTime)) /
                                (duration * 60)
                            )}{" "}
                            slots per day
                          </p>
                        )}
                      {errorMessage && (
                        <p className="text-destructive text-xs">
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
  );
};
