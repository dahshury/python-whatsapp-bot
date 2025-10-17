import type FullCalendar from "@fullcalendar/react";
import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { useEffect } from "react";

type Params = { freeRoam: boolean; currentView: string };

export function useValidRangeSync(
	calendarRef: React.RefObject<FullCalendar | null>,
	{ freeRoam, currentView }: Params
) {
	useEffect(() => {
		const api = calendarRef.current?.getApi?.();
		if (!api) {
			return;
		}
		try {
			const lower = (currentView || "").toLowerCase();
			const isMultiMonth = lower === "multimonthyear";
			if (freeRoam || isMultiMonth) {
				api.setOption("validRange", undefined);
			} else {
				api.setOption("validRange", getValidRange(false));
			}
		} catch {
			// Error handling
		}
	}, [calendarRef, freeRoam, currentView]);
}
