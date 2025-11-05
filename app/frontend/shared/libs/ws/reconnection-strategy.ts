// Reconnection delay constants
const MAX_RECONNECTION_DELAY_MS = 15_000;
const MAX_JITTER_MS = 300;

/**
 * Calculates reconnection delay with exponential backoff and jitter
 * @param reconnectInterval Base interval in milliseconds
 * @param attemptNumber Current reconnection attempt number (1-based)
 * @returns Delay in milliseconds (capped at MAX_RECONNECTION_DELAY_MS + random jitter up to MAX_JITTER_MS)
 */
export function calculateReconnectionDelay(
  reconnectInterval: number,
  attemptNumber: number
): number {
  const base = reconnectInterval * Math.max(1, attemptNumber);
  const delay =
    Math.min(base, MAX_RECONNECTION_DELAY_MS) +
    Math.floor(Math.random() * MAX_JITTER_MS);
  return delay;
}
