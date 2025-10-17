import { sortReservationGroupByTypeThenNameInPlace } from "@processes/calendar/calendar-sorting.process";
import {
	getSlotTimes,
	SLOT_DURATION_HOURS,
} from "@shared/libs/calendar/calendar-config";
import { to24h } from "@shared/libs/utils";
import type { CalendarEvent } from "@/entities/event";

// Constants for reservation timing
const MIN_RESERVATIONS_FOR_SHORT_DURATION = 6;
const MINUTES_PER_RESERVATION_SHORT = 15;
const MINUTES_PER_RESERVATION_LONG = 20;
const GAP_MINUTES = 1;
const CONVERSATION_EVENT_TYPE = 2;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * 60;
const CONVERSATION_DURATION_MINUTES = 20;
const TIME_DISPLAY_START_INDEX = 0;
const TIME_DISPLAY_END_INDEX = 5;

type ReservationItem = {
	date: string;
	time_slot: string;
	customer_name?: string;
	title?: string;
	[key: string]: unknown;
};

type ConversationItem = {
	customer_name?: string;
	[key: string]: unknown;
};

export type ReservationProcessingOptions = {
	freeRoam: boolean;
	isLocalized: boolean;
	vacationPeriods: Array<{ start: string | Date; end: string | Date }>;
};

export function getReservationEventProcessor() {
	return {
		generateCalendarEvents(
			reservationsByUser: Record<string, ReservationItem[]>,
			conversationsByUser: Record<string, ConversationItem[]>,
			options: ReservationProcessingOptions
		): CalendarEvent[] {
			if (!reservationsByUser || typeof reservationsByUser !== "object") {
				return [];
			}

			const events: CalendarEvent[] = [];
			const groupMap = buildReservationGroups(reservationsByUser, options);
			processReservationGroups(groupMap, events);
			events.sort((a, b) => String(a.start).localeCompare(String(b.start)));

			if (options.freeRoam && conversationsByUser) {
				addConversationEvents(events, conversationsByUser, reservationsByUser);
			}

			return events;
		},
	};
}

function buildReservationGroups(
	reservationsByUser: Record<string, ReservationItem[]>,
	options: ReservationProcessingOptions
): Record<string, Array<{ waId: string; r: ReservationItem }>> {
	const groupMap: Record<
		string,
		Array<{ waId: string; r: ReservationItem }>
	> = {};
	for (const [waId, list] of Object.entries(reservationsByUser)) {
		for (const r of list || []) {
			const dateStr = r.date;
			const timeStr = r.time_slot;
			if (!(dateStr && timeStr)) {
				continue;
			}
			const baseTime = toSlotBase(dateStr, String(timeStr), options.freeRoam);
			const key = `${dateStr}_${baseTime}`;
			if (!groupMap[key]) {
				groupMap[key] = [];
			}
			(groupMap[key] as Array<{ waId: string; r: ReservationItem }>).push({
				waId,
				r,
			});
		}
	}

	for (const arr of Object.values(groupMap)) {
		sortReservationGroupByTypeThenNameInPlace(
			arr as Array<{
				r: { type?: unknown; customer_name?: string; title?: string };
			}>
		);
	}

	return groupMap;
}

function processReservationGroups(
	groupMap: Record<string, Array<{ waId: string; r: ReservationItem }>>,
	events: CalendarEvent[]
): void {
	const orderedGroups = Object.entries(groupMap).sort(([ka], [kb]) => {
		const [dateA, timeAraw] = (ka || "_").split("_");
		const [dateB, timeBraw] = (kb || "_").split("_");
		if (dateA !== dateB) {
			return String(dateA).localeCompare(String(dateB));
		}
		const timeA = to24h(String(timeAraw || "00:00"));
		const timeB = to24h(String(timeBraw || "00:00"));
		return timeA.localeCompare(timeB);
	});

	for (const [key, arr] of orderedGroups) {
		const [_dateStr, baseTimeRaw] = key.split("_");
		const baseTimeBound = to24h(String(baseTimeRaw || "00:00"));
		const minutesPerReservation =
			arr.length >= MIN_RESERVATIONS_FOR_SHORT_DURATION
				? MINUTES_PER_RESERVATION_SHORT
				: MINUTES_PER_RESERVATION_LONG;
		processReservationGroup(arr, baseTimeBound, events, minutesPerReservation);
	}
}

function processReservationGroup(
	arr: Array<{ waId: string; r: ReservationItem }>,
	baseTimeBound: string,
	events: CalendarEvent[],
	minutesPerReservation: number
): void {
	let offsetMinutes = 0;
	for (const { waId, r } of arr) {
		try {
			const baseDate = String(r.date);
			const startTime = addMinutesToClock(
				baseTimeBound,
				Math.floor(offsetMinutes)
			);
			const endTime = addMinutesToClock(
				baseTimeBound,
				Math.floor(offsetMinutes + minutesPerReservation)
			);
			offsetMinutes += minutesPerReservation + GAP_MINUTES;

			const cancelled = Boolean(r.cancelled);
			const type = Number(r.type ?? 0);
			const isConversation = type === CONVERSATION_EVENT_TYPE;
			const eventData: Record<string, unknown> = {
				id: String(r.id ?? waId),
				title: r.customer_name ?? String(waId),
				start: `${baseDate}T${startTime}`,
				end: `${baseDate}T${endTime}`,
				editable: !(isConversation || cancelled),
				extendedProps: buildExtendedProps({
					r,
					waId,
					type,
					cancelled,
					baseDate,
					baseTime: baseTimeBound,
				}),
			};
			if (cancelled) {
				eventData.textColor = "#908584";
			}
			events.push(eventData as unknown as CalendarEvent);
		} catch {
			// skip bad rows
		}
	}
}

function buildExtendedProps(props: {
	r: ReservationItem;
	waId: string;
	type: number;
	cancelled: boolean;
	baseDate: string;
	baseTime: string;
}): Record<string, unknown> {
	const { r, waId, type, cancelled, baseDate, baseTime } = props;
	return {
		type,
		cancelled,
		waId,
		slotDate: baseDate,
		slotTime: baseTime,
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
	};
}

function addConversationEvents(
	events: CalendarEvent[],
	conversationsByUser: Record<string, ConversationItem[]>,
	reservationsByUser: Record<string, ReservationItem[]>
): void {
	for (const [waId, conv] of Object.entries(conversationsByUser)) {
		if (!Array.isArray(conv) || conv.length === 0) {
			continue;
		}
		const last = conv.at(-1);
		if (!last?.date) {
			continue;
		}
		const baseDate = String(last.date);
		const baseTime = to24h(typeof last.time === "string" ? last.time : "00:00");
		const startTime = `${baseTime}:00`;
		const endTime = addMinutesToClock(baseTime, CONVERSATION_DURATION_MINUTES);
		const convNameFromConv = extractConversationName(
			conv as ConversationItem[]
		);
		const resArr: ReservationItem[] = Array.isArray(reservationsByUser?.[waId])
			? (reservationsByUser[waId] as ReservationItem[])
			: [];
		const convNameFromRes = extractReservationName(resArr);
		const displayTitle = convNameFromConv || convNameFromRes || String(waId);
		events.push({
			id: String(waId),
			title: displayTitle,
			start: `${baseDate}T${startTime}`,
			end: `${baseDate}T${endTime}`,
			backgroundColor: "#EDAE49",
			borderColor: "#EDAE49",
			editable: false,
			extendedProps: { type: CONVERSATION_EVENT_TYPE, cancelled: false },
		});
	}
}

function extractConversationName(convArr: ConversationItem[]): string {
	try {
		const found = convArr.find(
			(m: ConversationItem) =>
				typeof m?.customer_name === "string" && m.customer_name.trim()
		);
		return (found?.customer_name || "").trim();
	} catch {
		return "";
	}
}

function extractReservationName(resArr: ReservationItem[]): string {
	try {
		const found = resArr.find(
			(r: ReservationItem) =>
				typeof r?.customer_name === "string" && r.customer_name.trim()
		);
		return (found?.customer_name || "").trim();
	} catch {
		return "";
	}
}

// Add minutes to an HH:MM clock string and return HH:MM:SS (no timezone)
function addMinutesToClock(baseTime: string, minutesToAdd: number): string {
	try {
		const parts = baseTime.split(":");
		const h = parts[0] ? Number.parseInt(parts[0], 10) : 0;
		const m = parts[1] ? Number.parseInt(parts[1], 10) : 0;
		let total =
			(Number.isFinite(h) ? h : 0) * MINUTES_PER_HOUR +
			(Number.isFinite(m) ? m : 0) +
			minutesToAdd;
		// Clamp within the day
		if (total < 0) {
			total = 0;
		}
		if (total > MINUTES_PER_DAY - 1) {
			total = MINUTES_PER_DAY - 1;
		}
		const hh = String(Math.floor(total / MINUTES_PER_HOUR)).padStart(2, "0");
		const mm = String(total % MINUTES_PER_HOUR).padStart(2, "0");
		return `${hh}:${mm}:00`;
	} catch {
		return `${baseTime}:00`;
	}
}

// Normalize a time to the start of its 2-hour slot window for the given date
function toSlotBase(
	dateStr: string,
	timeStr: string,
	freeRoam: boolean
): string {
	try {
		const baseTime = to24h(String(timeStr || "00:00"));
		const timeParts = baseTime.split(":");
		const hh = timeParts[0] ? Number.parseInt(timeParts[0], 10) : 0;
		const mm = timeParts[1] ? Number.parseInt(timeParts[1], 10) : 0;
		const minutes =
			(Number.isFinite(hh) ? hh : 0) * MINUTES_PER_HOUR +
			(Number.isFinite(mm) ? mm : 0);
		const day = new Date(`${dateStr}T00:00:00`);
		const { slotMinTime } = getSlotTimes(day, freeRoam, "");
		const slotParts = String(slotMinTime || "00:00:00")
			.slice(TIME_DISPLAY_START_INDEX, TIME_DISPLAY_END_INDEX)
			.split(":");
		const sH = slotParts[0] ? Number.parseInt(slotParts[0], 10) : 0;
		const sM = slotParts[1] ? Number.parseInt(slotParts[1], 10) : 0;
		const minMinutes =
			(Number.isFinite(sH) ? sH : 0) * MINUTES_PER_HOUR +
			(Number.isFinite(sM) ? sM : 0);
		const duration = Math.max(
			60,
			(SLOT_DURATION_HOURS || 2) * MINUTES_PER_HOUR
		);
		const rel = Math.max(0, minutes - minMinutes);
		const slotIndex = Math.floor(rel / duration);
		const baseMinutes = minMinutes + slotIndex * duration;
		const hhOut = String(Math.floor(baseMinutes / MINUTES_PER_HOUR)).padStart(
			2,
			"0"
		);
		const mmOut = String(baseMinutes % MINUTES_PER_HOUR).padStart(2, "0");
		return `${hhOut}:${mmOut}`;
	} catch {
		return to24h(String(timeStr || "00:00"));
	}
}
