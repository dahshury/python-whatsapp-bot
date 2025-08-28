/* eslint-disable */
import type {
	CalendarApi,
	CalendarEvent,
	CalendarEventObject,
} from "../types/data-table-types";
import { LocalEchoManager } from "../utils/local-echo.manager";

export class CalendarIntegrationService {
	constructor(
		private readonly calendarApi: CalendarApi,
		private readonly localEchoManager: LocalEchoManager,
	) {}

	/**
	 * Get event by ID from calendar
	 */
	getEventById(eventId: string): CalendarEventObject | null {
		return this.calendarApi?.getEventById?.(eventId) || null;
	}

	/**
	 * Mark event as cancelled optimistically
	 */
	markEventCancelled(eventId: string): void {
		const evObj = this.getEventById(eventId);
		if (evObj) {
			try {
				// Use suppressed event change to prevent triggering modification events
				this.localEchoManager.withSuppressedEventChange(() => {
					evObj.setExtendedProp?.("cancelled", true);
				});
			} catch {}
		}
	}

	/**
	 * Remove event from calendar
	 */
	removeEvent(eventId: string): void {
		const evObj = this.getEventById(eventId);
		if (evObj) {
			try {
				// Use suppressed event change to prevent triggering modification events
				this.localEchoManager.withSuppressedEventChange(() => {
					evObj.remove?.();
				});
			} catch {}
		}
	}

	/**
	 * Update event properties optimistically
	 */
	updateEventProperties(
		eventId: string,
		updates: {
			title?: string;
			type?: number;
			cancelled?: boolean;
		},
	): void {
		const evObj = this.getEventById(eventId);
		if (!evObj) return;

		try {
			// Use suppressed event change to prevent triggering modification events
			this.localEchoManager.withSuppressedEventChange(() => {
				if (updates.title !== undefined) {
					evObj.setProp?.("title", updates.title);
				}
				if (updates.type !== undefined) {
					evObj.setExtendedProp?.("type", Number(updates.type));
				}
				if (updates.cancelled !== undefined) {
					evObj.setExtendedProp?.("cancelled", updates.cancelled);
				}
			});
		} catch {}
	}

	/**
	 * Update event timing with proper suppression
	 */
	updateEventTiming(
		eventId: string,
		prevStartStr: string,
		newStartIso: string,
	): void {
		const evObj = this.getEventById(eventId);
		if (!evObj) return;

		try {
			const prevStart = new Date(prevStartStr);
			const newStart = new Date(newStartIso);
			const deltaMs = newStart.getTime() - prevStart.getTime();

			this.localEchoManager.withSuppressedEventChange(() => {
				if (evObj.moveStart) {
					evObj.moveStart({ milliseconds: deltaMs });
				} else if (evObj.setStart) {
					evObj.setStart(newStart);
				} else if (evObj.setDates) {
					evObj.setDates(newStart, null);
				}
			});
		} catch {
			// Fallback approach
			try {
				this.localEchoManager.withSuppressedEventChange(() => {
					if (evObj.setDates) {
						evObj.setDates(new Date(newStartIso), null);
					}
				});
			} catch {}
		}
	}

	/**
	 * Add new event to calendar
	 */
	addEvent(event: Partial<CalendarEvent>): CalendarEventObject | null {
		const newEvent = this.calendarApi?.addEvent?.(event);

		// Ensure extended properties are set
		if (newEvent && event.extendedProps) {
			try {
				Object.entries(event.extendedProps).forEach(([key, value]) => {
					newEvent.setExtendedProp?.(key, value);
				});
			} catch {}
		}

		return newEvent || null;
	}

	/**
	 * Check if calendar view is timeGrid (for approximation logic)
	 */
	isTimeGridView(): boolean {
		try {
			return (
				typeof window !== "undefined" &&
				String((this.calendarApi?.view as { type?: string })?.type || "")
					.toLowerCase()
					.includes("timegrid")
			);
		} catch {
			return false;
		}
	}

	/**
	 * Update calendar size
	 */
	updateSize(): void {
		try {
			this.calendarApi?.updateSize?.();
		} catch {}
	}
}
