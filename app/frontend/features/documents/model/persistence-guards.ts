import { CLEANUP_DELAY_BUFFER_MS } from "./persistence-constants";

export type PersistenceGuardRefs = {
  ignorePersistUntilRef: React.MutableRefObject<number>;
  persistTimerRef: React.MutableRefObject<number | null>;
};

/**
 * Utility service for coordinating persistence suppression windows across the
 * documents feature. Consolidates shared logic so the calling hooks can remain
 * declarative and free of repeating timer management code.
 */
export const PersistenceGuardsService = {
  /**
   * Schedules a mute window during which persist triggers should be ignored.
   * Clears any in-flight debounce timer to ensure the mute period starts
   * immediately.
   */
  scheduleIgnoreWindow(refs: PersistenceGuardRefs, durationMs: number): void {
    refs.ignorePersistUntilRef.current = Date.now() + durationMs;
    if (refs.persistTimerRef.current) {
      clearTimeout(refs.persistTimerRef.current);
      refs.persistTimerRef.current = null;
    }
  },

  /**
   * Temporarily suppresses persistence globally (used when the grid performs
   * programmatic edits). Automatically restores after the specified delay.
   */
  scheduleGlobalSuppress(windowMs: number, cleanupDelayMs?: number): void {
    const delay =
      cleanupDelayMs ?? Math.ceil(windowMs + CLEANUP_DELAY_BUFFER_MS);
    try {
      (
        globalThis as { __docSuppressPersistUntil?: number }
      ).__docSuppressPersistUntil = Date.now() + windowMs;
      window.setTimeout(() => {
        try {
          const global = globalThis as {
            __docSuppressPersistUntil?: number;
          };
          // biome-ignore lint/performance/noDelete: Required for exactOptionalPropertyTypes compatibility
          delete global.__docSuppressPersistUntil;
        } catch {
          // Ignore cleanup errors to avoid surfacing benign console noise.
        }
      }, delay);
    } catch {
      // Ignore scheduling errors; persistence triggers will simply proceed normally.
    }
  },
};
