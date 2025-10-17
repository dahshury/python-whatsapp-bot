import type { ConstraintsInput } from "@/widgets/calendar/types";

// Constants for calendar constraints
const TIMEGRID_PATTERN = /^timegrid/i;

// Provide props conditionally for timeGrid views; otherwise empty
export function buildConstraintsProp({
	freeRoam,
	currentView,
}: ConstraintsInput) {
	const isTimeGrid = TIMEGRID_PATTERN.test(currentView || "");
	if (!isTimeGrid) {
		return {} as Record<string, unknown>;
	}
	// When not freeRoam, forbid drags outside validRange by setting constraint
	// Leave minimal stub; upstream validRange and guards handle most rules
	return freeRoam ? {} : { eventConstraint: "businessHours" };
}
