import type { EventChangeArg } from "@fullcalendar/core";
import { useCallback, useRef } from "react";

type BatchedEventChangeHandler = (info: EventChangeArg) => void;

/**
 * Creates a debounced/batched event change handler that waits for all property
 * updates to settle before triggering the actual mutation. This prevents multiple
 * WebSocket calls when updating multiple properties (title, type, dates, etc.) on
 * the same event.
 *
 * @param onEventChange - The actual event change handler to call after batching
 * @param debounceMs - Time to wait for additional updates (default: 50ms)
 */
export function useBatchedEventChange(
  onEventChange: (info: EventChangeArg) => void | Promise<void>,
  debounceMs = 50
): BatchedEventChangeHandler {
  const pendingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingInfoRef = useRef<Map<string, EventChangeArg>>(new Map());

  const handler = useCallback(
    (info: EventChangeArg) => {
      const eventId = info.event?.id;
      if (!eventId) {
        // If no event ID, process immediately
        onEventChange(info);
        return;
      }

      // Clear existing timer for this event
      const existingTimer = pendingTimersRef.current.get(eventId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Store the latest info for this event
      pendingInfoRef.current.set(eventId, info);

      // Set a new timer to process after debounce period
      const timer = setTimeout(() => {
        const latestInfo = pendingInfoRef.current.get(eventId);
        if (latestInfo) {
          // Process the batched change
          onEventChange(latestInfo);

          // Clean up
          pendingTimersRef.current.delete(eventId);
          pendingInfoRef.current.delete(eventId);
        }
      }, debounceMs);

      pendingTimersRef.current.set(eventId, timer);
    },
    [onEventChange, debounceMs]
  );

  // Use effect cleanup would be done in the component using this hook
  // We return both the handler and cleanup function
  return handler;
}

/**
 * Hook that provides both the batched handler and cleanup
 */
export function useBatchedEventChangeWithCleanup(
  onEventChange: (info: EventChangeArg) => void | Promise<void>,
  debounceMs = 50
) {
  const pendingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingInfoRef = useRef<Map<string, EventChangeArg>>(new Map());

  const cleanup = useCallback(() => {
    for (const timer of pendingTimersRef.current.values()) {
      clearTimeout(timer);
    }
    pendingTimersRef.current.clear();
    pendingInfoRef.current.clear();
  }, []);

  const handler = useCallback(
    (info: EventChangeArg) => {
      const depth =
        (globalThis as { __suppressEventChangeDepth?: number })
          .__suppressEventChangeDepth ?? 0;
      if (depth > 0) {
        return;
      }

      const eventId = info.event?.id;

      if (!eventId) {
        onEventChange(info);
        return;
      }

      const existingTimer = pendingTimersRef.current.get(eventId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      pendingInfoRef.current.set(eventId, info);

      const timer = setTimeout(() => {
        const latestInfo = pendingInfoRef.current.get(eventId);
        if (latestInfo) {
          onEventChange(latestInfo);
          pendingTimersRef.current.delete(eventId);
          pendingInfoRef.current.delete(eventId);
        }
      }, debounceMs);

      pendingTimersRef.current.set(eventId, timer);
    },
    [onEventChange, debounceMs]
  );

  return { handler, cleanup };
}
