/**
 * Day of week constants (0 = Sunday, 6 = Saturday)
 * Shared constants to avoid duplication across the codebase
 */
export const SUNDAY = 0;
export const MONDAY = 1;
export const TUESDAY = 2;
export const WEDNESDAY = 3;
export const THURSDAY = 4;
export const FRIDAY = 5;
export const SATURDAY = 6;

/**
 * Minimum and maximum valid day of week values
 */
export const MIN_DAY_OF_WEEK = SUNDAY;
export const MAX_DAY_OF_WEEK = SATURDAY;

/**
 * Array of all days of the week (Sunday through Saturday)
 */
export const ALL_DAYS_OF_WEEK = [
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
] as const;

/**
 * Default working days (Sunday through Thursday, Saturday)
 * Commonly used in the application
 */
export const DEFAULT_WORKING_DAYS: number[] = [
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  SATURDAY,
];
