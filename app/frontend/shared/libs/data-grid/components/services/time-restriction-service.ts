import { isRamadan } from "@shared/libs/calendar/calendar-config";

// Day-of-week constants to avoid magic numbers
const DAY_SUNDAY = 0;
const DAY_FRIDAY = 5;
const DAY_SATURDAY = 6;

// Custom time range validator that can handle complex business rules
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
			const RAMADAN_START_HOUR = 10;
			const RAMADAN_END_HOUR_EXCLUSIVE = 14;
			const isEnabled =
				hour >= RAMADAN_START_HOUR && hour < RAMADAN_END_HOUR_EXCLUSIVE;
			return isEnabled;
		}

		switch (this.dayOfWeek) {
			case DAY_SATURDAY: {
				// Saturday
				// Enable ONLY 16:00-21:59 (4 PM to 9:59 PM) - includes 9 PM itself
				// Disable everything else including 10 PM to 11 PM (22:00-23:00)
				const SATURDAY_START_HOUR = 16;
				const SATURDAY_END_HOUR_INCLUSIVE = 21;
				const isEnabled =
					hour >= SATURDAY_START_HOUR && hour <= SATURDAY_END_HOUR_INCLUSIVE;
				return isEnabled;
			}

			case DAY_FRIDAY: {
				return true;
			}

			case DAY_SUNDAY: {
				// Sunday
				// Enable ONLY 11:00-15:59 (11 AM to 3:59 PM) - includes 11 AM itself
				const SUNDAY_START_HOUR = 11;
				const SUNDAY_END_HOUR_EXCLUSIVE = 16;
				const isEnabledSunday =
					hour >= SUNDAY_START_HOUR && hour < SUNDAY_END_HOUR_EXCLUSIVE;
				return isEnabledSunday;
			}

			default: {
				// Monday-Thursday
				// Enable ONLY 12:00-15:59 (12 PM to 3:59 PM)
				const WEEKDAY_START_HOUR = 12;
				const WEEKDAY_END_HOUR_EXCLUSIVE = 16;
				const isEnabledWeekday =
					hour >= WEEKDAY_START_HOUR && hour < WEEKDAY_END_HOUR_EXCLUSIVE;
				return isEnabledWeekday;
			}
		}
	};

	private isEdgeMinuteAllowedRamadan(hour: number, minute: number): boolean {
		const RAMADAN_EDGE_HOUR_START = 10;
		const RAMADAN_EDGE_HOUR_END = 13;
		if (hour === RAMADAN_EDGE_HOUR_START || hour === RAMADAN_EDGE_HOUR_END) {
			return minute === 0;
		}
		return true;
	}

	private isEdgeMinuteAllowedNonRamadan(hour: number, minute: number): boolean {
		switch (this.dayOfWeek) {
			case DAY_SATURDAY: {
				const SAT_EDGE_HOUR_START = 16;
				const SAT_EDGE_HOUR_END = 21;
				if (hour === SAT_EDGE_HOUR_START || hour === SAT_EDGE_HOUR_END) {
					return minute === 0;
				}
				return true;
			}
			case DAY_SUNDAY: {
				const SUN_EDGE_HOUR_START = 11;
				const SUN_EDGE_HOUR_END = 15;
				if (hour === SUN_EDGE_HOUR_START || hour === SUN_EDGE_HOUR_END) {
					return minute === 0;
				}
				return true;
			}
			default: {
				const WEEKDAY_EDGE_HOUR_START = 12;
				const WEEKDAY_EDGE_HOUR_END = 15;
				if (
					hour === WEEKDAY_EDGE_HOUR_START ||
					hour === WEEKDAY_EDGE_HOUR_END
				) {
					return minute === 0;
				}
				return true;
			}
		}
	}

	// Returns TRUE for ENABLED minutes, FALSE for DISABLED minutes
	validateMinute = (hour: number, minute: number): boolean => {
		// First check if the hour is valid
		if (!this.validateHour(hour)) {
			// If hour is disabled, all minutes in that hour are disabled
			return false;
		}

		// Special restrictions for edge hours - only :00 minutes allowed
		if (this.isRamadanPeriod) {
			return this.isEdgeMinuteAllowedRamadan(hour, minute);
		}
		return this.isEdgeMinuteAllowedNonRamadan(hour, minute);
	};
}

// Monkey patch helper to replace DisabledTimeRange class with our custom validator
export const applyTimeRestrictionMonkeyPatch = (
	customValidator: TimeRestrictionService
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Monkey patching requires multiple fallback paths and error handling
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
				let disableTimeModule: unknown;
				try {
					disableTimeModule = require("react-timekeeper/lib/helpers/disable-time");
				} catch {
					// Module may not be available; will try global or skip patching
				}
				if (disableTimeModule) {
					const mod = disableTimeModule as {
						default?: unknown;
						DisabledTimeRange?: unknown;
					};
					DisabledTimeRangeClass = mod.default || mod.DisabledTimeRange;
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
		let disableTimeModule: unknown;
		try {
			disableTimeModule = require("react-timekeeper/lib/helpers/disable-time");
		} catch {
			// Module may not be available; will use global patch only
		}
		if (disableTimeModule) {
			const module = disableTimeModule as Record<string, unknown>;
			module.default = MonkeyPatchedDisabledTimeRange;
			if (module.DisabledTimeRange) {
				module.DisabledTimeRange = MonkeyPatchedDisabledTimeRange;
			}
		}
	} catch {
		// Silently fail if patching is not possible; the original behavior will be used
	}
};

// Cleanup monkey patch
export const cleanupTimeRestrictionMonkeyPatch = (): void => {
	try {
		if ((globalThis as Record<string, unknown>).OriginalDisabledTimeRange) {
			// Restore the original class globally
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
			} catch {
				// Module may not be available; skip restoration
			}

			// Clear the reference
			(globalThis as Record<string, unknown>).OriginalDisabledTimeRange = null;
		}
	} catch {
		// Silently fail if cleanup is not possible
	}
};
