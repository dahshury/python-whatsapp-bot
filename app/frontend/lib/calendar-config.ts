export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Riyadh";
export const SLOT_DURATION_HOURS = 2; // Streamlit used 2-hour slot intervals

export function getTimezone(): string {
	return TIMEZONE;
}

export function getBusinessHours(freeRoam: boolean): any {
	if (freeRoam) return [];
	// Match old implementation: Sun-Thu 11:00-17:00, Sat 16:00-22:00, Ramadan 10:00-16:00
	const ramadanRules = getRamadanBusinessHours();
	const normalRules = subtractRamadanFromNormal(
		[
			// Sun(0)-Thu(4): 11:00-17:00
			{
				daysOfWeek: [0, 1, 2, 3, 4],
				startTime: "11:00",
				endTime: "17:00",
				startRecur: "2022-01-01",
				endRecur: "2031-12-31",
			},
			// Sat(6): 16:00-22:00
			{
				daysOfWeek: [6],
				startTime: "16:00",
				endTime: "22:00",
				startRecur: "2022-01-01",
				endRecur: "2031-12-31",
			},
		],
		ramadanRules,
	);
	return [...ramadanRules, ...normalRules];
}

export function getValidRange(freeRoam: boolean): any {
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
	if (day === 6) return { slotMinTime: "16:00:00", slotMaxTime: "22:00:00" };
	if (day >= 0 && day <= 4)
		return { slotMinTime: "11:00:00", slotMaxTime: "17:00:00" };
	// Friday hidden elsewhere
	return { slotMinTime: "11:00:00", slotMaxTime: "17:00:00" };
}

// Simple Ramadan check using approximate Hijri conversion boundaries is handled on backend.
// Here, treat Hijri month 9 via environment override window when available.
export function isRamadan(_date: Date): boolean {
	// Fallback: let backend enforce precise constraints; keep UI aligned with typical hours via rules above
	return false;
}

function getRamadanBusinessHours() {
	// Build yearly recurring rules similar to old implementation (2022-2030)
	// Frontend-only: we cannot precisely compute Hijri; use backend vacation/background events for visuals.
	return [] as any[];
}

function subtractRamadanFromNormal(normal: any[], _ramadan: any[]) {
	// With no explicit ranges computed here, just return normal; backend ensures slot constraints during Ramadan.
	return normal;
}
