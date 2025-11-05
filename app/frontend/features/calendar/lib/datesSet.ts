import type { DatesSetArg } from "@fullcalendar/core";

type CalendarApiLike = { updateSize?: () => void };

const UPDATE_SIZE_DELAY_MS = 250;

export function createDatesSet(
  getApi: () => CalendarApiLike | undefined,
  onDatesSet?: (info: DatesSetArg) => void,
  onNavDate?: (date: Date) => void
) {
  return (info: DatesSetArg) => {
    setTimeout(() => {
      try {
        const api = getApi();
        api?.updateSize?.();
      } catch {
        // Ignore errors in calendar API size update
      }
    }, UPDATE_SIZE_DELAY_MS);

    if (onDatesSet) {
      onDatesSet(info);
    }

    // Always fire onNavDate for all views (required for TanStack Query period tracking)
    if (onNavDate) {
      onNavDate(info.view.currentStart);
    }
  };
}
