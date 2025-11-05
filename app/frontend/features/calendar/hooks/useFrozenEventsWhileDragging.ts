import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/entities/event";

/**
 * Keep rendered events stable while dragging to prevent snap-back when external updates arrive.
 */
export function useFrozenEventsWhileDragging(
  sanitizedEvents: CalendarEvent[]
): CalendarEvent[] {
  const frozenEventsRef = useRef<CalendarEvent[]>([]);
  const previousSanitizedEventsRef = useRef<CalendarEvent[]>(sanitizedEvents);
  const [renderEvents, setRenderEvents] =
    useState<CalendarEvent[]>(sanitizedEvents);

  useEffect(() => {
    // Skip update if events haven't actually changed (same reference or same content)
    if (previousSanitizedEventsRef.current === sanitizedEvents) {
      return;
    }

    // Check if events actually changed by comparing lengths and IDs
    const previousEvents = previousSanitizedEventsRef.current;
    const eventsChanged =
      previousEvents.length !== sanitizedEvents.length ||
      previousEvents.some(
        (event, index) => event.id !== sanitizedEvents[index]?.id
      );

    if (!eventsChanged) {
      // Events are the same, just update the ref to prevent future comparisons
      previousSanitizedEventsRef.current = sanitizedEvents;
      return;
    }

    try {
      const isDragging =
        (globalThis as { __isCalendarDragging?: boolean })
          .__isCalendarDragging === true;

      if (isDragging) {
        frozenEventsRef.current = sanitizedEvents;
        setRenderEvents(frozenEventsRef.current);
      } else {
        setRenderEvents(sanitizedEvents);
      }
      previousSanitizedEventsRef.current = sanitizedEvents;
    } catch {
      setRenderEvents(sanitizedEvents);
      previousSanitizedEventsRef.current = sanitizedEvents;
    }
  }, [sanitizedEvents]);

  return renderEvents;
}
