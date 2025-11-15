import { type UseFormReturn, useFieldArray } from "react-hook-form";
import type {
  AppConfigFormValues,
  DaySpecificSlotDurationFormValue,
} from "../../../model";
import { DAYS_OF_WEEK } from "../lib";

// Constants for random ID generation
const RANDOM_ID_RADIX = 36;
const RANDOM_ID_START_INDEX = 2;
const RANDOM_ID_LENGTH = 5;

export const useSlotDurationManager = (
  form: UseFormReturn<AppConfigFormValues>
) => {
  const { getValues } = form;

  const {
    append: appendDaySpecificSlotDuration,
    remove: removeDaySpecificSlotDuration,
    update: updateDaySpecificSlotDuration,
  } = useFieldArray({
    control: form.control,
    name: "daySpecificSlotDurations",
  });

  const createSlotDurationEntry = (
    dayOfWeek: number,
    slotDuration?: number
  ) => ({
    id: `day-slot-${dayOfWeek}-${Date.now()}-${Math.random()
      .toString(RANDOM_ID_RADIX)
      .slice(RANDOM_ID_START_INDEX, RANDOM_ID_START_INDEX + RANDOM_ID_LENGTH)}`,
    dayOfWeek,
    slotDurationHours: slotDuration ?? getValues("slotDurationHours") ?? 1,
  });

  const findSlotDurationIndex = (dayOfWeek: number) =>
    getValues("daySpecificSlotDurations").findIndex(
      (entry: { dayOfWeek: number }) => entry.dayOfWeek === dayOfWeek
    );

  const ensureSlotDurationForDay = (
    dayOfWeek: number,
    slotDurationHours?: number
  ) => {
    const index = findSlotDurationIndex(dayOfWeek);
    if (index !== -1) {
      if (slotDurationHours !== undefined) {
        const current = getValues("daySpecificSlotDurations")[index];
        if (current && typeof current === "object" && "id" in current) {
          updateDaySpecificSlotDuration(index, {
            ...current,
            slotDurationHours,
          } as DaySpecificSlotDurationFormValue);
        }
      }
      return index;
    }
    appendDaySpecificSlotDuration(
      createSlotDurationEntry(dayOfWeek, slotDurationHours)
    );
    return findSlotDurationIndex(dayOfWeek);
  };

  const setSlotDurationForDay = (
    dayOfWeek: number,
    slotDurationHours: number
  ) => {
    ensureSlotDurationForDay(dayOfWeek, slotDurationHours);
  };

  const updateSlotDurationDay = (previousDay: number, nextDay: number) => {
    const index = findSlotDurationIndex(previousDay);
    if (index === -1) {
      ensureSlotDurationForDay(nextDay);
      return;
    }
    const current = getValues("daySpecificSlotDurations")[index];
    if (current && typeof current === "object" && "id" in current) {
      updateDaySpecificSlotDuration(index, {
        ...current,
        dayOfWeek: nextDay,
      } as DaySpecificSlotDurationFormValue);
    }
  };

  const removeSlotDurationForDay = (dayOfWeek: number) => {
    const index = findSlotDurationIndex(dayOfWeek);
    if (index !== -1) {
      removeDaySpecificSlotDuration(index);
    }
  };

  const addDaySpecificHours = (
    daySpecificHoursArray: ReturnType<
      typeof useFieldArray<AppConfigFormValues, "daySpecificWorkingHours">
    >
  ) => {
    const usedDays = new Set(
      getValues("daySpecificWorkingHours").map(
        (entry: { dayOfWeek: number }) => entry.dayOfWeek
      )
    );
    const availableDay =
      DAYS_OF_WEEK.find((day) => !usedDays.has(day.value))?.value ?? 0;
    daySpecificHoursArray.append({
      id: `day-hours-${availableDay}-${Date.now()}`,
      dayOfWeek: availableDay,
      startTime: "09:00",
      endTime: "17:00",
    });
    ensureSlotDurationForDay(availableDay);
  };

  return {
    ensureSlotDurationForDay,
    setSlotDurationForDay,
    updateSlotDurationDay,
    removeSlotDurationForDay,
    addDaySpecificHours,
  };
};
