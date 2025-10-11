import {
	type FullCalendarApi,
	type FullCalendarEventChangeInfo,
	handleEventChange,
} from "@shared/libs/calendar/calendar-event-handlers";
import type { CalendarEvent as DataTableCalendarEvent } from "@widgets/data-table-editor/types";
import type { CalendarApi, CalendarEvent } from "@/entities/event";
import type { EventChangeInfo } from "@/services/calendar/calendar-dnd.service";

/**
 * Filter events for calendar display based on free roam mode
 * In free roam mode, show all events including cancelled ones
 * In normal mode, filter out cancelled events
 */
export function filterEventsForCalendar(events: CalendarEvent[], freeRoam: boolean): CalendarEvent[] {
	if (freeRoam) {
		// In free roam mode, show all events
		return events;
	}

	// In normal mode, filter out cancelled events
	return events.filter((event) => {
		const cancelled = event.extendedProps?.cancelled;
		return cancelled !== true;
	});
}

/**
 * Align and sort events for calendar display. For now this is a stable sort by start time.
 */
export function alignAndSortEventsForCalendar(events: CalendarEvent[], _freeRoam: boolean): CalendarEvent[] {
	return [...(events || [])].sort((a, b) => {
		const ta = new Date(a.start).getTime();
		const tb = new Date(b.start).getTime();
		return ta - tb;
	});
}

/**
 * Adjust events for free roam behavior. Currently a pass-through to keep types consistent.
 */
export function processEventsForFreeRoam(events: CalendarEvent[], _freeRoam: boolean): CalendarEvent[] {
	return events;
}

/**
 * Filter events specifically for the data-table editor use case
 * - Exclude conversation events
 * - Exclude cancelled events unless in freeRoam mode
 */
export function filterEventsForDataTable(
	events: CalendarEvent[],
	_context: "data-table",
	freeRoam: boolean
): CalendarEvent[] {
	return (events || []).filter((event) => {
		const isConversation = (event as unknown as { type?: string })?.type === "conversation";
		if (isConversation) return false;
		const cancelled = event.extendedProps?.cancelled === true;
		if (cancelled && !freeRoam) return false;
		return true;
	});
}

/**
 * Transform filtered events into the structure expected by the data-table editor
 * Currently this is a shallow identity mapping to the editor's `CalendarEvent` type.
 */
export function transformEventsForDataTable(events: CalendarEvent[]): DataTableCalendarEvent[] {
	return (events || []).map((ev) => ({
		id: ev.id,
		title: ev.title,
		start: ev.start,
		...(ev.end ? { end: ev.end } : {}),
		extendedProps: { ...(ev.extendedProps || {}) },
		// Best-effort type mapping; editor will not render conversations anyway
		type:
			(
				ev as unknown as {
					type?: "reservation" | "conversation" | "cancellation";
				}
			).type || "reservation",
	}));
}

/**
 * Orchestrate calendar drag and drop operations
 */
export async function orchestrateCalendarDrag(params: {
	calendarApi: CalendarApi;
	info: EventChangeInfo;
	isVacationDate: (date: string) => boolean;
	currentView: string;
	updateEvent: (id: string, event: { id: string; title?: string; start?: string; end?: string }) => void;
	resolveEvent: (id: string) => { extendedProps?: Record<string, unknown> } | undefined;
	isLocalized: boolean;
}): Promise<void> {
	const { calendarApi, info, isVacationDate, currentView, updateEvent, resolveEvent, isLocalized } = params;

	// Call the existing handleEventChange function with the appropriate parameters
	await handleEventChange({
		info: info as unknown as FullCalendarEventChangeInfo,
		isVacationDate,
		isLocalized,
		currentView,
		onRefresh: async () => {
			// Refresh calendar if needed
			(calendarApi as unknown as FullCalendarApi)?.refetchEvents?.();
		},
		getCalendarApi: () => calendarApi as unknown as FullCalendarApi,
		updateEvent: updateEvent as (
			id: string,
			event: { id: string; title?: string; start?: string; end?: string }
		) => void,
		resolveEvent,
	});
}
