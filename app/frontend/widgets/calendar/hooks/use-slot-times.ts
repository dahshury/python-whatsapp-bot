import type FullCalendar from "@fullcalendar/react";
import { useEffect } from "react";

type SlotTimes = { slotMinTime: string; slotMaxTime: string };

export function useSlotTimes(
	calendarRef: React.RefObject<FullCalendar | null>,
	slotTimes: SlotTimes
) {
	useEffect(() => {
		const api = calendarRef.current?.getApi?.();
		if (!api) {
			return;
		}
		try {
			const run = () => {
				api.setOption("slotMinTime", slotTimes.slotMinTime);
				api.setOption("slotMaxTime", slotTimes.slotMaxTime);
			};
			const maybeBatch = (
				api as unknown as { batchRendering?: (cb: () => void) => void }
			)?.batchRendering;
			if (typeof maybeBatch === "function") {
				maybeBatch(run);
			} else {
				run();
			}
			requestAnimationFrame(() => {
				try {
					api.updateSize?.();
				} catch {
					// Error handling
				}
			});
		} catch {
			// Error handling
		}
	}, [calendarRef, slotTimes]);
}
