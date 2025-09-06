export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Riyadh";
export const SLOT_DURATION_HOURS = 2; // Streamlit used 2-hour slot intervals

interface BusinessHoursRule {
	daysOfWeek: number[];
	startTime: string;
	endTime: string;
	startRecur?: string;
	endRecur?: string;
}

interface ValidRange {
	start: Date;
}

export function getTimezone(): string {
	return TIMEZONE;
}

export function getBusinessHours(freeRoam: boolean): BusinessHoursRule[] {
	if (freeRoam) return [];
	// Standard business hours: Sun-Thu and Sat 11:00-17:00, Ramadan 10:00-16:00
	const ramadanRules = getRamadanBusinessHours();
	const normalRules = subtractRamadanFromNormal(
		[
			// Sun(0)-Thu(4) and Sat(6): 11:00-17:00
			{
				daysOfWeek: [0, 1, 2, 3, 4, 6],
				startTime: "11:00",
				endTime: "17:00",
				startRecur: "2022-01-01",
				endRecur: "2031-12-31",
			},
		],
		ramadanRules,
	);
	return [...ramadanRules, ...normalRules];
}

export function getValidRange(freeRoam: boolean): ValidRange | undefined {
	if (freeRoam) return undefined;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return { start: today };
}

export function getSlotTimes(date: Date, freeRoam: boolean, _view: string) {
	if (freeRoam) return { slotMinTime: "00:00:00", slotMaxTime: "24:00:00" };
	if (isRamadan(date))
		return { slotMinTime: "10:00:00", slotMaxTime: "16:00:00" };
	const day = date.getDay(); // 0=Sun..6=Sat
	if (day >= 0 && day <= 4)
		return { slotMinTime: "11:00:00", slotMaxTime: "17:00:00" };
	// Saturday uses same hours as weekdays, Friday hidden elsewhere
	return { slotMinTime: "11:00:00", slotMaxTime: "17:00:00" };
}

// Simple Ramadan check using approximate Hijri conversion boundaries is handled on backend.
// Here, treat Hijri month 9 via environment override window when available.
export function isRamadan(date: Date): boolean {
	// Use env-configured window if present (approximate; backend is authoritative)
	try {
		const startStr = process.env.NEXT_PUBLIC_RAMADAN_START;
		const endStr = process.env.NEXT_PUBLIC_RAMADAN_END;
		if (startStr && endStr) {
			const start = new Date(`${startStr}T00:00:00`);
			const end = new Date(`${endStr}T23:59:59`);
			if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
				return (
					date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
				);
			}
		}
	} catch {}
	// Default: treat as non-Ramadan in UI
	return false;
}

function getRamadanBusinessHours() {
	// Build yearly recurring rules similar to old implementation (2022-2030)
	// Frontend-only: we cannot precisely compute Hijri; use backend vacation/background events for visuals.
	return [] as BusinessHoursRule[];
}

function subtractRamadanFromNormal(
	normal: BusinessHoursRule[],
	_ramadan: BusinessHoursRule[],
) {
	// With no explicit ranges computed here, just return normal; backend ensures slot constraints during Ramadan.
	return normal;
}
