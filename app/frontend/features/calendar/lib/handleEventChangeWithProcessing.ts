import type { EventChangeArg } from "@fullcalendar/core";

export function createEventChangeHandler(
  onEventChange?: (info: EventChangeArg) => void
) {
  return (info: EventChangeArg) => {
    const eventId: string | undefined = info?.event?.id;
    if (!eventId) {
      return;
    }
    try {
      const depth = Number(
        (globalThis as { __suppressEventChangeDepth?: number })
          .__suppressEventChangeDepth ?? 0
      );
      if (depth > 0) {
        return;
      }
    } catch {
      // Ignore errors accessing global suppression depth
    }
    onEventChange?.(info);
  };
}
