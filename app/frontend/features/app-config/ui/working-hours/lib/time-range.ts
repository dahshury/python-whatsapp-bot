const MAX_SLOT_DURATION_HOURS = 24;

// Helper function to convert time string (HH:MM) to minutes
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function computeSlotDurationOptions(
  startTime?: string,
  endTime?: string
): number[] {
  if (!(startTime && endTime)) {
    return [];
  }
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const rangeMinutes = endMinutes - startMinutes;

  if (rangeMinutes <= 0) {
    return [];
  }

  const maxCandidateHours = Math.min(
    MAX_SLOT_DURATION_HOURS,
    Math.floor(rangeMinutes / 60)
  );
  if (maxCandidateHours < 1) {
    return [];
  }

  const options: number[] = [];
  for (let hours = 1; hours <= maxCandidateHours; hours += 1) {
    if (rangeMinutes % (hours * 60) === 0) {
      options.push(hours);
    }
  }

  return options;
}

// Helper function to format time range for display
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}


