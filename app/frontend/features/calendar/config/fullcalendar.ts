import { getValidRange } from "@shared/libs/calendar/calendar-config";

export function getGlobalValidRange(
  freeRoam: boolean,
  overrideValidRange?: boolean
): Record<string, unknown> | undefined {
  if (freeRoam) {
    return;
  }
  if (overrideValidRange) {
    return;
  }
  return getValidRange(freeRoam) as unknown as Record<string, unknown>;
}

export function getViewsProp() {
  return {
    multiMonthYear: {
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: "popover" as const,
    },
    dayGridMonth: {
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: "popover" as const,
    },
    dayGridWeek: {
      dayMaxEvents: true,
      dayMaxEventRows: true,
      moreLinkClick: "popover" as const,
    },
    timeGridWeek: {
      allDaySlot: false,
    },
  } as const;
}

export function getConstraintsProp(
  freeRoam: boolean,
  currentView: string
): Record<string, unknown> {
  const enabled =
    !freeRoam && (currentView || "").toLowerCase().includes("timegrid");
  return enabled
    ? ({
        eventConstraint: "businessHours" as const,
        selectConstraint: "businessHours" as const,
      } as const)
    : ({} as const);
}
