// Regex pattern for time format (HH:mm or H:mm) - defined at top level for performance
export const TIME_FORMAT_REGEX = /^(\d{1,2}):(\d{2})$/;

// Time conversion constants
export const HOURS_IN_HALF_DAY = 12;
export const MIDNIGHT_HOUR = 0;
export const DEFAULT_HOUR_12 = 12;

// Toast duration constants in milliseconds
export const DEFAULT_TOAST_DURATION_MS = 3000;
export const ERROR_TOAST_DURATION_MS = 4000;
export const UNDOABLE_TOAST_DURATION_MS = 8000;
export const PROMISE_LOADING_DURATION_MS = 100_000;
export const INFO_TOAST_DURATION_MS = 2500;
export const MAX_MESSAGE_CONTENT_LENGTH = 150;
