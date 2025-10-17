import { getValidRange } from "@shared/libs/calendar/calendar-config";

type BuildValidRangeInput = {
	freeRoam: boolean;
	overrideValidRange?: unknown;
	currentView?: string;
};

export function buildValidRangeProp({
	freeRoam,
	overrideValidRange,
	currentView,
}: BuildValidRangeInput) {
	if (currentView === "multiMonthYear") {
		return {};
	}
	if (freeRoam) {
		return {};
	}
	if (overrideValidRange) {
		return {};
	}
	const globalValidRangeFunction = getValidRange(freeRoam);
	return globalValidRangeFunction
		? { validRange: globalValidRangeFunction }
		: {};
}
