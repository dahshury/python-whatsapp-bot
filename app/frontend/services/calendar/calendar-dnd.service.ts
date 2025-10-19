/* eslint-disable */

import { toastService } from "@shared/libs/toast/toast-service";
import type { CalendarApi } from "@/entities/event";
import { generateLocalOpKeys } from "@/shared/libs/realtime-utils";
import type { LocalEchoManager } from "@/shared/libs/utils/local-echo.manager";
import { FormattingService } from "../utils/formatting.service";
import type { WebSocketService } from "../websocket/websocket.service";
import { CalendarIntegrationService } from "./calendar-integration.service";

export type EventChangeInfo = {
	event: {
		id: string;
		title?: string;
		start?: Date;
		end?: Date;
		startStr?: string;
		endStr?: string;
		extendedProps?: Record<string, unknown>;
	};
	oldEvent?: {
		id: string;
		title?: string;
		start?: Date;
		end?: Date;
		startStr?: string;
		endStr?: string;
		extendedProps?: Record<string, unknown>;
	};
	revert?: () => void;
};

const TIME_FIELD_LENGTH = 5; // HH:MM format
const SLOT_WINDOW_DURATION_MINUTES = 120; // 2 hours slot window
const SKIP_EVENT_TYPE = 2;
const RESERVATION_DURATION_THRESHOLD = 6;
const SHORT_DURATION_MINUTES = 15;
const LONG_DURATION_MINUTES = 20;
const SECOND_REFLOW_DELAY_MS = 50;

export class CalendarDnDService {
	private readonly calendarApi: CalendarApi;
	private readonly webSocketService: WebSocketService;
	private readonly localEchoManager: LocalEchoManager;
	private readonly isLocalized: boolean;
	private readonly calendarIntegration: CalendarIntegrationService;
	private readonly formatting: FormattingService;

	constructor(
		calendarApi: CalendarApi,
		webSocketService: WebSocketService,
		localEchoManager: LocalEchoManager,
		isLocalized: boolean
	) {
		this.calendarApi = calendarApi;
		this.webSocketService = webSocketService;
		this.localEchoManager = localEchoManager;
		this.isLocalized = isLocalized;
		this.calendarIntegration = new CalendarIntegrationService(
			calendarApi,
			localEchoManager
		);
		this.formatting = new FormattingService();
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex event handling with multiple scenarios requires high complexity
	async handleEventChange(args: {
		info: EventChangeInfo;
		isVacationDate: (date: string) => boolean;
		currentView: string;
		updateEvent: (
			id: string,
			event: { id: string; title?: string; start?: string; end?: string }
		) => void;
		resolveEvent?: (
			id: string
		) => { extendedProps?: Record<string, unknown> } | undefined;
	}): Promise<void> {
		const { info, isVacationDate, currentView, updateEvent, resolveEvent } =
			args;
		const event = info?.event;
		if (!event) {
			return;
		}

		// Skip if a reservation modification is already in-flight for this event
		try {
			const resKey = String(event.id || "");
			const inFlight = (
				globalThis as unknown as { __reservationModifyInFlight?: Set<string> }
			).__reservationModifyInFlight;
			if (resKey && inFlight && inFlight.has(resKey)) {
				// biome-ignore lint/suspicious/noConsole: DEBUG
				globalThis.console?.log?.(
					"[CalendarDnD] handleEventChange skipped (modify in-flight)",
					{ resKey }
				);
				return;
			}
		} catch {
			// Ignore guard errors
		}

		// Suppress handler when programmatic calendar updates occur (e.g., data-table save)
		try {
			const until = (
				globalThis as unknown as { __suppressCalendarEventChangeUntil?: number }
			).__suppressCalendarEventChangeUntil;
			if (typeof until === "number" && Date.now() < until) {
				// biome-ignore lint/suspicious/noConsole: DEBUG
				globalThis.console?.log?.(
					"[CalendarDnD] handleEventChange suppressed (programmatic update)",
					{ until }
				);
				return;
			}
		} catch {
			// Ignore suppression flag errors
		}

		// Suppress cascading eventChange handlers for this entire drag/reflow cycle
		const suppressDepthBefore =
			(globalThis as { __suppressEventChangeDepth?: number })
				.__suppressEventChangeDepth ?? 0;
		(
			globalThis as { __suppressEventChangeDepth?: number }
		).__suppressEventChangeDepth = suppressDepthBefore + 1;

		try {
			// Ignore moves on vacation dates
			const newDate = String(event.startStr || "").split("T")[0] || "";
			if (newDate && isVacationDate && isVacationDate(newDate)) {
				if (info?.revert) {
					info.revert();
				}
				return;
			}

			// Extract identifiers and metadata
			const resolved = resolveEvent
				? resolveEvent(String(event.id))
				: undefined;
			const waId = String(
				event.extendedProps?.waId ||
					event.extendedProps?.wa_id ||
					resolved?.extendedProps?.waId ||
					resolved?.extendedProps?.wa_id ||
					event.id
			);
			const rawTime = (event.startStr?.split("T")[1] || "00:00").slice(
				0,
				TIME_FIELD_LENGTH
			);
			const slotBaseTime = this.formatting.normalizeToSlotBase(
				newDate,
				rawTime
			);
			const newTime = slotBaseTime;
			const type = Number(event.extendedProps?.type ?? 0);

			// Prefer explicit reservationId; fallback to numeric id if applicable
			let reservationId: number | undefined = (event.extendedProps
				?.reservationId || event.extendedProps?.reservation_id) as
				| number
				| undefined;
			if (reservationId == null) {
				const maybeNum = Number(event.id);
				if (Number.isFinite(maybeNum)) {
					reservationId = maybeNum as number;
				}
			}

			// Decide approximation by view: exact for timeGrid, approximate otherwise
			const isTimeGrid = (currentView || "").toLowerCase().includes("timegrid");
			const approximate = !isTimeGrid;

			// Stash previous context
			const prevStartStr = info?.oldEvent?.startStr || event.startStr || "";
			const prevDate = prevStartStr?.split("T")[0] || "";
			const prevTime = (prevStartStr?.split("T")[1] || "00:00").slice(
				0,
				TIME_FIELD_LENGTH
			);

			// Mark local drag to suppress WS thrash
			try {
				(
					globalThis as unknown as {
						__calendarLocalMoves?: Map<string, number>;
					}
				).__calendarLocalMoves =
					((
						globalThis as unknown as {
							__calendarLocalMoves?: Map<string, number>;
						}
					).__calendarLocalMoves as Map<string, number>) ||
					new Map<string, number>();
				(
					(
						globalThis as unknown as {
							__calendarLocalMoves?: Map<string, number>;
						}
					).__calendarLocalMoves as Map<string, number>
				).set(String(event.id), Date.now());
			} catch {
				// Silently ignore local move marking errors
			}

			// Pre-mark local echo keys before backend call (covers 12/24h variants)
			try {
				const preKeys = generateLocalOpKeys("reservation_updated", {
					id: reservationId ?? event.id,
					wa_id: waId,
					date: newDate,
					time: newTime,
				});
				for (const k of preKeys) {
					this.localEchoManager.markLocalEcho(k);
				}
			} catch {
				// Silently ignore local echo marking errors
			}

			// Backend call via WebSocket (with confirmation). Falls back to HTTP as needed.
			const resp = await this.webSocketService.modifyReservation(
				waId,
				{
					date: newDate,
					time: newTime,
					...(event.title ? { title: event.title } : {}),
					type,
					...(typeof reservationId === "number" ? { reservationId } : {}),
					approximate,
				},
				{ isLocalized: this.isLocalized }
			);

			if (!resp?.success) {
				// Revert UI move
				if (info?.revert) {
					try {
						info.revert();
					} catch {
						// Ignore errors
					}
				}
				// Show error toast
				toastService.reservationModificationFailed({
					customer: event.title || "",
					wa_id: String(waId),
					date: String(newDate),
					time: newTime,
					isLocalized: this.isLocalized,
					error: String(resp?.message || resp?.error || "Operation failed"),
				});
				return;
			}

			// Success: update React state
			try {
				const payload: {
					id: string;
					title?: string;
					start?: string;
					end?: string;
					extendedProps?: Record<string, unknown>;
				} = {
					id: String(event.id),
					start: `${newDate}T${newTime}:00`,
					...(event.endStr ? { end: event.endStr } : {}),
					extendedProps: {
						...(event.extendedProps || {}),
						slotDate: newDate,
						slotTime: newTime,
						cancelled: false,
					},
				};
				if (typeof event.title === "string") {
					payload.title = event.title;
				}
				updateEvent(String(event.id), payload);

				// Emit a local success toast now that the server confirmed
				try {
					toastService.reservationModified({
						customer: event.title || "",
						wa_id: String(waId),
						date: String(newDate),
						time: newTime,
						isLocalized: this.isLocalized,
					});
				} catch {
					// Ignore toast errors
				}
			} catch {
				// Ignore errors
			}

			// Normalize UI event to slot base and ensure metadata stays consistent
			try {
				const evObj = this.calendarApi.getEventById?.(String(event.id));
				if (evObj) {
					// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Setting multiple extended properties
					this.localEchoManager.withSuppressedEventChange(() => {
						// Ensure metadata present
						try {
							evObj.setExtendedProp?.("slotDate", String(newDate));
						} catch {
							// Ignore errors
						}
						try {
							evObj.setExtendedProp?.("slotTime", newTime);
						} catch {
							// Ignore errors
						}
						try {
							evObj.setExtendedProp?.("cancelled", false);
						} catch {
							// Ignore errors
						}
						// Persist reservationId for future drags
						try {
							const rid =
								typeof reservationId === "number"
									? reservationId
									: (() => {
											const n = Number(event.id);
											return Number.isFinite(n) ? (n as number) : undefined;
										})();
							if (typeof rid === "number") {
								evObj.setExtendedProp?.("reservationId", rid);
							}
						} catch {
							// Ignore errors
						}
					});
				}
			} catch {
				// Ignore errors
			}

			// Store context for success toasts routed by WS
			try {
				this.localEchoManager.storeModificationContext(String(event.id), {
					waId,
					prevDate,
					prevTime,
					prevType: info?.oldEvent?.extendedProps?.type ?? type,
					name: event.title,
					newDate,
					newTime,
					newType: type,
				});
			} catch {
				// Ignore errors
			}

			// Reflow previous and target slots using base times
			try {
				const prevBase = this.formatting.normalizeToSlotBase(
					prevDate,
					prevTime
				);
				if (prevDate && prevBase) {
					// strictOnly ensures we only touch events already stamped in that slot
					this.calendarIntegration.reflowSlot(prevDate, prevBase, {
						strictOnly: true,
					} as unknown as never);
				}
			} catch (_e) {
				// Ignore errors during slot reflow
			}
			try {
				if (newDate && newTime) {
					this.calendarIntegration.reflowSlot(String(newDate), newTime);
				}
				// Compute correct offset for the moved event within target slot and apply just to it
				try {
					const apiAny = this.calendarApi as unknown as {
						getEvents?: () => Array<{
							id?: string;
							startStr?: string;
							title?: string;
							extendedProps?: Record<string, unknown>;
						}>;
					};
					const all = apiAny.getEvents?.() || [];
					const toMinutes = (hhmm: string): number => {
						try {
							const [h, m] = String(hhmm || "00:00")
								.slice(0, TIME_FIELD_LENGTH)
								.split(":")
								.map((v) => Number.parseInt(v, 10));
							return (
								(Number.isFinite(h) ? (h as number) : 0) * 60 +
								(Number.isFinite(m) ? (m as number) : 0)
							);
						} catch {
							return 0;
						}
					};
					const base = String(newTime || "00:00").slice(0, TIME_FIELD_LENGTH);
					const baseTotal = toMinutes(base);
					const durationMin = SLOT_WINDOW_DURATION_MINUTES; // 2 hours slot window
					const endTotal = baseTotal + durationMin;
					// Gather target slot events (strict by slot metadata preferred)
					const inSlotRaw: Array<
						{ id: string; title: string; typeNum: number; startStr: string } & {
							_src: unknown;
						}
					> = [];
					for (const e of all) {
						try {
							const ext = (e?.extendedProps || {}) as {
								type?: unknown;
								cancelled?: boolean;
								slotDate?: string;
								slotTime?: string;
							};
							if (ext.cancelled === true) {
								continue;
							}
							const tNum = Number(ext.type ?? 0);
							if (tNum === SKIP_EVENT_TYPE) {
								continue;
							}
							// strict by metadata
							if (ext.slotDate === newDate && ext.slotTime === base) {
								inSlotRaw.push({
									id: String(e.id || ""),
									title: String(e.title || ""),
									typeNum: tNum,
									startStr: String(e.startStr || ""),
									_src: e,
								});
								continue;
							}
							// fallback by time range
							const s = e.startStr || "";
							if (!s?.includes("T")) {
								continue;
							}
							const [d, time] = s.split("T");
							if (d !== newDate) {
								continue;
							}
							const tm = toMinutes(String(time || "00:00"));
							if (tm >= baseTotal && tm < endTotal) {
								inSlotRaw.push({
									id: String(e.id || ""),
									title: String(e.title || ""),
									typeNum: tNum,
									startStr: String(e.startStr || ""),
									_src: e,
								});
							}
						} catch {
							// Ignore errors
						}
					}
					if (inSlotRaw.length > 0) {
						// Sort by type then title
						inSlotRaw.sort((a, b) => {
							if (a.typeNum !== b.typeNum) {
								return a.typeNum - b.typeNum;
							}
							return a.title.localeCompare(b.title);
						});
						const minutesPerReservation =
							inSlotRaw.length >= RESERVATION_DURATION_THRESHOLD
								? SHORT_DURATION_MINUTES
								: LONG_DURATION_MINUTES;
						let offsetMin = 0;
						for (const row of inSlotRaw) {
							if (row.id !== String(event.id)) {
								offsetMin += minutesPerReservation + 1;
								continue;
							}
							// Compute intended start for moved event
							const totalMinutes = baseTotal + Math.floor(offsetMin);
							const h = Math.floor(totalMinutes / 60);
							const m = totalMinutes % 60;
							const movedStartStr =
								String(newDate) +
								"T" +
								String(h).padStart(2, "0") +
								":" +
								String(m).padStart(2, "0") +
								":00";
							// Compute end = start + minutesPerReservation
							const endTotalMin = totalMinutes + minutesPerReservation;
							const eh = Math.floor(endTotalMin / 60);
							const em = endTotalMin % 60;
							const movedEndStr =
								String(newDate) +
								"T" +
								String(eh).padStart(2, "0") +
								":" +
								String(em).padStart(2, "0") +
								":00";
							try {
								// Apply to FC event (timezone-naive strings)
								(
									this.calendarApi.getEventById?.(
										String(event.id)
									) as unknown as {
										setDates?: (s?: unknown, e?: unknown) => void;
									}
								)?.setDates?.(movedStartStr, movedEndStr);
							} catch {
								// Ignore errors
							}
							try {
								// Align React state
								updateEvent(String(event.id), {
									id: String(event.id),
									start: movedStartStr,
									end: movedEndStr,
								});
							} catch {
								// Ignore errors
							}
							break;
						}
					}
				} catch {
					// Ignore errors
				}
				// Deferred reflow to persist ordering after FC replaces events from new props
				setTimeout(() => {
					try {
						this.localEchoManager.withSuppressedEventChange(() => {
							this.calendarIntegration.reflowSlot(String(newDate), newTime);
						});
					} catch (_err) {
						// Ignore deferred reflow errors
					}
				}, 0);
				// Second deferred reflow after next paint to avoid snap-back
				setTimeout(() => {
					try {
						this.localEchoManager.withSuppressedEventChange(() => {
							this.calendarIntegration.reflowSlot(String(newDate), newTime);
						});
					} catch (_err) {
						// Ignore deferred reflow errors
					}
				}, SECOND_REFLOW_DELAY_MS);
			} catch (_e) {
				// Ignore errors during slot reflow
			}

			// Mark extra local echo keys to suppress unread increments on WS echo
			try {
				const keys = generateLocalOpKeys("reservation_updated", {
					id: resp?.id || reservationId || event.id,
					wa_id: waId,
					date: String(newDate),
					time: newTime,
				});
				for (const k of keys) {
					this.localEchoManager.markLocalEcho(k);
				}
			} catch {
				// Ignore errors
			}
		} finally {
			// Always decrement suppression depth when done, even if errors occur
			try {
				const finalDepth =
					(globalThis as { __suppressEventChangeDepth?: number })
						.__suppressEventChangeDepth ?? 0;
				if (finalDepth > 0) {
					(
						globalThis as { __suppressEventChangeDepth?: number }
					).__suppressEventChangeDepth = finalDepth - 1;
				}
			} catch {
				// Ignore errors
			}
		}
	}
}
