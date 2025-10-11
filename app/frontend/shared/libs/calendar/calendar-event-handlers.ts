import { cancelReservation } from "@shared/libs/api";
import { getSlotTimes, SLOT_DURATION_HOURS } from "@shared/libs/calendar/calendar-config";
import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { to24h } from "@shared/libs/utils";
import type { UpdateType } from "@/shared/libs/realtime-utils";

// Toasts are centralized in WebSocketDataProvider to avoid duplicates

// WebSocket message interfaces
interface WebSocketMessage {
	type: string;
	data?: Record<string, unknown>;
	[key: string]: unknown;
}

// FullCalendar event interfaces
export interface FullCalendarEventChangeInfo {
	event: {
		id: string;
		title: string;
		start: Date;
		end?: Date | undefined;
		startStr?: string;
		endStr?: string;
		extendedProps?: Record<string, unknown>;
	};
	oldEvent?:
		| {
				id: string;
				title: string;
				start: Date;
				end?: Date | undefined;
				startStr?: string;
				endStr?: string;
				extendedProps?: Record<string, unknown>;
		  }
		| undefined;
	revert?: (() => void) | undefined;
}

export interface FullCalendarApi {
	getEvents: () => Array<{
		id: string;
		title: string;
		start: Date;
		end?: Date;
		extendedProps?: Record<string, unknown>;
		remove: () => void;
	}>;
	getEventById?: (id: string) => FullCalendarEvent | null;
	refetchEvents: () => void;
	[key: string]: unknown;
}

export interface FullCalendarEvent {
	id: string;
	title?: string;
	start?: Date;
	end?: Date;
	startStr?: string;
	endStr?: string;
	extendedProps?: Record<string, unknown>;
	setExtendedProp?: (key: string, value: unknown) => void;
	remove?: () => void;
}

export interface CalendarEventData {
	id: string;
	title?: string;
	start?: string;
	end?: string;
	extendedProps?: Record<string, unknown>;
}

// WebSocket message queue for operations before connection is established
interface QueuedMessage {
	message: WebSocketMessage;
	resolve: (success: boolean) => void;
	timestamp: number;
}

const messageQueue: QueuedMessage[] = [];
const QUEUE_TIMEOUT_MS = 10000; // 10 seconds max wait

// Process queued messages when WebSocket connects
function processMessageQueue() {
	const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } }).__wsConnection;
	if (!wsRef?.current || wsRef.current.readyState !== WebSocket.OPEN) {
		return;
	}

	console.log(`📤 Processing ${messageQueue.length} queued WebSocket messages`);

	const now = Date.now();
	while (messageQueue.length > 0) {
		const queued = messageQueue.shift();
		if (!queued) break;

		// Check if message has expired
		if (now - queued.timestamp > QUEUE_TIMEOUT_MS) {
			console.warn("⏰ Queued message expired:", queued.message.type);
			queued.resolve(false);
			continue;
		}

		try {
			wsRef.current.send(JSON.stringify(queued.message));
			console.log("📤 Queued message sent:", queued.message.type);
			queued.resolve(true);
		} catch (e) {
			console.error("❌ Failed to send queued message:", e);
			queued.resolve(false);
		}
	}
}

// Set up WebSocket connection event listener to process queue
if (typeof globalThis !== "undefined" && !(globalThis as { __wsQueueSetup?: boolean }).__wsQueueSetup) {
	(globalThis as { __wsQueueSetup?: boolean }).__wsQueueSetup = true;

	// Check periodically if WebSocket connects and process queue
	const checkConnection = () => {
		const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } }).__wsConnection;
		if (wsRef?.current?.readyState === WebSocket.OPEN && messageQueue.length > 0) {
			processMessageQueue();
		}
	};

	setInterval(checkConnection, 500); // Check every 500ms
}

// WebSocket-based operations to replace HTTP API calls
function sendWebSocketMessage(message: WebSocketMessage): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } }).__wsConnection;

			if (wsRef?.current?.readyState === WebSocket.OPEN) {
				// WebSocket is connected, send immediately
				wsRef.current.send(JSON.stringify(message));
				console.log("📤 WebSocket message sent immediately:", message.type);
				resolve(true);
			} else if (wsRef?.current?.readyState === WebSocket.CONNECTING) {
				// WebSocket is connecting, queue the message
				console.log("⏳ WebSocket connecting, queuing message:", message.type);
				messageQueue.push({
					message,
					resolve,
					timestamp: Date.now(),
				});
			} else {
				// WebSocket is not available or closed, queue and wait for connection
				console.log("🔌 WebSocket not connected, queuing message:", message.type);
				messageQueue.push({
					message,
					resolve,
					timestamp: Date.now(),
				});
			}
		} catch (e) {
			console.error("❌ WebSocket send error:", e);
			resolve(false);
		}
	});
}

async function modifyReservationWS(
	waId: string,
	updates: {
		date: string;
		time: string;
		title?: string;
		type?: number;
		approximate?: boolean;
		reservationId?: number;
		isLocalized?: boolean;
	}
): Promise<{ success: boolean; message?: string }> {
	const success = await sendWebSocketMessage({
		type: "modify_reservation",
		data: {
			wa_id: waId,
			date: updates.date,
			time_slot: updates.time,
			customer_name: updates.title,
			type: updates.type,
			approximate: updates.approximate,
			reservation_id: updates.reservationId,
			ar: updates.isLocalized || false,
		},
	});
	if (success) return { success: true };
	// Never fallback to HTTP
	return { success: false, message: "WebSocket unavailable" };
}

async function cancelReservationWS(
	waId: string,
	date: string,
	isLocalized?: boolean
): Promise<{ success: boolean; message?: string }> {
	const success = await sendWebSocketMessage({
		type: "cancel_reservation",
		data: { wa_id: waId, date: date, ar: isLocalized || false },
	});
	if (success) return { success: true };
	// Fallback to HTTP if WebSocket unavailable
	const resp = await cancelReservation({
		id: waId,
		date,
		...(typeof isLocalized === "boolean" ? { isLocalized } : {}),
	});
	return {
		success: Boolean((resp as { success?: unknown })?.success),
		...(typeof (resp as { message?: string; error?: string })?.message === "string"
			? { message: (resp as { message?: string })?.message as string }
			: typeof (resp as { message?: string; error?: string })?.error === "string"
				? { message: (resp as { error?: string })?.error as string }
				: {}),
	};
}

// Wait for websocket confirmation, but only start timeout after WebSocket connects
function waitForWSConfirmation(args: {
	reservationId?: string | number;
	waId?: string | number;
	date: string;
	time: string;
	timeoutMs?: number;
	isLocalized?: boolean;
}): Promise<{ success: boolean; message?: string }> {
	const { reservationId, waId, date, timeoutMs = 10000, isLocalized = false } = args;
	return new Promise((resolve) => {
		let resolved = false;
		const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } }).__wsConnection;

		const handler = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as { type?: UpdateType; data?: Record<string, unknown> } | undefined;
				const t = detail?.type;
				const d = detail?.data || {};

				// Debug modify_reservation events
				if (t?.includes("modify_reservation")) {
					console.log("🎯 WebSocket response:", t, (detail as { error?: string }).error || d.message);
				}

				// Listen for direct WebSocket ack/nack responses
				if (t === "modify_reservation_ack") {
					console.log("✅ Received modify_reservation_ack");
					if (!resolved) {
						resolved = true;
						window.removeEventListener("realtime", handler as EventListener);
						resolve({ success: true, message: d.message as string });
					}
				} else if (t === "modify_reservation_nack") {
					if (!resolved) {
						resolved = true;
						window.removeEventListener("realtime", handler as EventListener);
						// Extract error message from the WebSocket message
						const errorMessage =
							(typeof (detail as { error?: unknown })?.error === "string"
								? (detail as { error?: string }).error
								: undefined) ||
							(typeof d.message === "string" ? (d.message as string) : undefined) ||
							"Operation failed";
						resolve({
							success: false,
							message: errorMessage,
						});
					}
				}
				// Fallback: also listen for reservation_updated broadcasts (for backward compatibility)
				else if (
					(t === "reservation_updated" || t === "reservation_reinstated") &&
					((reservationId != null && String(d.id) === String(reservationId)) ||
						(waId != null && String(d.wa_id ?? d.waId) === String(waId) && String(d.date) === String(date)))
				) {
					console.log("✅ Received reservation_updated broadcast");
					if (!resolved) {
						resolved = true;
						window.removeEventListener("realtime", handler as EventListener);
						resolve({ success: true });
					}
				}
			} catch {}
		};

		const startConfirmationTimeout = () => {
			console.log(`🎯 Starting confirmation timeout of ${timeoutMs}ms (WebSocket connected)`);
			setTimeout(() => {
				try {
					window.removeEventListener("realtime", handler as EventListener);
				} catch {}
				if (!resolved) {
					console.log(`⏰ WebSocket confirmation timeout after ${timeoutMs}ms`);
					const timeoutMessage = i18n.getMessage("toast_request_timeout", isLocalized);
					resolve({ success: false, message: timeoutMessage });
				}
			}, timeoutMs);
		};

		try {
			window.addEventListener("realtime", handler as EventListener);
		} catch {}

		// Check if WebSocket is already connected
		if (wsRef?.current?.readyState === WebSocket.OPEN) {
			// WebSocket already connected, start timeout immediately
			startConfirmationTimeout();
		} else {
			// WebSocket not connected yet, wait for it to connect before starting timeout
			console.log("⏳ WebSocket not connected, waiting for connection before starting confirmation timeout");

			const connectionCheckInterval = setInterval(() => {
				if (resolved) {
					clearInterval(connectionCheckInterval);
					return;
				}

				if (wsRef?.current?.readyState === WebSocket.OPEN) {
					console.log("🔌 WebSocket connected, starting confirmation timeout");
					clearInterval(connectionCheckInterval);
					startConfirmationTimeout();
				}
			}, 100); // Check every 100ms for connection

			// Ultimate fallback timeout (much longer) in case WebSocket never connects
			setTimeout(() => {
				if (!resolved) {
					clearInterval(connectionCheckInterval);
					try {
						window.removeEventListener("realtime", handler as EventListener);
					} catch {}
					console.log("💀 Ultimate timeout - WebSocket never connected");
					const timeoutMessage = i18n.getMessage("toast_request_timeout", isLocalized);
					resolve({ success: false, message: timeoutMessage });
				}
			}, 30000); // 30 seconds ultimate timeout
		}
	});
}

export async function handleEventChange(args: {
	info: FullCalendarEventChangeInfo;
	isVacationDate: (date: string) => boolean;
	isLocalized: boolean;
	currentView: string;
	onRefresh: () => Promise<void>;
	getCalendarApi?: () => FullCalendarApi | undefined;
	updateEvent: (id: string, event: CalendarEventData) => void;
	resolveEvent?: (id: string) => { extendedProps?: Record<string, unknown> } | undefined;
}): Promise<void> {
	// Check if this event change should be suppressed
	const suppressDepth = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0;
	const { info, updateEvent, currentView, isVacationDate, resolveEvent } = args;

	// Guard: ignore eventChange triggered by our own programmatic updates
	if (suppressDepth > 0) {
		try {
			console.log("🚫 Suppressing handleEventChange (depth)", suppressDepth);
		} catch {}
		return;
	}
	try {
		console.log("🔄 handleEventChange called with:", {
			eventId: info?.event?.id,
			startStr: info?.event?.startStr,
			title: info?.event?.title,
		});

		const event = info?.event;
		if (!event) {
			console.warn("❌ No event in info, aborting");
			return;
		}

		// Convert to backend payload (match Streamlit behavior)
		const resolved = resolveEvent ? resolveEvent(String(event.id)) : undefined;
		const waId = String(
			event.extendedProps?.waId ||
				event.extendedProps?.wa_id ||
				resolved?.extendedProps?.waId ||
				resolved?.extendedProps?.wa_id ||
				event.id
		);
		const newDate = event.startStr?.split("T")[0];
		// Derive HH:mm deterministically from startStr to avoid timezone skew
		const rawTime = (event.startStr?.split("T")[1] || "00:00").slice(0, 5);
		// Normalize to slot base time for API call (DB stores slot base times, not presentation times)
		const slotBaseTime = normalizeToSlotBase(newDate || "", rawTime);
		const newTime = slotBaseTime;
		const type = event.extendedProps?.type ?? 0;
		// Prefer explicit reservationId; fallback to numeric event.id when available
		let reservationId: number | undefined = (event.extendedProps?.reservationId ||
			event.extendedProps?.reservation_id) as number | undefined;
		if (reservationId == null) {
			const maybeNum = Number(event.id);
			if (Number.isFinite(maybeNum)) reservationId = maybeNum as number;
		}
		const title = event.title;

		console.log("🔍 Extracted data:", {
			waId,
			newDate,
			newTime,
			type,
			reservationId,
			title,
		});

		// Skip if target date is a vacation day (let UI revert)
		if (newDate && isVacationDate && isVacationDate(newDate)) {
			console.log("❌ Vacation date detected, reverting");
			if (info?.revert) info.revert();
			return;
		}

		// Decide approximation by view: exact for timeGrid, approximate otherwise
		const isTimeGrid = (currentView || "").toLowerCase().includes("timegrid");
		// Use approximate mode for month/year views so backend adjusts to nearest valid slot
		const useApproximate = !isTimeGrid;

		// For month/year views we keep the dropped time as-is and rely on approximate=true
		// to let the backend adjust to the nearest valid slot of that day.

		// Mark this move locally to suppress immediate WS echo thrash
		try {
			(globalThis as { __calendarLocalMoves?: Map<string, number> }).__calendarLocalMoves =
				(globalThis as { __calendarLocalMoves?: Map<string, number> }).__calendarLocalMoves ||
				new Map<string, number>();
			(globalThis as { __calendarLocalMoves?: Map<string, number> }).__calendarLocalMoves?.set(
				String(event.id),
				Date.now()
			);
		} catch {}

		// Capture previous state for rich success toast after WS confirmation
		try {
			const prevStartStr: string | undefined = info?.oldEvent?.startStr;
			const prevDate = prevStartStr ? prevStartStr.split("T")[0] : undefined;
			const prevTime = prevStartStr ? (prevStartStr.split("T")[1] || "00:00").slice(0, 5) : undefined;
			const prevType: number | undefined = (info?.oldEvent?.extendedProps?.type ?? event.extendedProps?.type) as
				| number
				| undefined;
			const prevName: string | undefined = (info?.oldEvent?.title || event.title) as string | undefined;
			(globalThis as { __calendarLastModifyContext?: Map<string, unknown> }).__calendarLastModifyContext =
				(globalThis as { __calendarLastModifyContext?: Map<string, unknown> }).__calendarLastModifyContext ||
				new Map<string, unknown>();
			(globalThis as { __calendarLastModifyContext?: Map<string, unknown> }).__calendarLastModifyContext?.set(
				String(event.id),
				{
					waId,
					prevDate,
					prevTime,
					prevType,
					name: prevName,
					// Also stash intended new values for fallback comparison
					newDate,
					newTime,
					newType: type,
				}
			);
		} catch {}

		// Optimistic update: apply to calendar immediately; server confirmation will arrive via WS
		console.log("📡 Sending WebSocket modification:", {
			waId,
			date: newDate,
			time: newTime,
			title,
			type,
			approximate: useApproximate,
			reservationId,
		});

		// Send WebSocket modification and wait for ack/nack response
		const [wsResult, resp] = await Promise.all([
			modifyReservationWS(waId, {
				date: String(newDate || ""),
				time: newTime,
				type: Number(type) || 0,
				approximate: useApproximate,
				isLocalized: args.isLocalized,
				...(title && { title }),
				...(reservationId != null ? { reservationId } : {}),
			}),
			waitForWSConfirmation({
				...(reservationId != null ? { reservationId } : {}),
				waId: String(waId),
				date: String(newDate || ""),
				time: newTime,
				...(typeof args.isLocalized === "boolean" ? { isLocalized: args.isLocalized } : {}),
			}),
		]);

		console.log("📥 WebSocket send result:", wsResult);
		console.log("📥 WebSocket confirmation:", resp);

		// Diagnostics: log snapshots for source and target slots around the move
		try {
			const api = typeof args.getCalendarApi === "function" ? args.getCalendarApi() : undefined;
			const prevStartStr: string | undefined = args?.info?.oldEvent?.startStr;
			const prevDate = prevStartStr ? prevStartStr.split("T")[0] : undefined;
			const prevRawTime = prevStartStr ? (prevStartStr.split("T")[1] || "00:00").slice(0, 5) : undefined;
			const prevBase = prevDate && prevRawTime ? normalizeToSlotBase(prevDate, prevRawTime) : undefined;
			const targetDate = String(newDate || "");
			const targetBase = newTime;

			const collectSlotSnapshot = (
				api2: FullCalendarApi | undefined,
				dateStr: string,
				baseTime: string
			): { id: string; title: string; slotTime?: string; start?: string }[] => {
				try {
					const events = api2?.getEvents?.() || [];
					const inSlot = events.filter((e) => {
						try {
							const ext = (e?.extendedProps || {}) as {
								slotDate?: string;
								slotTime?: string;
								cancelled?: boolean;
								type?: unknown;
							};
							if (ext.cancelled === true) return false;
							const t = Number(ext.type ?? 0);
							if (t === 2) return false;
							return ext.slotDate === dateStr && ext.slotTime === baseTime;
						} catch {
							return false;
						}
					});
					return inSlot.map((e) => {
						const slotTime = (e as { extendedProps?: { slotTime?: string } })?.extendedProps?.slotTime;
						const startStr = (e as { startStr?: string }).startStr;
						const startDate = (e as { start?: Date }).start;
						const start = startStr || (startDate ? startDate.toISOString() : undefined);

						const result: {
							id: string;
							title: string;
							slotTime?: string;
							start?: string;
						} = {
							id: String((e as { id?: string }).id || ""),
							title: String((e as { title?: string }).title || ""),
						};

						if (slotTime) {
							result.slotTime = slotTime;
						}

						if (start) {
							result.start = start;
						}

						return result;
					});
				} catch {
					return [];
				}
			};

			const fromBefore = prevDate && prevBase ? collectSlotSnapshot(api, prevDate, prevBase) : [];
			const toBefore = targetDate && targetBase ? collectSlotSnapshot(api, targetDate, targetBase) : [];
			console.groupCollapsed("🧭 DND Slot Snapshot (before)");
			console.log("move", {
				id: event.id,
				from: { prevDate, prevBase },
				to: { targetDate, targetBase },
			});
			console.table(
				fromBefore.map((e) => ({
					id: e.id,
					title: e.title,
					slotTime: e.slotTime,
					start: e.start,
				}))
			);
			console.table(
				toBefore.map((e) => ({
					id: e.id,
					title: e.title,
					slotTime: e.slotTime,
					start: e.start,
				}))
			);
			console.groupEnd();
		} catch {}

		if (!resp?.success) {
			console.log("❌ Backend rejected the modification, reverting", resp);

			// Revert the visual change first (FullCalendar has already moved the event)
			if (info?.revert) {
				info.revert();
				console.log("🔄 Event reverted to original position");
			}

			// Then show error notification
			try {
				// Backend already sends translated messages when ar=true is passed
				// Use i18n fallback only if no message is provided
				const message = resp?.message || i18n.getMessage("slot_fully_booked", args.isLocalized);
				console.log("🔔 Showing error notification:", {
					title,
					waId,
					newDate,
					newTime,
					message,
				});
				toastService.reservationModificationFailed({
					customer: title,
					wa_id: String(waId),
					date: String(newDate || ""),
					time: newTime,
					isLocalized: Boolean(args.isLocalized),
					error: message,
				});
			} catch (e) {
				console.error("Failed to show error notification:", e);
			}
		} else {
			console.log("✅ Backend accepted the modification");

			// Success notification will come via WebSocket echo - no direct toast needed

			// Only update local state if backend accepted the change
			updateEvent(event.id, {
				id: event.id,
				title: event.title,
				start: event.startStr || "",
				...(event.endStr && { end: event.endStr }),
			});

			// Normalize UI event to slot base and strictly reflow previous and target slots
			try {
				const api = typeof args.getCalendarApi === "function" ? args.getCalendarApi() : undefined;
				if (api?.getEventById) {
					const evObj = api.getEventById(String(event.id));
					if (evObj) {
						try {
							const depth =
								((globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0) + 1;
							(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = depth;
							const baseStart = new Date(`${String(newDate || "")}T${newTime}:00`);
							const baseEnd = new Date(baseStart.getTime() + 20 * 60000);
							(evObj as unknown as { setDates?: (s: Date, e: Date) => void })?.setDates?.(baseStart, baseEnd);
							try {
								(
									evObj as unknown as {
										setExtendedProp?: (k: string, v: unknown) => void;
									}
								)?.setExtendedProp?.("slotDate", String(newDate || ""));
							} catch {}
							try {
								(
									evObj as unknown as {
										setExtendedProp?: (k: string, v: unknown) => void;
									}
								)?.setExtendedProp?.("slotTime", newTime);
							} catch {}
							try {
								(
									evObj as unknown as {
										setExtendedProp?: (k: string, v: unknown) => void;
									}
								)?.setExtendedProp?.("cancelled", false);
							} catch {}
							// Ensure reservationId stays on the event for future drags
							try {
								const rid =
									reservationId != null
										? reservationId
										: (() => {
												const n = Number(event.id);
												return Number.isFinite(n) ? (n as number) : undefined;
											})();
								if (rid != null)
									(
										evObj as unknown as {
											setExtendedProp?: (k: string, v: unknown) => void;
										}
									)?.setExtendedProp?.("reservationId", rid);
							} catch {}
							setTimeout(() => {
								try {
									const d = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth;
									if (typeof d === "number" && d > 0)
										(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = d - 1;
								} catch {}
							}, 0);
						} catch {}

						const reflowSlotStrict = (dateStr: string, baseTime: string) => {
							try {
								const all = api.getEvents();
								const inSlot = all
									.filter((e) => {
										try {
											const ext = (e?.extendedProps || {}) as {
												slotDate?: string;
												slotTime?: string;
												cancelled?: boolean;
												type?: unknown;
											};
											if (ext.cancelled === true) return false;
											const t = Number(ext.type ?? 0);
											if (t === 2) return false;
											return ext.slotDate === dateStr && ext.slotTime === baseTime;
										} catch {
											return false;
										}
									})
									.sort((a, b) => {
										const ta = Number((a as { extendedProps?: { type?: unknown } }).extendedProps?.type ?? 0);
										const tb = Number((b as { extendedProps?: { type?: unknown } }).extendedProps?.type ?? 0);
										if (ta !== tb) return ta - tb;
										const na = String((a as { title?: string }).title || "");
										const nb = String((b as { title?: string }).title || "");
										return na.localeCompare(nb);
									});

								const minutesPerReservation = inSlot.length >= 6 ? 15 : 20;
								const gapMinutes = 1;
								for (let i = 0; i < inSlot.length; i++) {
									const ev = inSlot[i];
									const offset = i * (minutesPerReservation + gapMinutes);
									const timeParts = baseTime.split(":");
									const h = timeParts[0] ? Number.parseInt(timeParts[0], 10) : 0;
									const m = timeParts[1] ? Number.parseInt(timeParts[1], 10) : 0;
									const base = new Date(`${dateStr}T00:00:00`);
									const start = new Date(base);
									start.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
									start.setMinutes(start.getMinutes() + offset);
									const end = new Date(start.getTime() + minutesPerReservation * 60000);
									try {
										const depth2 =
											((globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0) + 1;
										(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = depth2;
										(ev as unknown as { setDates?: (s: Date, e: Date) => void })?.setDates?.(start, end);
										try {
											(
												ev as unknown as {
													setExtendedProp?: (k: string, v: unknown) => void;
												}
											)?.setExtendedProp?.("slotDate", dateStr);
										} catch {}
										try {
											(
												ev as unknown as {
													setExtendedProp?: (k: string, v: unknown) => void;
												}
											)?.setExtendedProp?.("slotTime", baseTime);
										} catch {}
									} catch {}
									setTimeout(() => {
										try {
											const d2 = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth;
											if (typeof d2 === "number" && d2 > 0)
												(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = d2 - 1;
										} catch {}
									}, 0);
								}
							} catch {}
						};

						const prevStartStr: string | undefined = args?.info?.oldEvent?.startStr;
						const prevDate = prevStartStr ? prevStartStr.split("T")[0] : undefined;
						const prevRawTime = prevStartStr ? (prevStartStr.split("T")[1] || "00:00").slice(0, 5) : undefined;
						const prevBase = prevDate && prevRawTime ? normalizeToSlotBase(prevDate, prevRawTime) : undefined;

						if (prevDate && prevBase) reflowSlotStrict(prevDate, prevBase);
						if (newDate && newTime) reflowSlotStrict(String(newDate), newTime);
					}
				}
			} catch {}

			// After success: log snapshots again so we can spot mismatches
			try {
				const api = typeof args.getCalendarApi === "function" ? args.getCalendarApi() : undefined;
				const prevStartStr2: string | undefined = args?.info?.oldEvent?.startStr;
				const prevDate2 = prevStartStr2 ? prevStartStr2.split("T")[0] : undefined;
				const prevRawTime2 = prevStartStr2 ? (prevStartStr2.split("T")[1] || "00:00").slice(0, 5) : undefined;
				const prevBase2 = prevDate2 && prevRawTime2 ? normalizeToSlotBase(prevDate2, prevRawTime2) : undefined;
				const targetDate2 = String(newDate || "");
				const targetBase2 = newTime;

				const collectSlotSnapshot2 = (
					api2: FullCalendarApi | undefined,
					dateStr: string,
					baseTime: string
				): {
					id: string;
					title: string;
					slotTime?: string;
					start?: string;
				}[] => {
					try {
						const events = api2?.getEvents?.() || [];
						const inSlot = events.filter((e) => {
							try {
								const ext = (e?.extendedProps || {}) as {
									slotDate?: string;
									slotTime?: string;
									cancelled?: boolean;
									type?: unknown;
								};
								if (ext.cancelled === true) return false;
								const t = Number(ext.type ?? 0);
								if (t === 2) return false;
								return ext.slotDate === dateStr && ext.slotTime === baseTime;
							} catch {
								return false;
							}
						});
						return inSlot.map((e) => {
							const slotTime = (e as { extendedProps?: { slotTime?: string } })?.extendedProps?.slotTime;
							const startStr = (e as { startStr?: string }).startStr;
							const startDate = (e as { start?: Date }).start;
							const start = startStr || (startDate ? startDate.toISOString() : undefined);

							const result: {
								id: string;
								title: string;
								slotTime?: string;
								start?: string;
							} = {
								id: String((e as { id?: string }).id || ""),
								title: String((e as { title?: string }).title || ""),
							};

							if (slotTime) {
								result.slotTime = slotTime;
							}

							if (start) {
								result.start = start;
							}

							return result;
						});
					} catch {
						return [];
					}
				};

				const fromAfter = prevDate2 && prevBase2 ? collectSlotSnapshot2(api, prevDate2, prevBase2) : [];
				const toAfter = targetDate2 && targetBase2 ? collectSlotSnapshot2(api, targetDate2, targetBase2) : [];
				console.groupCollapsed("🧭 DND Slot Snapshot (after)");
				console.table(
					fromAfter.map((e) => ({
						id: e.id,
						title: e.title,
						slotTime: e.slotTime,
						start: e.start,
					}))
				);
				console.table(
					toAfter.map((e) => ({
						id: e.id,
						title: e.title,
						slotTime: e.slotTime,
						start: e.start,
					}))
				);
				console.groupEnd();
			} catch {}
		}
		// Note: Removed post-drag reflow to prevent triggering eventChange for other events in slot
		// Alignment will happen on next render via alignAndSortEventsForCalendar
		// Mark this operation as local to suppress unread increments on WS echo (cover id/wa_id and time variants)
		try {
			const localOpsSet = (globalThis as { __localOps?: Set<string> }).__localOps;
			const keysArr = [
				`reservation_updated:${String(event.id)}:${String(newDate || "")}:${newTime}`,
				`reservation_updated:${String(waId)}:${String(newDate || "")}:${newTime}`,
			];
			for (const k of keysArr) {
				localOpsSet?.add(k);
			}
			setTimeout(() => {
				try {
					const s = (globalThis as { __localOps?: Set<string> }).__localOps;
					for (const k of keysArr) {
						s?.delete(k);
					}
				} catch {}
			}, 5000);
		} catch {}
	} catch (error) {
		console.error("💥 Exception in handleEventChange, reverting:", error);
		// Revert on error
		if (args?.info?.revert) args.info.revert();
	}
}

export async function handleOpenConversation(args: {
	eventId: string;
	openConversation: (id: string) => void;
}): Promise<void> {
	const { eventId, openConversation } = args;
	// Do not fetch on click; use in-memory data and just open the sidebar
	openConversation(eventId);
}

export async function handleCancelReservation(args: {
	eventId: string;
	events: CalendarEventData[];
	isLocalized: boolean;
	onRefresh: () => Promise<void>;
	getCalendarApi?: () => FullCalendarApi;
	onEventCancelled?: (eventId: string) => void;
}): Promise<void> {
	const { eventId, events, isLocalized, getCalendarApi, onEventCancelled } = args;
	// Resolve from state first, then FullCalendar for freshest extendedProps (tolerate number/string ids)
	const stateEv = events.find((e) => String(e.id) === String(eventId));
	let api: FullCalendarApi | null = null;
	let fcEvent: FullCalendarEvent | null = null;
	try {
		api = typeof getCalendarApi === "function" ? getCalendarApi() : null;
		fcEvent = api?.getEventById?.(String(eventId)) || null;
	} catch {}

	const startStr: string | undefined = stateEv?.start || fcEvent?.startStr || fcEvent?.start?.toISOString?.();
	const date = (startStr || "").split("T")[0] || "";
	let waId: string = (
		stateEv?.extendedProps?.waId ||
		stateEv?.extendedProps?.wa_id ||
		fcEvent?.extendedProps?.waId ||
		fcEvent?.extendedProps?.wa_id ||
		""
	).toString();
	// Fallback: some events might carry waId as the event id itself
	if (!waId) waId = String(eventId);

	if (!waId || !date) {
		toastService.error(
			isLocalized ? "فشل الإلغاء" : "Cancel Failed",
			isLocalized ? "بيانات غير كاملة (الهاتف/التاريخ)" : "Missing waId/date to cancel",
			3000
		);
		return;
	}

	// Optimistic: mark as cancelled immediately; rely on WS and removal on success
	try {
		// Use suppressed event change to prevent triggering modification events
		const currentDepth = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0;
		(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth + 1;
		fcEvent?.setExtendedProp?.("cancelled", true);
		(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth;
	} catch {}

	try {
		const resp = await cancelReservationWS(waId, date, Boolean(isLocalized));
		if (!resp?.success) {
			const message = resp?.message ?? "";
			toastService.error(
				isLocalized ? "فشل الإلغاء" : "Cancel Failed",
				message || (isLocalized ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later"),
				3000
			);
			try {
				// Use suppressed event change to prevent triggering modification events
				const currentDepth = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0;
				(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth + 1;
				fcEvent?.setExtendedProp?.("cancelled", false);
				(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth;
			} catch {}
			return;
		}

		// Remove event from calendar on success (align with grid UX)
		try {
			// Use suppressed event change to prevent triggering modification events
			const currentDepth = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0;
			(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth + 1;
			fcEvent?.remove?.();
			(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth;
		} catch {}
		try {
			if (onEventCancelled) onEventCancelled(String(eventId));
		} catch {}

		// Local echo suppression to avoid duplicate WS toasts
		const markLocalEcho = (key: string) => {
			try {
				(globalThis as { __localOps?: Set<string> }).__localOps =
					(globalThis as { __localOps?: Set<string> }).__localOps || new Set<string>();
				const s = (globalThis as { __localOps?: Set<string> }).__localOps;
				s?.add(key);
				setTimeout(() => {
					try {
						const s2 = (globalThis as { __localOps?: Set<string> }).__localOps;
						s2?.delete(key);
					} catch {}
				}, 4000);
			} catch {}
		};
		const reservationId = String(
			(stateEv?.extendedProps?.reservationId || fcEvent?.extendedProps?.reservationId || eventId) ?? ""
		);
		const key1 = `reservation_cancelled:${reservationId}:${String(date)}:`;
		const key2 = `reservation_cancelled:${String(waId)}:${String(date)}:`;
		markLocalEcho(key1);
		markLocalEcho(key2);
	} catch (_e) {
		toastService.error(
			isLocalized ? "فشل الإلغاء" : "Cancel Failed",
			isLocalized ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later",
			3000
		);
		try {
			// Use suppressed event change to prevent triggering modification events
			const currentDepth = (globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth || 0;
			(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth + 1;
			fcEvent?.setExtendedProp?.("cancelled", false);
			(globalThis as { __suppressEventChangeDepth?: number }).__suppressEventChangeDepth = currentDepth;
		} catch {}
	}
}

// Normalize a time to the start of its 2-hour slot window for the given date
function normalizeToSlotBase(dateStr: string, timeStr: string): string {
	try {
		const baseTime = to24h(String(timeStr || "00:00"));
		const baseParts = baseTime.split(":");
		const hh = Number.parseInt(String(baseParts[0] ?? "0"), 10);
		const mm = Number.parseInt(String(baseParts[1] ?? "0"), 10);
		const minutes = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
		const day = new Date(`${dateStr}T00:00:00`);
		const res = getSlotTimes(day, false, "") || { slotMinTime: "00:00:00" };
		const slotMin = String(res.slotMinTime || "00:00:00").slice(0, 5);
		const parts = slotMin.split(":");
		const sH = Number.parseInt(String(parts[0] ?? "0"), 10);
		const sM = Number.parseInt(String(parts[1] ?? "0"), 10);
		const minMinutes = (Number.isFinite(sH) ? sH : 0) * 60 + (Number.isFinite(sM) ? sM : 0);
		const duration = Math.max(60, (SLOT_DURATION_HOURS || 2) * 60);
		const rel = Math.max(0, minutes - minMinutes);
		const slotIndex = Math.floor(rel / duration);
		const baseMinutes = minMinutes + slotIndex * duration;
		const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, "0");
		const mmOut = String(baseMinutes % 60).padStart(2, "0");
		return `${hhOut}:${mmOut}`;
	} catch {
		return to24h(String(timeStr || "00:00"));
	}
}

// Note: Removed reflowSlotAfterDrag function to prevent POST storms
// Slot alignment now handled only at render-time via alignAndSortEventsForCalendar
