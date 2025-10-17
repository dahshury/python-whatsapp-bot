import type FullCalendar from "@fullcalendar/react";
import type { CalendarCoreRef } from "@widgets/calendar/types";
import type { ForwardedRef, RefObject } from "react";
import { useImperativeHandle } from "react";

export function useExposeCalendarApi(
	ref: ForwardedRef<CalendarCoreRef> | undefined,
	calendarRef: RefObject<FullCalendar | null>
): void {
	useImperativeHandle(
		ref || null,
		() => ({
			getApi: () => calendarRef.current?.getApi(),
			updateSize: () => {
				try {
					const api = calendarRef.current?.getApi?.();
					if (api?.view) {
						api.updateSize?.();
					}
				} catch {
					// Error handling
				}
			},
		}),
		[calendarRef]
	);
}
