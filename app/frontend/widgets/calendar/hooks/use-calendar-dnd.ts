import type { EventApi } from "@fullcalendar/core";
import { orchestrateCalendarDrag } from "@processes/calendar/calendar-events.process";
import { shouldSkipEventChange } from "@shared/libs/calendar/dnd-dedup";
import { useCallback } from "react";
import type { CalendarEvent } from "@/entities/event";
import type { CalendarCoreRef } from "@/widgets/calendar/calendar-core";

type UseCalendarDnDProps = {
	calendarRef: React.RefObject<CalendarCoreRef | null> | undefined;
	events: CalendarEvent[];
	isVacationDate: (date: string) => boolean;
	currentView: string;
	updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
	isLocalized: boolean;
};

type UseCalendarDnDResult = {
	handleEventChange: (
		info: import("@fullcalendar/core").EventChangeArg
	) => Promise<void>;
};

/**
 * Hook that manages drag-and-drop event changes in the calendar.
 * Orchestrates validation and backend sync through the calendar-events process.
 */
export function useCalendarDnD({
	calendarRef,
	events,
	isVacationDate,
	currentView,
	updateEvent,
	isLocalized,
}: UseCalendarDnDProps): UseCalendarDnDResult {
	const handleEventChange = useCallback(
		async (info: import("@fullcalendar/core").EventChangeArg) => {
			// Deduplicate rapid successive identical changes
			if (
				shouldSkipEventChange(
					info as unknown as {
						event?: { id?: unknown; startStr?: string; start?: Date | null };
					}
				)
			) {
				return;
			}
			// Debug calendar API access
			const getCalendarApi = calendarRef?.current
				? () => {
						const api = calendarRef.current?.getApi();
						return api || undefined;
					}
				: undefined;

			// Use process orchestrator for DnD handling
			const api = getCalendarApi?.();
			if (!api) {
				return;
			}
			await orchestrateCalendarDrag({
				calendarApi: api as unknown as import("@/entities/event").CalendarApi,
				info: info as unknown as import("@/services/calendar/calendar-dnd.service").EventChangeInfo,
				isVacationDate,
				currentView,
				updateEvent: updateEvent as unknown as (
					id: string,
					event: { id: string; title?: string; start?: string; end?: string }
				) => void,
				resolveEvent: (id: string) => {
					// Prefer React state events for reliable extendedProps
					const stateEvent = events.find((e) => e.id === String(id));
					if (stateEvent) {
						return { extendedProps: stateEvent.extendedProps || {} };
					}
					try {
						const ev = api?.getEventById?.(String(id));
						return ev
							? { extendedProps: (ev as EventApi).extendedProps || {} }
							: undefined;
					} catch {
						return;
					}
				},
				isLocalized,
			});
		},
		[isVacationDate, isLocalized, currentView, calendarRef, updateEvent, events]
	);

	return { handleEventChange };
}
