export const SUPPRESS_LOCAL_MOVE_MS = 1000
export const SLOT_PREFIX_LEN = 5
export const MIN_SLOT_MINUTES = 60
export const DEFAULT_SLOT_HOURS = 2
export const MANY_EVENTS_THRESHOLD = 6
export const DURATION_PER_RESERVATION_MANY = 15
export const DURATION_PER_RESERVATION_FEW = 20
export const GAP_MINUTES = 1

// Cache and timeout constants
export const CACHE_GC_TIME_MS = 10 * 60 * 1000 // 10 minutes - Keep in cache for 10 minutes after last use
export const LOCAL_OPERATION_TIMEOUT_MS = 15_000 // 15 seconds - Timeout for local operation suppression
export const STATE_SETTLE_DELAY_MS = 50 // 50ms - Small delay to allow state to settle
export const TOAST_TIMEOUT_MS = 5000 // 5 seconds - Toast notification timeout

// Date range defaults
export const DEFAULT_DAYS_BACK = 30 // Default days to look back for reservations
export const DEFAULT_DAYS_FORWARD = 90 // Default days to look forward for reservations

// Date/time constants
export const JANUARY_MONTH_INDEX = 0 // January is month 0 (0-indexed)
export const DECEMBER_MONTH_INDEX = 11 // December is month 11 (0-indexed)
export const LAST_DAY_OF_MONTH = 31 // Last day of December
export const END_OF_DAY_HOUR = 23
export const END_OF_DAY_MINUTE = 59
export const END_OF_DAY_SECOND = 59
export const END_OF_DAY_MILLISECOND = 999

// Week calculation constants
export const SATURDAY_DAY_OF_WEEK = 6 // Saturday is day 6 (0=Sunday, 6=Saturday)
export const DAYS_IN_WEEK = 7
export const MILLISECONDS_PER_DAY = 86_400_000 // 24 * 60 * 60 * 1000
export const DAYS_FROM_SATURDAY_TO_FRIDAY = 6 // Week spans Saturday to Friday


