import { getSlotTimes, SLOT_DURATION_HOURS } from "@/lib/calendar-config";
import type { CalendarEvent } from "@/types/calendar";
import { to24h } from "./utils";

interface ReservationItem {
	date: string;
	time_slot: string;
	customer_name?: string;
	title?: string;
	[key: string]: unknown;
}

interface ConversationItem {
	customer_name?: string;
	[key: string]: unknown;
}

export interface ReservationProcessingOptions {
	freeRoam: boolean;
	isLocalized: boolean;
	vacationPeriods: Array<{ start: string | Date; end: string | Date }>;
}

export function getReservationEventProcessor() {
	return {
		generateCalendarEvents(
			reservationsByUser: Record<string, ReservationItem[]>,
			conversationsByUser: Record<string, ConversationItem[]>,
			options: ReservationProcessingOptions,
		): CalendarEvent[] {
			if (!reservationsByUser || typeof reservationsByUser !== "object")
				return [];

			const events: CalendarEvent[] = [];

			// Build reservation events grouped by date + normalized slot start time, sequential within slot
			const groupMap: Record<
				string,
				Array<{ waId: string; r: ReservationItem }>
			> = {};
			Object.entries(reservationsByUser).forEach(([waId, list]) => {
				(list || []).forEach((r) => {
					const dateStr = r.date;
					const timeStr = r.time_slot;
					if (!dateStr || !timeStr) return;
					const baseTime = toSlotBase(
						dateStr,
						String(timeStr),
						options.freeRoam,
					);
					const key = `${dateStr}_${baseTime}`;
					if (!groupMap[key]) groupMap[key] = [];
					groupMap[key].push({ waId, r });
				});
			});

			// Sort each group by type then name
			Object.values(groupMap).forEach((arr) => {
				arr.sort((a, b) => {
					const t1 = Number(a.r.type ?? 0);
					const t2 = Number(b.r.type ?? 0);
					if (t1 !== t2) return t1 - t2;
					const n1 = a.r.customer_name || "";
					const n2 = b.r.customer_name || "";
					return n1.localeCompare(n2);
				});
			});

			// Build events within each 2-hour slot with dynamic per-reservation duration

			// Ensure slots are processed in chronological order (by date then slot start time)
			const orderedGroups = Object.entries(groupMap).sort(([ka], [kb]) => {
				const [dateA, timeAraw] = (ka || "_").split("_");
				const [dateB, timeBraw] = (kb || "_").split("_");
				if (dateA !== dateB) return String(dateA).localeCompare(String(dateB));
				const timeA = to24h(String(timeAraw || "00:00"));
				const timeB = to24h(String(timeBraw || "00:00"));
				return timeA.localeCompare(timeB);
			});

			orderedGroups.forEach(([key, arr]) => {
				const [_dateStr, baseTimeRaw] = key.split("_");
				const baseTimeBound = to24h(String(baseTimeRaw || "00:00"));
				let offsetMinutes = 0;
				const minutesPerReservation = arr.length >= 6 ? 15 : 20;
				const gapMinutes = 1; // enforce 1-minute gap between events
				arr.forEach(({ waId, r }) => {
					try {
						const baseDate = String(r.date);
						const baseTime = baseTimeBound;

						// Compute start/end times purely via string arithmetic to avoid timezone shifts
						const startTime = addMinutesToClock(
							baseTime,
							Math.floor(offsetMinutes),
						);
						const endTime = addMinutesToClock(
							baseTime,
							Math.floor(offsetMinutes + minutesPerReservation),
						);
						offsetMinutes += minutesPerReservation + gapMinutes;

						// Determine past-ness using local date-only comparison
						const cancelled = Boolean(r.cancelled);
						const type = Number(r.type ?? 0);

						const isConversation = type === 2;
						const eventData: Record<string, unknown> = {
							id: String(r.id ?? waId),
							title: r.customer_name ?? String(waId),
							// Emit timezone-naive strings; FullCalendar interprets them in configured timeZone
							start: `${baseDate}T${startTime}`,
							end: `${baseDate}T${endTime}`,
							// Allow dragging for reservations even if moved to past; backend will validate
							editable: !isConversation && !cancelled,
							extendedProps: {
								type,
								cancelled,
								waId,
								slotDate: baseDate,
							slotTime: baseTime,
							// Preserve DB reservation id for drag/drop operations
							...(typeof (r as { id?: unknown }).id !== "undefined"
								? {
									reservationId:
										typeof (r as { id?: unknown }).id === "number"
											? ((r as { id?: number }).id as number)
											: (() => {
												const n = Number((r as { id?: unknown }).id);
												return Number.isFinite(n) ? (n as number) : undefined;
											})(),
								}
								: {}),
							},
						};
						if (cancelled) {
							eventData.textColor = "#908584";
						}
						events.push(eventData as unknown as CalendarEvent);
					} catch {
						// skip bad rows
					}
				});
			});

			// Final safety: ensure resulting list is ordered by start time
			events.sort((a, b) => String(a.start).localeCompare(String(b.start)));

			// In freeRoam, add conversation markers as non-editable events using last message timestamp
			if (options.freeRoam && conversationsByUser) {
				Object.entries(conversationsByUser).forEach(([waId, conv]) => {
					if (!Array.isArray(conv) || conv.length === 0) return;
					const last = conv[conv.length - 1];
					if (!last?.date) return;
					const baseDate = String(last.date);
					const baseTime = to24h(
						typeof last.time === "string" ? last.time : "00:00",
					);
					const startTime = `${baseTime}:00`;
					const endTime = addMinutesToClock(baseTime, Math.floor(120 / 6));
					const convArr: ConversationItem[] = Array.isArray(
						conversationsByUser?.[waId],
					)
						? conversationsByUser[waId]
						: [];
					const convNameFromConv = (() => {
						try {
							const found = convArr.find(
								(m: ConversationItem) =>
									typeof m?.customer_name === "string" &&
									m.customer_name.trim(),
							);
							return (found?.customer_name || "").trim();
						} catch {
							return "";
						}
					})();
					const resArr: ReservationItem[] = Array.isArray(
						reservationsByUser?.[waId],
					)
						? reservationsByUser[waId]
						: [];
					const convNameFromRes = (() => {
						try {
							const found = resArr.find(
								(r: ReservationItem) =>
									typeof r?.customer_name === "string" &&
									r.customer_name.trim(),
							);
							return (found?.customer_name || "").trim();
						} catch {
							return "";
						}
					})();
					const displayTitle =
						convNameFromConv || convNameFromRes || String(waId);
					events.push({
						id: String(waId),
						title: displayTitle,
						start: `${baseDate}T${startTime}`,
						end: `${baseDate}T${endTime}`,
						backgroundColor: "#EDAE49",
						borderColor: "#EDAE49",
						editable: false,
						extendedProps: { type: 2, cancelled: false },
					});
				});
			}

			return events;
		},
	};
}

// Add minutes to an HH:MM clock string and return HH:MM:SS (no timezone)
function addMinutesToClock(baseTime: string, minutesToAdd: number): string {
	try {
		const parts = baseTime.split(":");
		const h = parts[0] ? Number.parseInt(parts[0], 10) : 0;
		const m = parts[1] ? Number.parseInt(parts[1], 10) : 0;
		let total =
			(Number.isFinite(h) ? h : 0) * 60 +
			(Number.isFinite(m) ? m : 0) +
			minutesToAdd;
		// Clamp within the day
		if (total < 0) total = 0;
		if (total > 24 * 60 - 1) total = 24 * 60 - 1;
		const hh = String(Math.floor(total / 60)).padStart(2, "0");
		const mm = String(total % 60).padStart(2, "0");
		return `${hh}:${mm}:00`;
	} catch {
		return `${baseTime}:00`;
	}
}

// Normalize a time to the start of its 2-hour slot window for the given date
function toSlotBase(
	dateStr: string,
	timeStr: string,
	freeRoam: boolean,
): string {
	try {
		const baseTime = to24h(String(timeStr || "00:00"));
		const timeParts = baseTime.split(":");
		const hh = timeParts[0] ? Number.parseInt(timeParts[0], 10) : 0;
		const mm = timeParts[1] ? Number.parseInt(timeParts[1], 10) : 0;
		const minutes =
			(Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
		const day = new Date(`${dateStr}T00:00:00`);
		const { slotMinTime } = getSlotTimes(day, freeRoam, "");
		const slotParts = String(slotMinTime || "00:00:00")
			.slice(0, 5)
			.split(":");
		const sH = slotParts[0] ? Number.parseInt(slotParts[0], 10) : 0;
		const sM = slotParts[1] ? Number.parseInt(slotParts[1], 10) : 0;
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
