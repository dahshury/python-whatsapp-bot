import { cancelReservation } from "@/lib/api";
import { getSlotTimes, SLOT_DURATION_HOURS } from "@/lib/calendar-config";
import { i18n } from "@/lib/i18n";
import type { UpdateType } from "@/lib/realtime-utils";
import { toastService } from "@/lib/toast-service";
import { to24h } from "./utils";

// Toasts are centralized in WebSocketDataProvider to avoid duplicates

// WebSocket message interfaces
interface WebSocketMessage {
	type: string;
	data?: Record<string, unknown>;
	[key: string]: unknown;
}

// FullCalendar event interfaces
interface FullCalendarEventChangeInfo {
	event: {
		id: string;
		title: string;
		start: Date;
		end?: Date;
		startStr?: string;
		endStr?: string;
		extendedProps?: Record<string, unknown>;
	};
	oldEvent?: {
		id: string;
		title: string;
		start: Date;
		end?: Date;
		startStr?: string;
		extendedProps?: Record<string, unknown>;
	};
	revert?: () => void;
}

interface FullCalendarApi {
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

interface FullCalendarEvent {
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

interface CalendarEventData {
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
	const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
		.__wsConnection;
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
if (
	typeof globalThis !== "undefined" &&
	!(globalThis as { __wsQueueSetup?: boolean }).__wsQueueSetup
) {
	(globalThis as { __wsQueueSetup?: boolean }).__wsQueueSetup = true;

	// Check periodically if WebSocket connects and process queue
	const checkConnection = () => {
		const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
			.__wsConnection;
		if (
			wsRef?.current?.readyState === WebSocket.OPEN &&
			messageQueue.length > 0
		) {
			processMessageQueue();
		}
	};

	setInterval(checkConnection, 500); // Check every 500ms
}

// WebSocket-based operations to replace HTTP API calls
function sendWebSocketMessage(message: WebSocketMessage): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
				.__wsConnection;

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
				console.log(
					"🔌 WebSocket not connected, queuing message:",
					message.type,
				);
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
		isRTL?: boolean;
	},
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
			ar: updates.isRTL || false,
		},
	});
	if (success) return { success: true };
	// Never fallback to HTTP
	return { success: false, message: "WebSocket unavailable" };
}

async function cancelReservationWS(
	waId: string,
	date: string,
	isRTL?: boolean,
): Promise<{ success: boolean; message?: string }> {
	const success = await sendWebSocketMessage({
		type: "cancel_reservation",
		data: { wa_id: waId, date: date, ar: isRTL || false },
	});
	if (success) return { success: true };
	// Fallback to HTTP if WebSocket unavailable
	const resp = await cancelReservation({
		id: waId,
		date,
		...(typeof isRTL === "boolean" ? { isRTL } : {}),
	});
	return {
		success: Boolean((resp as { success?: unknown })?.success),
		...(typeof (resp as { message?: string; error?: string })?.message ===
		"string"
			? { message: (resp as { message?: string })?.message as string }
			: typeof (resp as { message?: string; error?: string })?.error ===
					"string"
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
	isRTL?: boolean;
}): Promise<{ success: boolean; message?: string }> {
	const { reservationId, waId, date, timeoutMs = 10000, isRTL = false } = args;
	return new Promise((resolve) => {
		let resolved = false;
		const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
			.__wsConnection;

		const handler = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| { type?: UpdateType; data?: Record<string, unknown> }
					| undefined;
				const t = detail?.type;
				const d = detail?.data || {};

				// Debug modify_reservation events
				if (t?.includes("modify_reservation")) {
					console.log(
						"🎯 WebSocket response:",
						t,
						(detail as { error?: string }).error || d.message,
					);
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
							(typeof d.message === "string"
								? (d.message as string)
								: undefined) ||
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
						(waId != null &&
							String(d.wa_id ?? d.waId) === String(waId) &&
							String(d.date) === String(date)))
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
			console.log(
				`🎯 Starting confirmation timeout of ${timeoutMs}ms (WebSocket connected)`,
			);
			setTimeout(() => {
				try {
					window.removeEventListener("realtime", handler as EventListener);
				} catch {}
				if (!resolved) {
					console.log(`⏰ WebSocket confirmation timeout after ${timeoutMs}ms`);
					const timeoutMessage = i18n.getMessage(
						"toast_request_timeout",
						isRTL,
					);
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
			console.log(
				"⏳ WebSocket not connected, waiting for connection before starting confirmation timeout",
			);

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
					const timeoutMessage = i18n.getMessage(
						"toast_request_timeout",
						isRTL,
					);
					resolve({ success: false, message: timeoutMessage });
				}
			}, 30000); // 30 seconds ultimate timeout
		}
	});
}

export async function handleEventChange(args: {
	info: FullCalendarEventChangeInfo;
	isVacationDate: (date: string) => boolean;
	isRTL: boolean;
	currentView: string;
	onRefresh: () => Promise<void>;
	getCalendarApi?: () => FullCalendarApi;
	updateEvent: (id: string, event: CalendarEventData) => void;
	resolveEvent?: (
		id: string,
	) => { extendedProps?: Record<string, unknown> } | undefined;
}): Promise<void> {
	// Check if this event change should be suppressed
	const suppressDepth =
		(globalThis as { __suppressEventChangeDepth?: number })
			.__suppressEventChangeDepth || 0;
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
				event.id,
		);
		const newDate = event.startStr?.split("T")[0];
		// Derive HH:mm deterministically from startStr to avoid timezone skew
		const rawTime = (event.startStr?.split("T")[1] || "00:00").slice(0, 5);
		// Normalize to slot base time for API call (DB stores slot base times, not presentation times)
		const slotBaseTime = normalizeToSlotBase(newDate || "", rawTime);
		const newTime = slotBaseTime;
		const type = event.extendedProps?.type ?? 0;
		const reservationId: number | undefined = (event.extendedProps
			?.reservationId || event.extendedProps?.reservation_id) as
			| number
			| undefined;
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
			(
				globalThis as { __calendarLocalMoves?: Map<string, number> }
			).__calendarLocalMoves =
				(globalThis as { __calendarLocalMoves?: Map<string, number> })
					.__calendarLocalMoves || new Map<string, number>();
			(
				globalThis as { __calendarLocalMoves?: Map<string, number> }
			).__calendarLocalMoves?.set(String(event.id), Date.now());
		} catch {}

		// Capture previous state for rich success toast after WS confirmation
		try {
			const prevStartStr: string | undefined = info?.oldEvent?.startStr;
			const prevDate = prevStartStr ? prevStartStr.split("T")[0] : undefined;
			const prevTime = prevStartStr
				? (prevStartStr.split("T")[1] || "00:00").slice(0, 5)
				: undefined;
			const prevType: number | undefined = (info?.oldEvent?.extendedProps
				?.type ?? event.extendedProps?.type) as number | undefined;
			const prevName: string | undefined = (info?.oldEvent?.title ||
				event.title) as string | undefined;
			(
				globalThis as { __calendarLastModifyContext?: Map<string, unknown> }
			).__calendarLastModifyContext =
				(globalThis as { __calendarLastModifyContext?: Map<string, unknown> })
					.__calendarLastModifyContext || new Map<string, unknown>();
			(
				globalThis as { __calendarLastModifyContext?: Map<string, unknown> }
			).__calendarLastModifyContext?.set(String(event.id), {
				waId,
				prevDate,
				prevTime,
				prevType,
				name: prevName,
				// Also stash intended new values for fallback comparison
				newDate,
				newTime,
				newType: type,
			});
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
				isRTL: args.isRTL,
				...(title && { title }),
				...(reservationId != null ? { reservationId } : {}),
			}),
			waitForWSConfirmation({
				...(reservationId != null ? { reservationId } : {}),
				waId: String(waId),
				date: String(newDate || ""),
				time: newTime,
				...(typeof args.isRTL === "boolean" ? { isRTL: args.isRTL } : {}),
			}),
		]);

		console.log("📥 WebSocket send result:", wsResult);
		console.log("📥 WebSocket confirmation:", resp);

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
				const message =
					resp?.message || i18n.getMessage("slot_fully_booked", args.isRTL);
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
					isRTL: Boolean(args.isRTL),
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
		}
		// Note: Removed post-drag reflow to prevent triggering eventChange for other events in slot
		// Alignment will happen on next render via alignAndSortEventsForCalendar
		// Mark this operation as local to suppress unread increments on WS echo (cover id/wa_id and time variants)
		try {
			const localOpsSet = (globalThis as { __localOps?: Set<string> })
				.__localOps;
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
	isRTL: boolean;
	onRefresh: () => Promise<void>;
	getCalendarApi?: () => FullCalendarApi;
	onEventCancelled?: (eventId: string) => void;
}): Promise<void> {
	const { eventId, events, isRTL, getCalendarApi, onEventCancelled } = args;
	// Resolve from state first, then FullCalendar for freshest extendedProps (tolerate number/string ids)
	const stateEv = events.find((e) => String(e.id) === String(eventId));
	let api: FullCalendarApi | null = null;
	let fcEvent: FullCalendarEvent | null = null;
	try {
		api = typeof getCalendarApi === "function" ? getCalendarApi() : null;
		fcEvent = api?.getEventById?.(String(eventId)) || null;
	} catch {}

	const startStr: string | undefined =
		stateEv?.start || fcEvent?.startStr || fcEvent?.start?.toISOString?.();
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
		try {
			const toaster = (await import("sonner")).toast;
			toaster.error(isRTL ? "فشل الإلغاء" : "Cancel Failed", {
				description: isRTL
					? "بيانات غير كاملة (الهاتف/التاريخ)"
					: "Missing waId/date to cancel",
				duration: 3000,
			});
		} catch {}
		return;
	}

	// Optimistic: mark as cancelled immediately; rely on WS and removal on success
	try {
		// Use suppressed event change to prevent triggering modification events
		const currentDepth =
			(globalThis as { __suppressEventChangeDepth?: number })
				.__suppressEventChangeDepth || 0;
		(
			globalThis as { __suppressEventChangeDepth?: number }
		).__suppressEventChangeDepth = currentDepth + 1;
		fcEvent?.setExtendedProp?.("cancelled", true);
		(
			globalThis as { __suppressEventChangeDepth?: number }
		).__suppressEventChangeDepth = currentDepth;
	} catch {}

	try {
		const resp = await cancelReservationWS(waId, date, Boolean(isRTL));
		if (!resp?.success) {
			try {
				const toaster = (await import("sonner")).toast;
				const message = resp?.message ?? "";
				toaster.error(isRTL ? "فشل الإلغاء" : "Cancel Failed", {
					description:
						message ||
						(isRTL ? "خطأ بالنظام، حاول لاحقًا" : "System error, try later"),
					duration: 3000,
				});
			} catch {}
			try {
				// Use suppressed event change to prevent triggering modification events
				const currentDepth =
					(globalThis as { __suppressEventChangeDepth?: number })
						.__suppressEventChangeDepth || 0;
				(
					globalThis as { __suppressEventChangeDepth?: number }
				).__suppressEventChangeDepth = currentDepth + 1;
				fcEvent?.setExtendedProp?.("cancelled", false);
				(
					globalThis as { __suppressEventChangeDepth?: number }
				).__suppressEventChangeDepth = currentDepth;
			} catch {}
			return;
		}

		// Remove event from calendar on success (align with grid UX)
		try {
			// Use suppressed event change to prevent triggering modification events
			const currentDepth =
				(globalThis as { __suppressEventChangeDepth?: number })
					.__suppressEventChangeDepth || 0;
			(
				globalThis as { __suppressEventChangeDepth?: number }
			).__suppressEventChangeDepth = currentDepth + 1;
			fcEvent?.remove?.();
			(
				globalThis as { __suppressEventChangeDepth?: number }
			).__suppressEventChangeDepth = currentDepth;
		} catch {}
		try {
			if (onEventCancelled) onEventCancelled(String(eventId));
		} catch {}

		// Local echo suppression to avoid duplicate WS toasts
		const markLocalEcho = (key: string) => {
			try {
				(globalThis as { __localOps?: Set<string> }).__localOps =
					(globalThis as { __localOps?: Set<string> }).__localOps ||
					new Set<string>();
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
			(stateEv?.extendedProps?.reservationId ||
				fcEvent?.extendedProps?.reservationId ||
				eventId) ??
				"",
		);
		const key1 = `reservation_cancelled:${reservationId}:${String(date)}:`;
		const key2 = `reservation_cancelled:${String(waId)}:${String(date)}:`;
		markLocalEcho(key1);
		markLocalEcho(key2);
	} catch (_e) {
		try {
			const toaster = (await import("sonner")).toast;
			toaster.error(isRTL ? "فشل الإلغاء" : "Cancel Failed", {
				description: isRTL
					? "خطأ بالنظام، حاول لاحقًا"
					: "System error, try later",
				duration: 3000,
			});
		} catch {}
		try {
			// Use suppressed event change to prevent triggering modification events
			const currentDepth =
				(globalThis as { __suppressEventChangeDepth?: number })
					.__suppressEventChangeDepth || 0;
			(
				globalThis as { __suppressEventChangeDepth?: number }
			).__suppressEventChangeDepth = currentDepth + 1;
			fcEvent?.setExtendedProp?.("cancelled", false);
			(
				globalThis as { __suppressEventChangeDepth?: number }
			).__suppressEventChangeDepth = currentDepth;
		} catch {}
	}
}

// Normalize a time to the start of its 2-hour slot window for the given date
function normalizeToSlotBase(dateStr: string, timeStr: string): string {
	try {
		const baseTime = to24h(String(timeStr || "00:00"));
		const baseParts = baseTime.split(":");
		const hh = parseInt(String(baseParts[0] ?? "0"), 10);
		const mm = parseInt(String(baseParts[1] ?? "0"), 10);
		const minutes =
			(Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
		const day = new Date(`${dateStr}T00:00:00`);
		const res = getSlotTimes(day, false, "") || { slotMinTime: "00:00:00" };
		const slotMin = String(res.slotMinTime || "00:00:00").slice(0, 5);
		const parts = slotMin.split(":");
		const sH = parseInt(String(parts[0] ?? "0"), 10);
		const sM = parseInt(String(parts[1] ?? "0"), 10);
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
		return to24h(String(timeStr || "00:00"));
	}
}

// Note: Removed reflowSlotAfterDrag function to prevent POST storms
// Slot alignment now handled only at render-time via alignAndSortEventsForCalendar
