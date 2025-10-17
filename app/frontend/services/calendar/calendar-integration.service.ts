/* eslint-disable */

import type { LocalEchoManager } from "@shared/libs/utils/local-echo.manager";
import type {
	CalendarApi,
	CalendarEvent,
	CalendarEventObject,
} from "@/entities/event";
import {
	computeSlotBase,
	reflowSlot as layoutReflow,
} from "@/services/calendar/calendar-layout.service";

// Constants for ISO 8601 date/time string parsing
const ISO_DATE_LENGTH = 10; // YYYY-MM-DD
const ISO_TIME_START_INDEX = 11; // Start of time in ISO string
const ISO_TIME_END_INDEX = 16; // End of HH:MM in ISO string

type GlobalReservationData = {
	[key: string | number]: Array<{ start?: string }>;
};

type GlobalCancelReservationFn = (args: {
	reservation_id: number | string;
	wa_id: string;
}) => Promise<void>;

interface ExtendedGlobalThis extends GlobalThis {
	__cancelReservation?: GlobalCancelReservationFn;
	__reservations_data?: GlobalReservationData;
}

type LocalEchoManagerExtended = {
	forReservationId: (
		resId: number | string,
		callback: (events: CalendarEventObject[]) => void
	) => void;
	withSuppressedEventChange: (callback: () => void) => void;
	markLocalEcho: (key: string) => void;
	storeModificationContext: (eventId: string, context: unknown) => void;
};

type CalendarApiExtended = {
	getEventById?: (id: string) => CalendarEventObject | null | undefined;
	addEvent?: (event: Partial<CalendarEvent>) => CalendarEventObject | undefined;
	updateSize?: () => void;
	refetchEvents?: () => Promise<void>;
	view?: { type?: string };
};

export class CalendarIntegrationService {
	private readonly calendarApi: CalendarApi;
	private readonly localEchoManager: LocalEchoManager;

	constructor(calendarApi: CalendarApi, localEchoManager: LocalEchoManager) {
		this.calendarApi = calendarApi;
		this.localEchoManager = localEchoManager;
	}

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
			} catch {
				// Event property updates may fail in some contexts
			}
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
			} catch {
				// Event removal may fail in some contexts
			}
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
		}
	): void {
		const evObj = this.getEventById(eventId);
		if (!evObj) {
			return;
		}

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
		} catch {
			// Event property updates may fail in some contexts
		}
	}

	/**
	 * Update event timing with proper suppression
	 */
	updateEventTiming(
		eventId: string,
		prevStartStr: string,
		newStartIso: string
	): void {
		const evObj = this.getEventById(eventId);
		if (!evObj) {
			return;
		}

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
			} catch {
				// Slot date property update may fail
			}
		}
	}

	/**
	 * Ensure an event has slot metadata (slotDate, slotTime) aligned to slot base.
	 */
	updateEventSlotMetadata(
		eventId: string,
		dateStr: string,
		timeSlotRaw: string
	): void {
		try {
			const evObj = this.getEventById(eventId);
			if (!evObj) {
				return;
			}
			const baseTime = computeSlotBase(dateStr, String(timeSlotRaw || "00:00"));
			this.localEchoManager.withSuppressedEventChange(() => {
				try {
					evObj.setExtendedProp?.("slotDate", dateStr);
				} catch {
					// Slot date property update may fail
				}
				try {
					evObj.setExtendedProp?.("slotTime", baseTime);
				} catch {
					// Slot time property update may fail
				}
			});
		} catch {
			// Slot date property update may fail
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
				for (const [key, value] of Object.entries(event.extendedProps)) {
					newEvent.setExtendedProp?.(key, value);
				}
			} catch {
				// Extended property updates may fail in some contexts
			}
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
		} catch {
			// Calendar size update may fail if connection is unavailable
		}
	}

	/**
	 * Reflow and sort events within a given slot (date + base slot time),
	 * applying deterministic ordering (by type then title) and 1-minute gaps.
	 * This mirrors the runtime reflow used for WS updates and DnD behavior.
	 */
	reflowSlot(
		dateStr: string,
		timeSlotRaw: string,
		options?: { strictOnly?: boolean }
	): void {
		try {
			if (!this.calendarApi) {
				return;
			}
			(
				layoutReflow as unknown as (
					api: unknown,
					d: string,
					t: string,
					o?: { strictOnly?: boolean }
				) => void
			)(this.calendarApi as unknown, dateStr, timeSlotRaw, options);
		} catch (_e) {
			// Reflow slot may fail in some contexts
		}
	}

	// Update reservation status
	readonly markResAsDeleted = (resId?: number | string) => {
		if (!resId) {
			return;
		}
		try {
			(
				this.localEchoManager as unknown as LocalEchoManagerExtended
			).forReservationId(resId, (events: CalendarEventObject[]) => {
				for (const evObj of events) {
					evObj.remove?.();
				}
			});
			// Re-fetch to sync server state
			(this.calendarApi as unknown as CalendarApiExtended).refetchEvents?.();
			if (this.reservationIsForThisWeek(resId)) {
				(
					this.localEchoManager as unknown as LocalEchoManagerExtended
				).forReservationId(resId, (events: CalendarEventObject[]) => {
					for (const evObj of events) {
						evObj.remove?.();
					}
				});
			}
		} catch {
			// Reservation deletion may fail
		}
	};

	// Refresh calendar data from server
	readonly refresh = async () => {
		try {
			await (
				this.calendarApi as unknown as CalendarApiExtended
			).refetchEvents?.();
		} catch {
			// Calendar refresh may fail if connection is unavailable
		}
	};

	// Push a cancel operation to backend
	readonly cancelReservation = async (
		resId: number | string,
		_waId: string
	) => {
		try {
			const cancelFn = (globalThis as ExtendedGlobalThis).__cancelReservation;
			if (cancelFn) {
				await cancelFn({
					reservation_id: resId,
					wa_id: _waId,
				});
			}
			// After successful cancellation, optimistically remove/update
			(
				this.localEchoManager as unknown as LocalEchoManagerExtended
			).forReservationId(resId, (events: CalendarEventObject[]) => {
				for (const evObj of events) {
					evObj.setExtendedProp?.("cancelled", true);
				}
			});
		} catch {
			// Cancellation request may fail or be rejected
		}
	};

	// Rebuild date-sliced content from a reservation
	readonly applyReservationDateSlice = (resId: number | string) => {
		const reservations =
			(globalThis as ExtendedGlobalThis).__reservations_data ||
			({} as GlobalReservationData);
		if (!(reservations && resId)) {
			return;
		}
		const reservationsForId = reservations[resId] || [];
		for (const r of reservationsForId) {
			const hasStart = !!r?.start;
			if (!hasStart) {
				continue;
			}
			const dateStr = r.start?.substring(0, ISO_DATE_LENGTH);
			const baseTime = r.start?.substring(
				ISO_TIME_START_INDEX,
				ISO_TIME_END_INDEX
			);
			(
				this.localEchoManager as unknown as LocalEchoManagerExtended
			).forReservationId(resId, (events: CalendarEventObject[]) => {
				for (const evObj of events) {
					try {
						evObj.setExtendedProp?.("slotDate", dateStr);
					} catch {
						// Slot date property update may fail
					}
					try {
						evObj.setExtendedProp?.("slotTime", baseTime);
					} catch {
						// Slot time property update may fail
					}
				}
			});
		}
	};

	private reservationIsForThisWeek(resId: number | string): boolean {
		return typeof resId !== "undefined";
	}
}
