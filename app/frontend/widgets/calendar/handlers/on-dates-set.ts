import type { DatesSetArg } from "@fullcalendar/core";
import { count } from "@shared/libs/dev-profiler";

// Constants for dates set handler
const SIZE_UPDATE_DELAY_MS = 250;

type DatesSetDeps = {
	onDatesSet?: (info: DatesSetArg) => void;
	onNavDate?: (date: Date) => void;
	getApi?: () => { updateSize?: () => void } | undefined;
};

export function createDatesSet({
	onDatesSet,
	onNavDate,
	getApi,
}: DatesSetDeps) {
	return function datesSet(info: DatesSetArg) {
		count("fc:datesSet");
		setTimeout(() => {
			try {
				const api = getApi?.();
				api?.updateSize?.();
			} catch {
				// Size update may fail in some contexts
			}
		}, SIZE_UPDATE_DELAY_MS);

		if (onDatesSet) {
			onDatesSet(info);
		}

		if (onNavDate && !info.view.type.includes("timeGrid")) {
			onNavDate(info.view.currentStart);
		}
	};
}
