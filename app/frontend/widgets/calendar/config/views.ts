import type { CalendarOptions } from "@fullcalendar/core";

type ViewsProp = NonNullable<CalendarOptions["views"]>;

// Minimal placeholder for view-specific overrides used by FullCalendar
export function buildViewsProp(): ViewsProp {
	return {
		timeGridWeek: { allDaySlot: false },
		timeGridDay: { allDaySlot: false },
	} as ViewsProp;
}
