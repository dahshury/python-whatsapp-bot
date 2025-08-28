import type { EventApi } from "@fullcalendar/core";
import { useCallback, useEffect } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { getSlotTimes, SLOT_DURATION_HOURS } from "@/lib/calendar-config";
import { convertDataTableEventToCalendarEvent } from "@/lib/calendar-event-converters";
import {
	handleCancelReservation as handleCancelReservationService,
	handleEventChange as handleEventChangeService,
	handleOpenConversation as handleOpenConversationService,
} from "@/lib/calendar-event-handlers";
import { to24h } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";

// Extend globalThis to include custom properties
declare global {
	interface Window {
		__suppressEventChangeDepth?: number;
		__isCalendarDragging?: boolean;
		__calendarLocalMoves?: Map<string, number>;
	}
}

// Helper function to safely access window properties
function getWindowProperty<T>(property: keyof Window, defaultValue: T): T {
	if (typeof window === 'undefined') return defaultValue;
	return (window as any)[property] ?? defaultValue;
}

// Helper function to set window properties safely
function setWindowProperty<T>(property: keyof Window, value: T): void {
	if (typeof window !== 'undefined') {
		(window as any)[property] = value;
	}
}

interface UseCalendarEventHandlersProps {
	events: CalendarEvent[];
	conversations: Record<string, unknown>;
	isRTL: boolean;
	currentView: string;
	isVacationDate: (date: string) => boolean;
	handleRefreshWithBlur: () => Promise<void>;
	openConversation: (id: string) => void;
	addEvent: (event: CalendarEvent) => void;
	updateEvent: (id: string, event: CalendarEvent) => void;
	removeEvent: (id: string) => void;
	dataTableEditor: { handleEditReservation: (event: CalendarEvent) => void };
	calendarRef?: React.RefObject<CalendarCoreRef>; // Optional calendar ref for API access
}

interface CalendarEventDetail {
	type: string;
	data: {
		id?: string | number;
		[key: string]: unknown;
	};
}

export function useCalendarEventHandlers({
	events,
	conversations: _conversations,
	isRTL,
	currentView,
	isVacationDate,
	handleRefreshWithBlur,
	openConversation,
	addEvent,
	updateEvent,
	removeEvent,
	dataTableEditor,
	calendarRef,
}: UseCalendarEventHandlersProps) {
	// Ensure global registry for locally-initiated moves to suppress stale WS thrash
	useEffect(() => {
		const currentMap = getWindowProperty('__calendarLocalMoves', null);
		if (!currentMap) {
			setWindowProperty('__calendarLocalMoves', new Map<string, number>());
		}
	}, []);

	// Listen to realtime CustomEvent and update FullCalendar API directly
	useEffect(() => {
		if (!calendarRef?.current) return;
		const api = calendarRef.current.getApi?.();
		if (!api) return;

		// Compute normalized base time for the 2-hour slot window containing timeSlotRaw
		const computeSlotBase = (dateStr: string, timeSlotRaw: string) => {
			try {
				const baseTime = to24h(String(timeSlotRaw || "00:00"));
				const [hh, mm] = baseTime.split(":").map((v) => parseInt(v, 10));
				const minutes =
					(Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
				const day = new Date(`${dateStr}T00:00:00`);
				const { slotMinTime } = getSlotTimes(day, false, "");
				const [sH, sM] = String(slotMinTime || "00:00:00")
					.slice(0, 5)
					.split(":")
					.map((v) => parseInt(v, 10));
				const minMinutes =
					(Number.isFinite(sH) ? sH : 0) * 60 + (Number.isFinite(sM) ? sM : 0);
				const duration = Math.max(60, (SLOT_DURATION_HOURS || 2) * 60);
				const rel = Math.max(0, minutes - minMinutes);
				const slotIndex = Math.floor(rel / duration);
				const baseMinutes = minMinutes + slotIndex * duration;
				const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, "0");
				const mmOut = String(baseMinutes % 60).padStart(2, "0");
				return `${hhOut}:${mmOut}`;
			} catch {
				return to24h(String(timeSlotRaw || "00:00"));
			}
		};

		// Reflow all events within a given slot (date + base slot time)
		const reflowSlot = (dateStr: string, timeSlotRaw: string) => {
			try {
				const baseTime = computeSlotBase(dateStr, timeSlotRaw);
				const all = api.getEvents();
				// Slot window
				const slotStart = new Date(`${dateStr}T${baseTime}:00`);
				const slotEnd = new Date(slotStart.getTime() + 120 * 60 * 1000);
				// Select events that belong to this slot via metadata OR by time range on the same date
				const inSlot = all.filter((e: unknown) => {
					const getExt = (key: string): unknown => {
						try {
							const ev = e as {
								extendedProps?: Record<string, unknown>;
								start?: Date;
								startStr?: string;
							};
							return ev.extendedProps ? ev.extendedProps[key] : undefined;
						} catch {
							return undefined;
						}
					};
					// Exclude non-reservation items (e.g., conversations type 2)
					const t = Number(getExt("type") ?? 0);
					if (t === 2) return false;
					// Exclude cancelled reservations from layout calculation
					if (getExt("cancelled") === true) return false;
					const sd = getExt("slotDate");
					const st = getExt("slotTime");
					if (sd === dateStr && st === baseTime) return true;
					try {
						const ev = e as { start?: Date; startStr?: string };
						const s: Date | null =
							ev.start || (ev.startStr ? new Date(ev.startStr) : null);
						if (!s) return false;
						return s >= slotStart && s < slotEnd;
					} catch {
						return false;
					}
				});
				if (inSlot.length === 0) return;
				// Sort: checkups first (type 0), then followups (type 1), then by title
				interface SimpleEventLike {
					title?: string;
					extendedProps?: { type?: unknown };
				}
				inSlot.sort((a: unknown, b: unknown) => {
					const evA = a as SimpleEventLike;
					const evB = b as SimpleEventLike;
					const t1 = Number(evA?.extendedProps?.type ?? 0);
					const t2 = Number(evB?.extendedProps?.type ?? 0);
					if (t1 !== t2) return t1 - t2;
					const n1 = String(evA?.title || "");
					const n2 = String(evB?.title || "");
					return n1.localeCompare(n2);
				});
				const minutesPerReservation = inSlot.length >= 6 ? 15 : 20;
				const gapMinutes = 1;
				let offset = 0;
				for (const ev of inSlot) {
					const startStr = `${dateStr}T${baseTime}:00`;
					const start = new Date(startStr);
					const end = new Date(startStr);
					start.setMinutes(start.getMinutes() + Math.floor(offset));
					end.setMinutes(
						end.getMinutes() + Math.floor(offset + minutesPerReservation),
					);
					try {
						const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0);
						setWindowProperty('__suppressEventChangeDepth', currentDepth + 1);
						(ev as EventApi).setDates(start, end);
					} catch {
					} finally {
						try {
							const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0);
							if (currentDepth > 0) {
								setWindowProperty('__suppressEventChangeDepth', currentDepth - 1);
							}
						} catch {}
					}
					// Ensure metadata present for subsequent reflows
					try {
						(ev as EventApi).setExtendedProp("slotDate", dateStr);
					} catch {}
					try {
						(ev as EventApi).setExtendedProp("slotTime", baseTime);
					} catch {}
					offset += minutesPerReservation + gapMinutes;
				}
			} catch {}
		};

		const handler = (ev: Event) => {
			const detail: CalendarEventDetail = (ev as CustomEvent).detail || {};
			const { type, data } = detail;
			try {
				if (!type || !data) return;
				// Ignore updates while dragging the same reservation
				try {
					if (getWindowProperty<boolean>('__isCalendarDragging', false)) {
						const draggingId = String(data?.id || "");
						// If the update pertains to the same event being dragged, skip applying it now
						if (draggingId && api.getEventById(draggingId)) {
							return;
						}
					}
				} catch {}
				if (type === "reservation_created") {
					// Add if not exists by reservation id
					const existing = api.getEventById(String(data.id));
					if (!existing) {
						const start = `${data.date}T${String(data.time_slot || "00:00").slice(0, 5)}:00`;
						const startDate = new Date(start);
						const endDate = new Date(startDate.getTime() + 20 * 60 * 1000);
						api.addEvent({
							id: String(data.id),
							title: String((data as any).customer_name || (data as any).wa_id || ""),
							start,
							end: endDate,
							extendedProps: {
								type: Number(data.type ?? 0),
								cancelled: false,
								waId: data.wa_id || data.waId,
								wa_id: data.wa_id || data.waId,
								reservationId: String(data.id),
								slotDate: data.date,
								slotTime: to24h(String(data.time_slot || "00:00").slice(0, 5)),
							},
						});
					}
					// Reflow slot to enforce alignment and 1-minute gaps (even if event already existed)
					reflowSlot(
						String(data.date),
						String(String(data.time_slot || "00:00").slice(0, 5)),
					);
				} else if (
					type === "reservation_updated" ||
					type === "reservation_reinstated"
				) {
					console.log("📡 Received reservation_updated via WebSocket:", data);

					// Suppress thrash if we just moved this event locally
					try {
						const localMoves = getWindowProperty<Map<string, number> | undefined>(
							'__calendarLocalMoves',
							undefined,
						);
						const ts = localMoves?.get(String(data.id));
						if (ts && Date.now() - ts < 1000) {
							console.log(
								"🚫 Suppressing recent local move for event",
								data.id,
							);
							return;
						}
					} catch {}
					const evObj = api.getEventById(String(data.id));
					console.log(
						"🔍 Found calendar event for update:",
						!!evObj,
						"eventId:",
						data.id,
					);
					const start = `${data.date}T${String(data.time_slot || "00:00").slice(0, 5)}:00`;
					if (evObj) {
						evObj.setProp("title", String((data as any).customer_name || (data as any).wa_id || ""));
						evObj.setExtendedProp("type", Number(data.type ?? 0));
						evObj.setExtendedProp("cancelled", false);
						// Preserve waId for future drags
						evObj.setExtendedProp(
							"waId",
							data.wa_id ||
								(evObj as EventApi)?.extendedProps?.waId ||
								(evObj as EventApi)?.extendedProps?.wa_id,
						);
						evObj.setExtendedProp(
							"wa_id",
							data.wa_id ||
								(evObj as EventApi)?.extendedProps?.wa_id ||
								(evObj as EventApi)?.extendedProps?.waId,
						);
						evObj.setExtendedProp("slotDate", data.date);
						evObj.setExtendedProp(
							"slotTime",
							to24h(String(data.time_slot || "00:00").slice(0, 5)),
						);
						const startDate = new Date(start);
						const endDate = new Date(startDate.getTime() + 20 * 60 * 1000);
						try {
							const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0);
							setWindowProperty('__suppressEventChangeDepth', currentDepth + 1);
							evObj.setDates(startDate, endDate);
						} catch {
						} finally {
							try {
								const currentDepth = getWindowProperty('__suppressEventChangeDepth', 0);
								if (currentDepth > 0) {
									setWindowProperty('__suppressEventChangeDepth', currentDepth - 1);
								}
							} catch {}
						}
						// Reflow slot to enforce alignment and 1-minute gaps
						reflowSlot(
							String(data.date),
							String(String(data.time_slot || "00:00").slice(0, 5)),
						);
					} else {
						api.addEvent({
							id: String(data.id),
							title: String((data as any).customer_name || (data as any).wa_id || ""),
							start,
							end: new Date(new Date(start).getTime() + 20 * 60 * 1000),
							extendedProps: {
								type: Number(data.type ?? 0),
								cancelled: false,
								waId: data.wa_id || data.waId,
								wa_id: data.wa_id || data.waId,
								reservationId: String(data.id),
								slotDate: data.date,
								slotTime: to24h(String(data.time_slot || "00:00").slice(0, 5)),
							},
						});
						// Reflow slot to enforce alignment and 1-minute gaps
						reflowSlot(
							String(data.date),
							String(String(data.time_slot || "00:00").slice(0, 5)),
						);
					}
				} else if (type === "reservation_cancelled") {
					const evObj = api.getEventById(String(data.id));
					if (evObj) {
						// Mark cancelled; let processor recolor on next render
						evObj.setExtendedProp("cancelled", true);
						// Remove from calendar to prevent visual overlap until next full render
						try {
							evObj.remove();
						} catch {}
					}
					// Reflow the affected slot since counts changed
					try {
						reflowSlot(
							String(data.date),
							String(String(data.time_slot || "00:00").slice(0, 5)),
						);
					} catch {}
				} else if (type === "vacation_period_updated") {
					// Vacation events are handled by useCalendarInitialization via context callback
				}
			} catch {}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, [calendarRef]);
	// Handle event change (drag and drop)
	const handleEventChange = useCallback(
		async (info: unknown) => {
			// Debug calendar API access
			const getCalendarApi = calendarRef?.current
				? () => {
						console.log("Calendar ref current:", !!calendarRef.current);
						const api = calendarRef.current?.getApi();
						console.log("Calendar API obtained:", !!api);
						if (api) {
							console.log(
								"Calendar API methods available:",
								Object.keys(api).slice(0, 10),
							); // Show first 10 methods
						}
						return api;
					}
				: undefined;

			if (!getCalendarApi) {
				console.warn("No calendar ref available for event change handling");
			}

			await handleEventChangeService({
				info,
				isVacationDate,
				isRTL,
				currentView,
				onRefresh: handleRefreshWithBlur,
				getCalendarApi,
				updateEvent,
				resolveEvent: (id: string) => {
					// Prefer React state events for reliable extendedProps
					const stateEvent = events.find((e) => e.id === String(id));
					if (stateEvent)
						return { extendedProps: stateEvent.extendedProps || {} };
					try {
						const api = getCalendarApi?.();
						const ev = api?.getEventById(String(id));
						return ev ? { extendedProps: ev.extendedProps || {} } : undefined;
					} catch {
						return undefined;
					}
				},
			});
		},
		[
			isVacationDate,
			isRTL,
			currentView,
			handleRefreshWithBlur,
			calendarRef,
			updateEvent,
			events.find,
		],
	);

	// Handle open conversation
	const handleOpenConversation = useCallback(
		async (eventId: string) => {
			// Prefer opening by waId/wa_id if available on the event
			let conversationId = eventId;
			try {
				const api = calendarRef?.current?.getApi?.();
				const ev = api?.getEventById(String(eventId));
				const wa =
					(ev as EventApi)?.extendedProps?.waId ||
					(ev as EventApi)?.extendedProps?.wa_id;
				if (wa) conversationId = String(wa);
			} catch {}

			await handleOpenConversationService({
				eventId: conversationId,
				openConversation,
			});
		},
		[openConversation, calendarRef],
	);

	// Context menu handlers
	const handleCancelReservation = useCallback(
		async (eventId: string) => {
			// Provide FullCalendar API accessor so the handler can update/remove events
			const getCalendarApi = calendarRef?.current
				? () => calendarRef.current?.getApi?.()
				: undefined;
			await handleCancelReservationService({
				eventId,
				events,
				isRTL,
				onRefresh: handleRefreshWithBlur,
				getCalendarApi,
				onEventCancelled: (id: string) => {
					// Mirror DataTableOperationsService behavior: also update React state immediately
					try {
						removeEvent(id);
					} catch {}
				},
			});
		},
		[events, isRTL, handleRefreshWithBlur, calendarRef, removeEvent],
	);

	const handleViewDetails = useCallback(
		(eventId: string) => {
			const event = events.find((e) => e.id === eventId);
			if (event) {
				dataTableEditor.handleEditReservation(event);
			}
		},
		[events, dataTableEditor],
	);

	// Data table editor event handlers
	const handleEventAdded = useCallback(
		(event: unknown) => {
			addEvent(convertDataTableEventToCalendarEvent(event));
		},
		[addEvent],
	);

	const handleEventModified = useCallback(
		(eventId: string, event: unknown) => {
			updateEvent(eventId, convertDataTableEventToCalendarEvent(event));
		},
		[updateEvent],
	);

	const handleEventCancelled = useCallback(
		(eventId: string) => {
			removeEvent(eventId);
		},
		[removeEvent],
	);

	return {
		handleEventChange,
		handleOpenConversation,
		handleCancelReservation,
		handleViewDetails,
		handleEventAdded,
		handleEventModified,
		handleEventCancelled,
	};
}
