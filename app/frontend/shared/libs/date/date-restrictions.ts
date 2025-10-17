import { getSlotTimes } from "../calendar/calendar-config";
import type { VacationPeriod } from "../state/vacation-context";

export type DateRestrictions = {
	minDate?: Date;
	maxDate?: Date;
	disabledDates?: Date[];
	daysOfWeekDisabled?: number[];
	enabledHours?: number[];
};

function getEnabledHoursForDate(baseDate: Date): number[] | undefined {
	if (!(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) {
		return;
	}

	try {
		const { slotMinTime, slotMaxTime } = getSlotTimes(baseDate, false, "");
		const [minH] = String(slotMinTime || "00:00:00")
			.split(":")
			.map((v) => Number.parseInt(v, 10));
		const [maxH] = String(slotMaxTime || "24:00:00")
			.split(":")
			.map((v) => Number.parseInt(v, 10));
		const startH = Math.max(0, Number.isFinite(minH) ? (minH as number) : 0);
		const endH = Math.min(24, Number.isFinite(maxH) ? (maxH as number) : 24);

		const hours: number[] = [];
		for (let h = startH; h < endH; h++) {
			hours.push(h);
		}
		return hours;
	} catch {
		// Silently handle errors in slot time calculation
		return;
	}
}

export function getDateRestrictions(
	vacationPeriods: VacationPeriod[],
	freeRoam: boolean,
	_baseDate?: Date
): DateRestrictions {
	if (freeRoam) {
		return {};
	}
	const disabledDates: Date[] = [];
	for (const vp of vacationPeriods) {
		const d = new Date(vp.start);
		while (d <= vp.end) {
			disabledDates.push(new Date(d));
			d.setDate(d.getDate() + 1);
		}
	}
	const enabledHours = _baseDate
		? getEnabledHoursForDate(_baseDate)
		: undefined;
	return { disabledDates, enabledHours: enabledHours || [] };
}

export function formatForTempusDominus(r: DateRestrictions) {
	return r;
}
