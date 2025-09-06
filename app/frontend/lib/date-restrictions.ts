import { getSlotTimes } from "@/lib/calendar-config";
import type { VacationPeriod } from "./vacation-context";

export interface DateRestrictions {
	minDate?: Date;
	maxDate?: Date;
	disabledDates?: Date[];
	daysOfWeekDisabled?: number[];
	enabledHours?: number[];
}

export function getDateRestrictions(
	vacationPeriods: VacationPeriod[],
	freeRoam: boolean,
	_baseDate?: Date,
): DateRestrictions {
	if (freeRoam) return {};
	const disabledDates: Date[] = [];
	for (const vp of vacationPeriods) {
		const d = new Date(vp.start);
		while (d <= vp.end) {
			disabledDates.push(new Date(d));
			d.setDate(d.getDate() + 1);
		}
	}
	let enabledHours: number[] | undefined;
	try {
		if (_baseDate instanceof Date && !Number.isNaN(_baseDate.getTime())) {
			const { slotMinTime, slotMaxTime } = getSlotTimes(_baseDate, false, "");
			const [minH] = String(slotMinTime || "00:00:00")
				.split(":")
				.map((v) => parseInt(v, 10));
			const [maxH] = String(slotMaxTime || "24:00:00")
				.split(":")
				.map((v) => parseInt(v, 10));
			const startH = Number.isFinite(minH) ? minH : 0;
			const endH = Number.isFinite(maxH) ? maxH : 24;
			enabledHours = [];
			for (let h = startH; h < endH; h++) enabledHours.push(h);
		}
	} catch {}
	return { disabledDates, enabledHours };
}

export function formatForTempusDominus(r: DateRestrictions) {
	return r;
}
