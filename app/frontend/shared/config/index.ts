export const runtimeConfig = {
  timezone:
    process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || "Asia/Riyadh",
};

/**
 * Reservation configuration constants
 */
export const RESERVATION_CONFIG = {
  /**
   * Maximum number of reservations allowed by the frontend
   * Note: AI agent uses 5, but frontend allows 6
   */
  MAX_RESERVATIONS_FRONTEND: 6,
} as const;

/**
 * HTTP status code constants
 */
export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Backend connection constants
 */
export const BACKEND_CONNECTION = {
  /**
   * Delay in milliseconds before reloading the page after retry
   */
  RETRY_RELOAD_DELAY_MS: 120,
  /**
   * Maximum length of response preview to store
   */
  RESPONSE_PREVIEW_MAX_LENGTH: 2000,
  /**
   * Connection stability detection settings
   * Designed to handle slow EC2 instances and unreliable networks
   */
  STABILITY: {
    /**
     * Number of consecutive failures before marking as disconnected
     * Higher = more tolerant of transient failures
     */
    FAILURE_THRESHOLD: 3,
    /**
     * Time window in ms - failures within this window count as consecutive
     * Larger window = more sensitive to intermittent issues
     */
    FAILURE_WINDOW_MS: 10_000, // 10 seconds
    /**
     * Debounce delay in ms before showing disconnection overlay
     * Prevents UI flickering on temporary issues
     */
    DEBOUNCE_DELAY_MS: 2000, // 2 seconds
    /**
     * Grace period after first failure before counting failures
     * Gives slow networks time to complete initial requests
     */
    GRACE_PERIOD_MS: 5000, // 5 seconds
    /**
     * Time after last failure before resetting failure count
     * Prevents accumulated failures from past connection issues
     */
    FAILURE_RESET_MS: 30_000, // 30 seconds
  },
  /**
   * Fetch timeout settings for slow networks
   */
  TIMEOUT: {
    /**
     * Default timeout for backend requests
     * Increased to handle slow EC2 instances
     */
    DEFAULT_MS: 30_000, // 30 seconds
    /**
     * Extended timeout for critical operations
     */
    EXTENDED_MS: 60_000, // 60 seconds
  },
} as const;

/**
 * UI prefetch constants
 */
export const PREFETCH = {
  /**
   * Delay in milliseconds before marking prefetch as complete
   */
  PREFETCH_COMPLETE_DELAY_MS: 100,
} as const;

export { SYSTEM_AGENT } from "./system-agent";
