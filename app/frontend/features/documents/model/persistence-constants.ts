/**
 * Constants for document persistence guard timing and configuration.
 * Centralizes timing values used across the persistence guards system.
 */

/**
 * Buffer added to cleanup delay when calculating automatic cleanup timing.
 * Ensures cleanup happens slightly after the suppression window expires.
 */
export const CLEANUP_DELAY_BUFFER_MS = 100

/**
 * Number of characters to extract from the end of waId for analytics-safe logging.
 * Used to mask sensitive identifiers in error messages.
 */
export const ANALYTICS_SAFE_WA_ID_LENGTH = 4

/**
 * Duration (in milliseconds) for global persistence suppression window
 * when creating a new customer. Prevents persistence triggers during
 * the initial document setup phase.
 */
export const NEW_CUSTOMER_SUPPRESS_WINDOW_MS = 600

/**
 * Cleanup delay (in milliseconds) for global persistence suppression
 * after creating a new customer. Ensures suppression is cleared after
 * the initial setup phase completes.
 */
export const NEW_CUSTOMER_SUPPRESS_CLEANUP_DELAY_MS = 700

/**
 * Delay (in milliseconds) for clearing the autosave suppression flag
 * after clearing a row. Ensures suppression is cleared after the
 * clearing operation completes.
 */
export const CLEAR_ROW_SUPPRESS_CLEANUP_DELAY_MS = 1100
