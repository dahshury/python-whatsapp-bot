import { isRamadan } from "@shared/libs/calendar/calendar-config";

// Custom time range validator that can handle complex business rules
const RAMADAN_START_HOUR = 10;
const RAMADAN_END_HOUR = 14;
const RAMADAN_LAST_ENABLED_HOUR = 13;
const SATURDAY = 6;
const FRIDAY = 5;
const SUNDAY = 0;
const SATURDAY_START_HOUR = 16;
const SATURDAY_END_HOUR = 21;
const SUNDAY_START_HOUR = 11;
const SUNDAY_END_HOUR = 16;
const WEEKDAY_START_HOUR = 12;
const WEEKDAY_END_HOUR = 16;
const MINUTE_ZERO = 0;

export class TimeRestrictionService {
  selectedDate: Date;
  private readonly dayOfWeek: number;
  private readonly isRamadanPeriod: boolean;

  constructor(selectedDate: Date) {
    this.selectedDate = selectedDate;
    this.dayOfWeek = selectedDate.getDay();
    this.isRamadanPeriod = isRamadan(selectedDate);
  }

  // Returns TRUE for ENABLED hours, FALSE for DISABLED hours
  validateHour = (hour: number): boolean => {
    if (this.isRamadanPeriod) {
      // During Ramadan: Only 10:00-13:59 is enabled (10 AM to 1:59 PM)
      const isEnabled = hour >= RAMADAN_START_HOUR && hour < RAMADAN_END_HOUR;
      return isEnabled;
    }

    switch (this.dayOfWeek) {
      case SATURDAY: {
        // Saturday
        // Enable ONLY 16:00-21:59 (4 PM to 9:59 PM) - includes 9 PM itself
        // Disable everything else including 10 PM to 11 PM (22:00-23:00)
        const isEnabled =
          hour >= SATURDAY_START_HOUR && hour <= SATURDAY_END_HOUR;
        return isEnabled;
      }

      case FRIDAY: // Friday
        return true;

      case SUNDAY: {
        // Sunday
        // Enable ONLY 11:00-15:59 (11 AM to 3:59 PM) - includes 11 AM itself
        const isEnabledSunday =
          hour >= SUNDAY_START_HOUR && hour < SUNDAY_END_HOUR;
        return isEnabledSunday;
      }

      default: {
        // Monday-Thursday
        // Enable ONLY 12:00-15:59 (12 PM to 3:59 PM)
        const isEnabledWeekday =
          hour >= WEEKDAY_START_HOUR && hour < WEEKDAY_END_HOUR;
        return isEnabledWeekday;
      }
    }
  };

  // Returns TRUE for ENABLED minutes, FALSE for DISABLED minutes
  validateMinute = (hour: number, minute: number): boolean => {
    // First check if the hour is valid
    const hourValid = this.validateHour(hour);

    if (!hourValid) {
      return false; // If hour is disabled, all minutes in that hour are disabled
    }

    // Special restrictions for edge hours - only :00 minutes allowed
    if (this.isRamadanPeriod) {
      // During Ramadan: 10:00-13:59 enabled
      // Edge hours: 10 (first) and 13 (last) - only :00 minutes
      if (hour === RAMADAN_START_HOUR || hour === RAMADAN_LAST_ENABLED_HOUR) {
        const isValidMinute = minute === MINUTE_ZERO;
        return isValidMinute;
      }
    } else {
      switch (this.dayOfWeek) {
        case SATURDAY: // Saturday: 16:00-21:59 enabled
          // Edge hours: 16 (first) and 21 (last) - only :00 minutes
          if (hour === SATURDAY_START_HOUR || hour === SATURDAY_END_HOUR) {
            const isValidMinute = minute === MINUTE_ZERO;
            return isValidMinute;
          }
          break;

        case SUNDAY: // Sunday: 11:00-15:59 enabled
          // Edge hours: 11 (first) and 15 (last) - only :00 minutes
          if (hour === SUNDAY_START_HOUR || hour === SUNDAY_END_HOUR) {
            const isValidMinute = minute === MINUTE_ZERO;
            return isValidMinute;
          }
          break;

        default: // Monday-Thursday: 12:00-15:59 enabled
          // Edge hours: 12 (first) and 15 (last) - only :00 minutes
          if (hour === WEEKDAY_START_HOUR || hour === WEEKDAY_END_HOUR) {
            const isValidMinute = minute === MINUTE_ZERO;
            return isValidMinute;
          }
          break;
      }
    }
    return true;
  };
}

// Monkey patch helper to replace DisabledTimeRange class with our custom validator
export const applyTimeRestrictionMonkeyPatch = (
  customValidator: TimeRestrictionService
): void => {
  try {
    // Store reference to original class if not already stored
    if (
      !(globalThis as { OriginalDisabledTimeRange?: unknown })
        .OriginalDisabledTimeRange
    ) {
      // Try to access the DisabledTimeRange from react-timekeeper
      let DisabledTimeRangeClass = (
        globalThis as { DisabledTimeRange?: unknown }
      ).DisabledTimeRange;

      // If not found globally, try to import it
      if (!DisabledTimeRangeClass) {
        try {
          const disableTimeModule = require("react-timekeeper/lib/helpers/disable-time");
          DisabledTimeRangeClass =
            disableTimeModule.default || disableTimeModule.DisabledTimeRange;
        } catch (_importError) {
          // Module import failed; continue without it
        }
      }

      // Store original reference
      if (DisabledTimeRangeClass) {
        (globalThis as Record<string, unknown>).OriginalDisabledTimeRange =
          DisabledTimeRangeClass;
      }
    }

    // Create a monkey-patched class that uses our custom validator
    const MonkeyPatchedDisabledTimeRange = class {
      validateHour: (hour: number) => boolean;
      validateMinute: (hour: number, minute: number) => boolean;

      constructor(_from: string, _to: string) {
        // Ignore the from/to parameters and use our custom validator
        this.validateHour = customValidator.validateHour;
        this.validateMinute = customValidator.validateMinute;
      }
    };

    // Apply the patch globally
    (globalThis as Record<string, unknown>).DisabledTimeRange =
      MonkeyPatchedDisabledTimeRange;

    // Also try to patch the module export if possible
    try {
      const disableTimeModule = require("react-timekeeper/lib/helpers/disable-time");
      if (disableTimeModule) {
        disableTimeModule.default = MonkeyPatchedDisabledTimeRange;
        if (disableTimeModule.DisabledTimeRange) {
          disableTimeModule.DisabledTimeRange = MonkeyPatchedDisabledTimeRange;
        }
      }
    } catch (_moduleError) {
      // Module patching failed; continue
    }
  } catch (_error) {
    // Monkey patch application failed; continue
  }
};

// Cleanup monkey patch
export const cleanupTimeRestrictionMonkeyPatch = (): void => {
  try {
    if ((globalThis as Record<string, unknown>).OriginalDisabledTimeRange) {
      (globalThis as Record<string, unknown>).DisabledTimeRange = (
        globalThis as Record<string, unknown>
      ).OriginalDisabledTimeRange;

      // Also try to restore the module export if possible
      try {
        const disableTimeModule = require("react-timekeeper/lib/helpers/disable-time");
        if (disableTimeModule) {
          disableTimeModule.default = (
            globalThis as Record<string, unknown>
          ).OriginalDisabledTimeRange;
          if (disableTimeModule.DisabledTimeRange) {
            disableTimeModule.DisabledTimeRange = (
              globalThis as Record<string, unknown>
            ).OriginalDisabledTimeRange;
          }
        }
      } catch (_moduleError) {
        // Module restoration failed; continue
      }
      // Clear the reference
      (globalThis as Record<string, unknown>).OriginalDisabledTimeRange = null;
    }
  } catch (_error) {
    // Cleanup failed; continue
  }
};
