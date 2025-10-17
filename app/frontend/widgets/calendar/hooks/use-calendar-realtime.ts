import type { EventApi } from "@fullcalendar/core";
import {
	getWindowProperty,
	setWindowProperty,
} from "@shared/libs/dom/window-props";
import { to24h } from "@shared/libs/utils";
import {
	profileCount,
	profileMark,
} from "@shared/libs/utils/calendar-profiler";
import { useEffect } from "react";
import {
	computeSlotBase,
	reflowSlot,
} from "@/services/calendar/calendar-layout.service";
import type { CalendarCoreRef } from "@/widgets/calendar/calendar-core";
import type { CalendarEventDetail } from "@/widgets/calendar/types";

// Constants for time slot processing
const TIME_SLOT_LENGTH = 5;
const RESERVATION_DURATION_MINUTES = 20;
const LOCAL_MOVE_THROTTLE_MS = 1200;
const MS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;

type UseCalendarRealtimeProps = {
	calendarRef: React.RefObject<CalendarCoreRef | null> | undefined;
};

/**
 * Hook that manages realtime WebSocket event synchronization with FullCalendar.
 * Listens to "realtime" CustomEvents and applies reservation updates (create/update/cancel)
 * directly to the calendar API. Also performs initial slot reflow on eventsSet.
 */
export function useCalendarRealtime({
	calendarRef,
}: UseCalendarRealtimeProps): void {
	// Ensure global registry for locally-initiated moves to suppress stale WS thrash
	useEffect(() => {
		const currentMap = getWindowProperty("__calendarLocalMoves", null);
		if (!currentMap) {
			setWindowProperty("__calendarLocalMoves", new Map<string, number>());
		}
	}, []);

	// Listen to realtime CustomEvent and update FullCalendar API directly
	useEffect(() => {
		if (!calendarRef?.current) {
			return;
		}
		const api = calendarRef.current.getApi?.();
		if (!api) {
			return;
		}

		const deriveSlotKey = (event: EventApi): string => {
			try {
				const startStr = event?.startStr || "";
				if (!startStr.includes("T")) {
					return "";
				}
				const parts = startStr.split("T");
				const datePart = parts[0] || "";
				const timePartRaw = parts[1] || "";
				const timePart = String(timePartRaw || "00:00").slice(
					0,
					TIME_SLOT_LENGTH
				);
				const base = computeSlotBase(datePart, timePart);
				return `${datePart}__${base}`;
			} catch {
				return "";
			}
		};

		const deriveSlot = (dateStr: string, timeSlotRaw: string) => {
			const baseTime = computeSlotBase(dateStr, timeSlotRaw);
			return { date: dateStr, baseTime };
		};

		const shouldSuppressUpdate = (eventId: string): boolean => {
			try {
				if (getWindowProperty<boolean>("__isCalendarDragging", false)) {
					const localMoves = getWindowProperty<Map<string, number> | undefined>(
						"__calendarLocalMoves",
						undefined
					);
					const ts = localMoves?.get(String(eventId));
					if (ts && Date.now() - ts < LOCAL_MOVE_THROTTLE_MS) {
						return true;
					}
				}
			} catch {
				// Error handling
			}
			return false;
		};

		const getEventEndDate = (startDateStr: string): Date => {
			const startDate = new Date(startDateStr);
			return new Date(
				startDate.getTime() +
					RESERVATION_DURATION_MINUTES * MS_PER_MINUTE * MS_PER_SECOND
			);
		};

		const handleReservationCreatedImpl = (data: Record<string, unknown>) => {
			const existing = api.getEventById(String(data.id));
			if (!existing) {
				const start = `${data.date}T${String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)}:00`;
				const endDate = getEventEndDate(start);
				api.addEvent({
					id: String(data.id),
					title: String(
						(data as { customer_name?: unknown; wa_id?: unknown })
							?.customer_name ||
							(data as { customer_name?: unknown; wa_id?: unknown })?.wa_id ||
							""
					),
					start,
					end: endDate,
					extendedProps: {
						type: Number(data.type ?? 0),
						cancelled: false,
						waId: data.wa_id || data.waId,
						wa_id: data.wa_id || data.waId,
						reservationId: String(data.id),
						slotDate: data.date,
						slotTime: to24h(
							String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)
						),
					},
				});
			}
			const { date, baseTime } = deriveSlot(
				String(data.date),
				String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)
			);
			reflowSlot(api, date, baseTime);
		};

		const handleReservationUpdated = (data: Record<string, unknown>) => {
			if (shouldSuppressUpdate(String(data.id))) {
				return;
			}
			const evObj = api.getEventById(String(data.id));
			const start = `${data.date}T${String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)}:00`;

			// Helper to update existing event properties
			const updateExistingEvent = (ev: EventApi) => {
				const title = String(
					(data as { customer_name?: unknown; wa_id?: unknown })
						?.customer_name ||
						(data as { customer_name?: unknown; wa_id?: unknown })?.wa_id ||
						""
				);
				ev.setProp("title", title);
				ev.setExtendedProp("type", Number(data.type ?? 0));
				ev.setExtendedProp("cancelled", false);
				ev.setExtendedProp(
					"waId",
					data.wa_id ||
						(ev as EventApi)?.extendedProps?.waId ||
						(ev as EventApi)?.extendedProps?.wa_id
				);
				ev.setExtendedProp(
					"wa_id",
					data.wa_id ||
						(ev as EventApi)?.extendedProps?.wa_id ||
						(ev as EventApi)?.extendedProps?.waId
				);
				ev.setExtendedProp("slotDate", data.date);
				ev.setExtendedProp(
					"slotTime",
					to24h(String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH))
				);
			};

			// Helper to set event dates with depth tracking
			const setEventDatesWithTracking = (ev: EventApi, startStr: string) => {
				const startDate = new Date(startStr);
				const endDate = getEventEndDate(startStr);
				try {
					const currentDepth = getWindowProperty(
						"__suppressEventChangeDepth",
						0
					);
					setWindowProperty("__suppressEventChangeDepth", currentDepth + 1);
					ev.setDates(startDate, endDate);
				} catch {
					// Error handling
				} finally {
					try {
						const currentDepth = getWindowProperty(
							"__suppressEventChangeDepth",
							0
						);
						if (currentDepth > 0) {
							setWindowProperty("__suppressEventChangeDepth", currentDepth - 1);
						}
					} catch {
						// Error handling
					}
				}
			};

			if (evObj) {
				updateExistingEvent(evObj);
				setEventDatesWithTracking(evObj, start);
				const { date, baseTime } = deriveSlot(
					String(data.date),
					String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)
				);
				reflowSlot(api, date, baseTime);
			} else {
				api.addEvent({
					id: String(data.id),
					title: String(
						(data as { customer_name?: unknown; wa_id?: unknown })
							?.customer_name ||
							(data as { customer_name?: unknown; wa_id?: unknown })?.wa_id ||
							""
					),
					start,
					end: getEventEndDate(start),
					extendedProps: {
						type: Number(data.type ?? 0),
						cancelled: false,
						waId: data.wa_id || data.waId,
						wa_id: data.wa_id || data.waId,
						reservationId: String(data.id),
						slotDate: data.date,
						slotTime: to24h(
							String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)
						),
					},
				});
				const { date, baseTime } = deriveSlot(
					String(data.date),
					String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)
				);
				reflowSlot(api, date, baseTime);
			}
		};

		const handleReservationCancelledImpl = (data: Record<string, unknown>) => {
			const evObj = api.getEventById(String(data.id));
			if (evObj) {
				try {
					const currentDepth = getWindowProperty(
						"__suppressEventChangeDepth",
						0
					);
					setWindowProperty("__suppressEventChangeDepth", currentDepth + 1);
					evObj.setExtendedProp("cancelled", true);
					try {
						evObj.remove();
					} catch {
						// Error handling
					}
					setTimeout(() => {
						try {
							const d = getWindowProperty("__suppressEventChangeDepth", 0);
							if (d > 0) {
								setWindowProperty("__suppressEventChangeDepth", d - 1);
							}
						} catch {
							// Error handling
						}
					}, 0);
				} catch {
					// Error handling
				}
			}
			try {
				const { date, baseTime } = deriveSlot(
					String(data.date),
					String(data.time_slot || "00:00").slice(0, TIME_SLOT_LENGTH)
				);
				reflowSlot(api, date, baseTime);
			} catch {
				// Error handling
			}
		};

		// Helper to dispatch events based on type
		const dispatchRealtimeEvent = (
			type: string,
			data: Record<string, unknown>
		): void => {
			if (type === "reservation_created") {
				handleReservationCreatedImpl(data);
			} else if (
				type === "reservation_updated" ||
				type === "reservation_reinstated"
			) {
				handleReservationUpdated(data);
			} else if (type === "reservation_cancelled") {
				handleReservationCancelledImpl(data);
			}
			// Vacation events are handled by useCalendarInitialization via context callback
		};

		const handler = (ev: Event) => {
			const detail: CalendarEventDetail = (ev as CustomEvent).detail || {};
			const { type, data } = detail;
			try {
				if (!(type && data)) {
					return;
				}
				profileMark("ws.realtime", { type });
				dispatchRealtimeEvent(type, data as Record<string, unknown>);
			} catch {
				// Error handling
			}
		};

		window.addEventListener("realtime", handler as EventListener);

		// Helper to collect unique slot keys from events
		const collectSlotKeys = (events: EventApi[]): Set<string> => {
			const slotKeys = new Set<string>();
			for (const ev of events) {
				const key = deriveSlotKey(ev);
				if (key) {
					slotKeys.add(key);
				}
			}
			return slotKeys;
		};

		// Helper to update single event slot properties
		const updateEventSlotProperties = (
			ev: EventApi,
			date: string,
			baseTime: string
		): void => {
			try {
				ev.setExtendedProp?.("slotDate", date);
			} catch {
				// Error handling
			}
			try {
				ev.setExtendedProp?.("slotTime", baseTime);
			} catch {
				// Error handling
			}
		};

		// Helper to process all events for a slot
		const processEventsForSlot = (
			allEvents: EventApi[],
			date: string,
			baseTime: string
		): void => {
			for (const ev of allEvents) {
				if (deriveSlotKey(ev) !== `${date}__${baseTime}`) {
					continue;
				}
				updateEventSlotProperties(ev, date, baseTime);
			}
		};

		// Reflow all slots on initial load
		const handleEventsSet = () => {
			try {
				const all = (api.getEvents?.() || []) as EventApi[];
				profileCount("events.fullcalendar", all.length, {});
				const slotKeys = collectSlotKeys(all);

				for (const key of slotKeys) {
					const [date, baseTime] = key.split("__");
					if (!(date && baseTime)) {
						continue;
					}
					processEventsForSlot(all, date, baseTime);
					reflowSlot(api, date, baseTime);
				}
			} catch {
				// Error handling
			}
		};

		try {
			(
				api as unknown as {
					on?: (_ev: string, _cb: () => void) => void;
				}
			)?.on?.("eventsSet", handleEventsSet);
		} catch {
			// Error handling
		}

		return () => {
			try {
				(
					api as unknown as { off?: (ev: string, cb: () => void) => void }
				)?.off?.("eventsSet", handleEventsSet);
			} catch {
				// Error handling
			}
			window.removeEventListener("realtime", handler as EventListener);
		};
	}, [calendarRef]);
}
