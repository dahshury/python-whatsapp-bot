import { isRamadan } from "@/lib/calendar-config";

// Custom time range validator that can handle complex business rules
export class TimeRestrictionService {
	public selectedDate: Date;
	private dayOfWeek: number;
	private isRamadanPeriod: boolean;

	constructor(selectedDate: Date) {
		this.selectedDate = selectedDate;
		this.dayOfWeek = selectedDate.getDay();
		this.isRamadanPeriod = isRamadan(selectedDate);

		console.log("TimeRestrictionService created:", {
			selectedDate,
			dayOfWeek: this.dayOfWeek,
			dayName: [
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			][this.dayOfWeek],
			isRamadanPeriod: this.isRamadanPeriod,
		});
	}

	// Returns TRUE for ENABLED hours, FALSE for DISABLED hours
	validateHour = (hour: number): boolean => {
		console.log(
			`TimeRestrictionService: Checking hour ${hour} for day ${this.dayOfWeek}`,
		);

		if (this.isRamadanPeriod) {
			// During Ramadan: Only 10:00-13:59 is enabled (10 AM to 1:59 PM)
			const isEnabled = hour >= 10 && hour < 14;
			console.log(
				`Ramadan validation: hour ${hour} -> ${isEnabled ? "ENABLED" : "DISABLED"}`,
			);
			return isEnabled;
		}

		switch (this.dayOfWeek) {
			case 6: {
				// Saturday
				// Enable ONLY 16:00-21:59 (4 PM to 9:59 PM) - includes 9 PM itself
				// Disable everything else including 10 PM to 11 PM (22:00-23:00)
				const isEnabled = hour >= 16 && hour <= 21;
				console.log(
					`Saturday validation: hour ${hour} -> ${isEnabled ? "ENABLED" : "DISABLED"} (16-21 enabled, so 9PM is enabled but 10PM+ disabled)`,
				);
				return isEnabled;
			}

			case 5: // Friday
				// No restrictions - all hours enabled
				console.log(
					`Friday validation: hour ${hour} -> ENABLED (no restrictions)`,
				);
				return true;

			case 0: {
				// Sunday
				// Enable ONLY 11:00-15:59 (11 AM to 3:59 PM) - includes 11 AM itself
				const isEnabledSunday = hour >= 11 && hour < 16;
				console.log(
					`Sunday validation: hour ${hour} -> ${isEnabledSunday ? "ENABLED" : "DISABLED"} (11-15 enabled, so 11AM is enabled)`,
				);
				return isEnabledSunday;
			}

			default: {
				// Monday-Thursday
				// Enable ONLY 12:00-15:59 (12 PM to 3:59 PM)
				const isEnabledWeekday = hour >= 12 && hour < 16;
				console.log(
					`Weekday validation: hour ${hour} -> ${isEnabledWeekday ? "ENABLED" : "DISABLED"} (12-15 enabled)`,
				);
				return isEnabledWeekday;
			}
		}
	};

	// Returns TRUE for ENABLED minutes, FALSE for DISABLED minutes
	validateMinute = (hour: number, minute: number): boolean => {
		// First check if the hour is valid
		const hourValid = this.validateHour(hour);
		console.log(
			`TimeRestrictionService: Checking minute ${minute} in hour ${hour} -> hour is ${hourValid ? "ENABLED" : "DISABLED"}`,
		);

		if (!hourValid) {
			return false; // If hour is disabled, all minutes in that hour are disabled
		}

		// Special restrictions for edge hours - only :00 minutes allowed
		if (this.isRamadanPeriod) {
			// During Ramadan: 10:00-13:59 enabled
			// Edge hours: 10 (first) and 13 (last) - only :00 minutes
			if (hour === 10 || hour === 13) {
				const isValidMinute = minute === 0;
				console.log(
					`Ramadan edge hour ${hour}: minute ${minute} -> ${isValidMinute ? "ENABLED" : "DISABLED"} (only :00 allowed)`,
				);
				return isValidMinute;
			}
		} else {
			switch (this.dayOfWeek) {
				case 6: // Saturday: 16:00-21:59 enabled
					// Edge hours: 16 (first) and 21 (last) - only :00 minutes
					if (hour === 16 || hour === 21) {
						const isValidMinute = minute === 0;
						console.log(
							`Saturday edge hour ${hour}: minute ${minute} -> ${isValidMinute ? "ENABLED" : "DISABLED"} (only :00 allowed)`,
						);
						return isValidMinute;
					}
					break;

				case 0: // Sunday: 11:00-15:59 enabled
					// Edge hours: 11 (first) and 15 (last) - only :00 minutes
					if (hour === 11 || hour === 15) {
						const isValidMinute = minute === 0;
						console.log(
							`Sunday edge hour ${hour}: minute ${minute} -> ${isValidMinute ? "ENABLED" : "DISABLED"} (only :00 allowed)`,
						);
						return isValidMinute;
					}
					break;

				default: // Monday-Thursday: 12:00-15:59 enabled
					// Edge hours: 12 (first) and 15 (last) - only :00 minutes
					if (hour === 12 || hour === 15) {
						const isValidMinute = minute === 0;
						console.log(
							`Weekday edge hour ${hour}: minute ${minute} -> ${isValidMinute ? "ENABLED" : "DISABLED"} (only :00 allowed)`,
						);
						return isValidMinute;
					}
					break;
			}
		}

		// For non-edge hours, allow all minutes (subject to coarseMinutes setting)
		console.log(`Non-edge hour ${hour}: minute ${minute} -> ENABLED`);
		return true;
	};
}

// Monkey patch helper to replace DisabledTimeRange class with our custom validator
export const applyTimeRestrictionMonkeyPatch = (
	customValidator: TimeRestrictionService,
): void => {
	console.log(
		"Applying time restriction monkey patch for date:",
		customValidator.selectedDate,
	);

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
					console.warn(
						"Could not import DisabledTimeRange directly, will use global patching",
					);
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

			constructor(from: string, to: string) {
				console.log("MonkeyPatchedDisabledTimeRange created with:", {
					from,
					to,
				});
				console.log(
					"Using custom validator for date:",
					customValidator.selectedDate,
				);
				console.log(
					"Validator dayOfWeek:",
					customValidator.selectedDate.getDay(),
				);

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
			console.log("Module patching not available, using global patch only");
		}

		console.log("Successfully applied monkey patch to DisabledTimeRange");
	} catch (error) {
		console.error("Failed to apply monkey patch:", error);
	}
};

// Cleanup monkey patch
export const cleanupTimeRestrictionMonkeyPatch = (): void => {
	try {
		if ((globalThis as Record<string, unknown>).OriginalDisabledTimeRange) {
			console.log("Cleaning up time restriction monkey patch");

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
			} catch (_moduleError) {
				console.log("Module cleanup not available, global cleanup only");
			}

			// Clear the reference
			(globalThis as Record<string, unknown>).OriginalDisabledTimeRange = null;

			console.log("Successfully cleaned up monkey patch");
		}
	} catch (error) {
		console.warn("Error cleaning up monkey patch:", error);
	}
};
