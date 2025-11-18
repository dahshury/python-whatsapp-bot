export const DEFAULT_EVENT_DURATION_MINUTES = 20;
export const MIN_EVENT_DURATION_MINUTES = 5;
export const MAX_EVENT_DURATION_MINUTES = 480;

export const DEFAULT_SLOT_DURATION_HOURS = 2;
export const MIN_SLOT_DURATION_MINUTES = 15;
export const DEFAULT_SLOT_DURATION_MINUTES = DEFAULT_SLOT_DURATION_HOURS * 60;

const hoursToMinutes = (hours?: number | null): number | null => {
  if (typeof hours !== "number" || Number.isNaN(hours) || hours <= 0) {
    return null;
  }
  return Math.round(hours * 60);
};

export const getEffectiveSlotDurationMinutes = (params: {
  defaultSlotDurationHours?: number | null;
  daySpecificSlotDurations?: Array<{ slotDurationHours?: number | null }>;
  customCalendarRanges?: Array<{ slotDurationHours?: number | null }>;
}): number => {
  const pool: number[] = [];
  const collect = (value?: number | null) => {
    const minutes = hoursToMinutes(value);
    if (minutes !== null) {
      pool.push(minutes);
    }
  };

  collect(params.defaultSlotDurationHours);
  for (const entry of params.daySpecificSlotDurations ?? []) {
    collect(entry?.slotDurationHours);
  }
  for (const range of params.customCalendarRanges ?? []) {
    collect(range?.slotDurationHours);
  }

  if (pool.length === 0) {
    return DEFAULT_SLOT_DURATION_MINUTES;
  }

  return Math.max(MIN_SLOT_DURATION_MINUTES, Math.min(...pool));
};

export const clampDurationMinutes = (value?: number | null): number => {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return DEFAULT_EVENT_DURATION_MINUTES;
  }
  if (value < MIN_EVENT_DURATION_MINUTES) {
    return MIN_EVENT_DURATION_MINUTES;
  }
  if (value > MAX_EVENT_DURATION_MINUTES) {
    return MAX_EVENT_DURATION_MINUTES;
  }
  return value;
};

export const computeCapacityCeiling = (
  slotDurationMinutes: number,
  durationMinutes: number
): number => {
  const safeSlot = Math.max(
    MIN_SLOT_DURATION_MINUTES,
    Number.isFinite(slotDurationMinutes)
      ? slotDurationMinutes
      : DEFAULT_SLOT_DURATION_MINUTES
  );
  const safeDuration = Math.max(
    MIN_EVENT_DURATION_MINUTES,
    Number.isFinite(durationMinutes)
      ? durationMinutes
      : MIN_EVENT_DURATION_MINUTES
  );
  const capacity = Math.floor(safeSlot / safeDuration);
  return capacity < 1 ? 1 : capacity;
};
