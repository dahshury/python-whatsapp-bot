import type { EventContentArg } from "@fullcalendar/core";

/**
 * Compute CSS class names for a calendar event to support unified styling
 * across reservation/conversation types and special overlays.
 */
export function eventClassNames(arg: EventContentArg): string[] {
	const event = arg?.event;
	const classes = ["text-xs"] as string[];
	const type = event?.extendedProps?.type as number | undefined;
	// Skip reservation/conversation classes for vacation text overlays
	if (event?.classNames?.includes("vacation-text-event")) {
		classes.push("vacation-text-event");
		return classes;
	}
	if (type === 2) {
		classes.push("conversation-event");
	} else {
		// All reservation-like events share unified styling and type tokens
		classes.push("reservation-event");
		if (type === 1) {
			classes.push("reservation-type-1");
		} else {
			classes.push("reservation-type-0");
		}
	}
	return classes;
}
