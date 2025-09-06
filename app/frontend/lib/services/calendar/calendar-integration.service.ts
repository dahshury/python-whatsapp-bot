/* eslint-disable */

import { getSlotTimes } from "@/lib/calendar-config";
import type {
	CalendarApi,
	CalendarEvent,
	CalendarEventObject,
} from "../types/data-table-types";
import { FormattingService } from "../utils/formatting.service";
import type { LocalEchoManager } from "../utils/local-echo.manager";

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

	/**
	 * Reflow and sort events within a given slot (date + base slot time),
	 * applying deterministic ordering (by type then title) and 1-minute gaps.
	 * This mirrors the runtime reflow used for WS updates and DnD behavior.
	 */
	reflowSlot(dateStr: string, timeSlotRaw: string): void {
		try {
			if (!this.calendarApi?.getEvents) return;
			const all = this.calendarApi.getEvents();
			if (!Array.isArray(all) || all.length === 0) return;

			// Compute the correct slot base time using business hours logic
			const fmt = new FormattingService();
			const baseTime = (() => {
				try {
					const inputTime = fmt.to24h(String(timeSlotRaw || "00:00"));
					const [hh, mm] = inputTime.split(":").map((v) => parseInt(v, 10));
					const minutes =
						(Number.isFinite(hh) ? hh : 0) * 60 +
						(Number.isFinite(mm) ? mm : 0);
					const day = new Date(`${dateStr}T00:00:00`);
					const { slotMinTime } = getSlotTimes(day, false, "");
					const [sH, sM] = String(slotMinTime || "00:00:00")
						.slice(0, 5)
						.split(":")
						.map((v) => parseInt(v, 10));
					const minMinutes =
						(Number.isFinite(sH) ? sH : 0) * 60 +
						(Number.isFinite(sM) ? sM : 0);
					const duration = 2 * 60; // 2 hours = 120 minutes
					const rel = Math.max(0, minutes - minMinutes);
					const slotIndex = Math.floor(rel / duration);
					const baseMinutes = minMinutes + slotIndex * duration;
					const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, "0");
					const mmOut = String(baseMinutes % 60).padStart(2, "0");
					const computed = `${hhOut}:${mmOut}`;
					console.log("[CAL] reflowSlot()", {
						dateStr,
						timeSlotRaw,
						computedBaseTime: computed,
					});
					return computed;
				} catch (e) {
					console.error("[CAL] reflowSlot() compute error", {
						dateStr,
						timeSlotRaw,
						error: e,
					});
					return fmt.to24h(String(timeSlotRaw || "00:00"));
				}
			})();

			// Define slot start for layout (no longer used for filtering)
			const slotStart = new Date(`${dateStr}T${baseTime}:00`);
			console.log(`[CAL] reflowSlot() slotStart:`, {
				slotStart: slotStart.toISOString(),
				localTime: slotStart.toString(),
			});

			// Collect reservation events within this slot by STRICT metadata match (no Date fallback)
			const inSlot = all.filter((e: CalendarEventObject) => {
				try {
					const ext = (e?.extendedProps || {}) as {
						type?: unknown;
						cancelled?: boolean;
						slotDate?: string;
						slotTime?: string;
					};
					const t = Number(ext.type ?? 0);
					if (t === 2) return false;
					if (ext.cancelled === true) return false;
					return ext.slotDate === dateStr && ext.slotTime === baseTime;
				} catch {
					return false;
				}
			});
			console.log(
				"[CAL] reflowSlot() inSlot candidates",
				inSlot.map((e) => ({
					id: e.id,
					slotDate: (e as { extendedProps?: { slotDate?: string } })
						?.extendedProps?.slotDate,
					slotTime: (e as { extendedProps?: { slotTime?: string } })
						?.extendedProps?.slotTime,
					start:
						(e as { startStr?: string })?.startStr ||
						(e as { start?: string })?.start,
				})),
			);
			if (inSlot.length === 0) {
				console.log("[CAL] reflowSlot() no events matched for slot", {
					dateStr,
					baseTime,
				});
				return;
			}

			// Sort by type then title
			inSlot.sort((a, b) => {
				const extA = (a?.extendedProps || {}) as { type?: unknown };
				const extB = (b?.extendedProps || {}) as { type?: unknown };
				const t1 = Number(extA.type ?? 0);
				const t2 = Number(extB.type ?? 0);
				if (t1 !== t2) return t1 - t2;
				const n1 = String(a?.title || "");
				const n2 = String(b?.title || "");
				return n1.localeCompare(n2);
			});
			console.log(
				"[CAL] reflowSlot() sorted order",
				inSlot.map((e) => e.id),
			);

			// Helper to add minutes to HH:mm and return HH:mm
			const addMinutesToClock = (
				hhmm: string,
				minutesToAdd: number,
			): string => {
				try {
					const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
					const total =
						(Number.isFinite(h) ? h : 0) * 60 +
						(Number.isFinite(m) ? m : 0) +
						Math.max(0, Math.floor(minutesToAdd));
					const hh = Math.floor(total / 60);
					const mm = total % 60;
					return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
				} catch {
					return hhmm;
				}
			};

			// Apply sequential layout with 1-minute gaps, starting from slot beginning (using naive strings)
			const minutesPerReservation = inSlot.length >= 6 ? 15 : 20;
			const gapMinutes = 1;
			for (let i = 0; i < inSlot.length; i++) {
				const ev = inSlot[i];
				const prev = (ev as { startStr?: string }).startStr || ev.start || "";
				const offsetMinutes = i * (minutesPerReservation + gapMinutes);
				const startClock = addMinutesToClock(baseTime, offsetMinutes);
				const endClock = addMinutesToClock(
					baseTime,
					offsetMinutes + minutesPerReservation,
				);
				const startNaive = `${dateStr}T${startClock}:00`;
				const endNaive = `${dateStr}T${endClock}:00`;
				this.localEchoManager.withSuppressedEventChange(() => {
					try {
						// Use naive strings to avoid double timezone application
						(
							ev as unknown as {
								setDates?: (start: string, end: string | null) => void;
							}
						)?.setDates?.(startNaive, endNaive);
					} catch (e) {
						console.error(`[CAL] Error setting dates for ${ev.id}:`, e);
					}
					try {
						ev.setExtendedProp?.("slotDate", dateStr);
					} catch {}
					try {
						ev.setExtendedProp?.("slotTime", baseTime);
					} catch {}
				});
				console.log("[CAL] reflowSlot() moved", {
					id: ev.id || "unknown",
					index: i,
					from: prev,
					to: startNaive,
					offsetMinutes,
				});
			}

			// Nudge calendar to ensure re-render of events (some FC versions need this)
			try {
				(
					this.calendarApi as { rerenderEvents?: () => void }
				)?.rerenderEvents?.();
				this.calendarApi?.updateSize?.();
			} catch {}

			console.log("[CAL] reflowSlot() completed", {
				dateStr,
				baseTime,
				eventsProcessed: inSlot.length,
				slotStart: slotStart.toISOString(),
			});
		} catch (e) {
			console.error("[CAL] reflowSlot() error", e);
		}
	}
}
