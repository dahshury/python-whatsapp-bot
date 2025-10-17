import type {
	DashboardData,
	PrometheusMetrics,
} from "@features/dashboard/types";
import {
	extractRole,
	getMonthDisplayName,
	getMonthKey,
	getReservationType,
	getWeekdayName,
	parseModificationDate,
	parseMonthFromKey,
} from "@shared/libs/dashboard/data-aggregation-helpers";
import type { ConversationMessage as CalendarConversationMessage } from "@/entities/conversation";
import type { Reservation as CalendarReservation } from "@/entities/event";

export type ConversationMessage = CalendarConversationMessage & {
	ts?: string;
	text?: string;
	datetime?: string;
	sender?: string;
	author?: string;
};

export type Reservation = CalendarReservation & {
	start?: string;
	end?: string;
	updated_at?: string;
	modified_at?: string;
	last_modified?: string;
	modified_on?: string;
	update_ts?: string;
	title?: string;
	cancelled?: boolean;
	history?: Array<{ ts?: string; timestamp?: string }>;
};

// Time constants
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_DAY =
	HOURS_PER_DAY *
	MINUTES_PER_HOUR *
	SECONDS_PER_MINUTE *
	MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_MINUTE =
	MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const PERCENTAGE_MULTIPLIER = 100;
const PERCENTAGE_CAP = 100;
const MAX_RESPONSE_TIME_MINUTES = 60;
const TOP_CUSTOMERS_LIMIT = 100;
const TOP_WORDS_LIMIT = 50;
const FIRST_VISIT_COUNT = 1;
const RETURNING_VISIT_MAX = 5;
const AVG_RETURNING_VISITS = 3;
const AVG_LOYAL_VISITS = 6;
const CANCELLATION_RATE_PERCENTAGE = 100;

// Regex constants for word processing
const WORD_SPACE_REGEX = /\s+/;
const DIGIT_REGEX = /[\d]+/g;
const NON_WORD_ARABIC_REGEX = /[^\w\s\u0600-\u06FF]/g;

const processSingleConversation = (
	messages: ConversationMessage[],
	parseMessageDate: (m: ConversationMessage) => Date | null
): number => {
	const sorted = messages
		.map((m) => ({
			d: parseMessageDate(m),
			role: extractRole(m),
		}))
		.filter((x) => Boolean(x.d))
		.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());

	let responseCount = 0;
	for (let i = 1; i < sorted.length; i++) {
		const prev = sorted[i - 1];
		const curr = sorted[i];
		if (prev && curr) {
			const prevIsCustomer = String(prev.role).toLowerCase() !== "assistant";
			const currIsAssistant = String(curr.role).toLowerCase() === "assistant";
			if (prevIsCustomer && currIsAssistant) {
				const deltaMs = (curr.d as Date).getTime() - (prev.d as Date).getTime();
				if (deltaMs > 0) {
					responseCount += deltaMs / MILLISECONDS_PER_MINUTE;
				}
			}
		}
	}
	return responseCount;
};

const calculateResponseDurations = (
	entries: [string, ConversationMessage[]][],
	parseMessageDate: (m: ConversationMessage) => Date | null
): number[] => {
	const diffs: number[] = [];
	for (const [, msgs] of entries) {
		const msgs_array = Array.isArray(msgs) ? msgs : [];
		if (msgs_array.length > 0) {
			const duration = processSingleConversation(msgs_array, parseMessageDate);
			if (duration > 0) {
				diffs.push(duration);
			}
		}
	}
	return diffs;
};

const countReservationTypes = (
	items: Reservation[]
): { checkup: number; followup: number } => {
	let checkup = 0;
	let followup = 0;
	for (const r of items) {
		if (getReservationType(r) === "followup") {
			followup += 1;
		} else {
			checkup += 1;
		}
	}
	return { checkup, followup };
};

const calculateTypeDistribution = (
	entries: [string, Reservation[]][]
): Array<{ type: number; label: string; count: number }> => {
	let totalCheckup = 0;
	let totalFollowup = 0;
	for (const [, items] of entries) {
		const counts = countReservationTypes(Array.isArray(items) ? items : []);
		totalCheckup += counts.checkup;
		totalFollowup += counts.followup;
	}
	return [
		{ type: 0, label: "Checkup", count: totalCheckup },
		{ type: 1, label: "Followup", count: totalFollowup },
	];
};

const processReservationForTrends = (
	r: Reservation,
	key: string,
	trendMap: Map<
		string,
		{ reservations: number; cancellations: number; modifications: number }
	>
): void => {
	const entry = trendMap.get(key) || {
		reservations: 0,
		cancellations: 0,
		modifications: 0,
	};
	entry.reservations += 1;
	if ((r as Reservation).cancelled === true) {
		entry.cancellations += 1;
	}
	trendMap.set(key, entry);
};

const processModificationForTrends = (
	_ts: Date,
	key: string,
	trendMap: Map<
		string,
		{ reservations: number; cancellations: number; modifications: number }
	>
): void => {
	const entry = trendMap.get(key) || {
		reservations: 0,
		cancellations: 0,
		modifications: 0,
	};
	entry.modifications += 1;
	trendMap.set(key, entry);
};

const processReservationsForDailyTrends = (
	filteredReservationEntries: [string, Reservation[]][],
	parseReservationDate: (r: Reservation) => Date | null,
	dailyMap: Map<
		string,
		{ reservations: number; cancellations: number; modifications: number }
	>
) => {
	for (const [, items] of filteredReservationEntries) {
		for (const r of Array.isArray(items) ? items : []) {
			const d = parseReservationDate(r);
			if (!d) {
				continue;
			}
			const key = d.toISOString().slice(0, 10);
			processReservationForTrends(r, key, dailyMap);
		}
	}
};

const processModificationsForDailyTrends = (
	reservationEntries: [string, Reservation[]][],
	withinRange: (d: Date | null) => boolean,
	dailyMap: Map<
		string,
		{ reservations: number; cancellations: number; modifications: number }
	>
) => {
	for (const [, items] of reservationEntries) {
		for (const r of Array.isArray(items) ? items : []) {
			const ts = parseModificationDate(r);
			if (!(ts && withinRange(ts))) {
				continue;
			}
			const key = ts.toISOString().slice(0, 10);
			processModificationForTrends(ts, key, dailyMap);
		}
	}
};

const calculateDailyTrends = (
	filteredReservationEntries: [string, Reservation[]][],
	reservationEntries: [string, Reservation[]][],
	parseReservationDate: (r: Reservation) => Date | null,
	withinRange: (d: Date | null) => boolean
): Array<{
	date: string;
	reservations: number;
	cancellations: number;
	modifications: number;
}> => {
	const dailyMap = new Map<
		string,
		{ reservations: number; cancellations: number; modifications: number }
	>();

	processReservationsForDailyTrends(
		filteredReservationEntries,
		parseReservationDate,
		dailyMap
	);
	processModificationsForDailyTrends(reservationEntries, withinRange, dailyMap);

	return Array.from(dailyMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, v]) => ({
			date,
			reservations: v.reservations,
			cancellations: v.cancellations,
			modifications: v.modifications,
		}));
};

const processDayOfWeekReservation = (
	r: Reservation,
	day: string,
	dayMap: Map<string, { reservations: number; cancellations: number }>
): void => {
	const entry = dayMap.get(day) || {
		reservations: 0,
		cancellations: 0,
	};
	entry.reservations += 1;
	if ((r as Reservation).cancelled === true) {
		entry.cancellations += 1;
	}
	dayMap.set(day, entry);
};

const getDayOfWeekData = (
	filteredReservationEntries: [string, Reservation[]][],
	parseReservationDate: (r: Reservation) => Date | null
) => {
	const map = new Map<
		string,
		{ reservations: number; cancellations: number }
	>();
	for (const [, items] of filteredReservationEntries) {
		for (const r of Array.isArray(items) ? items : []) {
			const d = parseReservationDate(r);
			if (!d) {
				continue;
			}
			const day = getWeekdayName(d);
			if (!day) {
				continue;
			}
			processDayOfWeekReservation(r, day, map);
		}
	}
	return Array.from(map.entries()).map(([day, v]) => ({
		day,
		reservations: v.reservations,
		cancellations: v.cancellations,
		cancelRate:
			v.reservations > 0
				? (v.cancellations / v.reservations) * CANCELLATION_RATE_PERCENTAGE
				: 0,
	}));
};

const processMonthlyReservation = (
	r: Reservation,
	key: string,
	monthMap: Map<
		string,
		{ reservations: number; cancellations: number; conversations: number }
	>
): void => {
	const entry = monthMap.get(key) || {
		reservations: 0,
		cancellations: 0,
		conversations: 0,
	};
	entry.reservations += 1;
	if ((r as Reservation).cancelled === true) {
		entry.cancellations += 1;
	}
	monthMap.set(key, entry);
};

const processMonthlyConversation = (
	key: string,
	monthMap: Map<
		string,
		{ reservations: number; cancellations: number; conversations: number }
	>
): void => {
	const entry = monthMap.get(key) || {
		reservations: 0,
		cancellations: 0,
		conversations: 0,
	};
	entry.conversations += 1;
	monthMap.set(key, entry);
};

const processReservationsForMonthlyTrends = (
	filteredReservationEntries: [string, Reservation[]][],
	parseReservationDate: (r: Reservation) => Date | null,
	monthMap: Map<
		string,
		{ reservations: number; cancellations: number; conversations: number }
	>
) => {
	for (const [, items] of filteredReservationEntries) {
		for (const r of Array.isArray(items) ? items : []) {
			const d = parseReservationDate(r);
			if (!d) {
				continue;
			}
			const key = getMonthKey(d);
			processMonthlyReservation(r, key, monthMap);
		}
	}
};

const processConversationsForMonthlyTrends = (
	filteredConversationEntries: [string, ConversationMessage[]][],
	parseMessageDate: (m: ConversationMessage) => Date | null,
	monthMap: Map<
		string,
		{ reservations: number; cancellations: number; conversations: number }
	>
) => {
	for (const [, msgs] of filteredConversationEntries) {
		for (const m of Array.isArray(msgs) ? msgs : []) {
			const d = parseMessageDate(m);
			if (!d) {
				continue;
			}
			const key = getMonthKey(d);
			processMonthlyConversation(key, monthMap);
		}
	}
};

const getMonthlyTrends = (
	filteredReservationEntries: [string, Reservation[]][],
	filteredConversationEntries: [string, ConversationMessage[]][],
	parseReservationDate: (r: Reservation) => Date | null,
	parseMessageDate: (m: ConversationMessage) => Date | null
) => {
	const monthMap = new Map<
		string,
		{ reservations: number; cancellations: number; conversations: number }
	>();

	processReservationsForMonthlyTrends(
		filteredReservationEntries,
		parseReservationDate,
		monthMap
	);
	processConversationsForMonthlyTrends(
		filteredConversationEntries,
		parseMessageDate,
		monthMap
	);

	return Array.from(monthMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([key, v]) => {
			const date = parseMonthFromKey(key);
			if (!date) {
				return null;
			}
			const month = getMonthDisplayName(date);
			return {
				month,
				reservations: v.reservations,
				cancellations: v.cancellations,
				conversations: v.conversations,
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
};

const getCustomerSegments = (
	filteredReservationEntries: [string, Reservation[]][],
	uniqueCustomers: number
) => {
	let new1 = 0;
	let returning2to5 = 0;
	let loyal6 = 0;
	for (const [, items] of filteredReservationEntries) {
		const len = Array.isArray(items) ? items.length : 0;
		if (len <= FIRST_VISIT_COUNT) {
			new1 += 1;
		} else if (len <= RETURNING_VISIT_MAX) {
			returning2to5 += 1;
		} else {
			loyal6 += 1;
		}
	}
	return [
		{
			segment: "New (1 visit)",
			count: new1,
			percentage: uniqueCustomers
				? (new1 / uniqueCustomers) * PERCENTAGE_MULTIPLIER
				: 0,
			avgReservations: new1 ? FIRST_VISIT_COUNT : 0,
		},
		{
			segment: "Returning (2-5 visits)",
			count: returning2to5,
			percentage: uniqueCustomers
				? (returning2to5 / uniqueCustomers) * PERCENTAGE_MULTIPLIER
				: 0,
			avgReservations: returning2to5 ? AVG_RETURNING_VISITS : 0,
		},
		{
			segment: "Loyal (6+ visits)",
			count: loyal6,
			percentage: uniqueCustomers
				? (loyal6 / uniqueCustomers) * PERCENTAGE_MULTIPLIER
				: 0,
			avgReservations: loyal6 ? AVG_LOYAL_VISITS : 0,
		},
	];
};

const calculateTimeSlots = (
	entries: [string, Reservation[]][],
	parseReservationDate: (r: Reservation) => Date | null
): Array<{
	slot: string;
	time: string;
	count: number;
	normalized: number;
	type: "regular";
	availDays: number;
}> => {
	const timeSlotMap = new Map<string, number>();
	for (const [, items] of entries) {
		for (const r of Array.isArray(items) ? items : []) {
			const d = parseReservationDate(r);
			if (!d) {
				continue;
			}
			const hh = d.getHours().toString().padStart(2, "0");
			const mm = d.getMinutes().toString().padStart(2, "0");
			const key = `${hh}:${mm}`;
			timeSlotMap.set(key, (timeSlotMap.get(key) || 0) + 1);
		}
	}
	return Array.from(timeSlotMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([time, count]) => ({
			slot: time,
			time,
			count,
			normalized: count,
			type: "regular" as const,
			availDays: 0,
		}));
};

const getMessageHeatmap = (
	filteredConversationEntries: [string, ConversationMessage[]][],
	parseMessageDate: (m: ConversationMessage) => Date | null
) => {
	const heatmapMap = new Map<string, number>();
	for (const [, msgs] of filteredConversationEntries) {
		for (const m of Array.isArray(msgs) ? msgs : []) {
			const d = parseMessageDate(m);
			if (!d) {
				continue;
			}
			const day = getWeekdayName(d);
			if (!day) {
				continue;
			}
			const key = `${day}_${d.getHours()}`;
			heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
		}
	}
	return Array.from(heatmapMap.entries())
		.map(([k, count]) => {
			const parts = k.split("_");
			if (parts.length !== 2) {
				return null;
			}
			const [weekday, hourStr] = parts;
			const hour = Number(hourStr);
			if (!weekday || Number.isNaN(hour)) {
				return null;
			}
			return { weekday, hour, count };
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
};

const getWordFrequency = (
	filteredConversationEntries: [string, ConversationMessage[]][]
) => {
	const words: Record<string, number> = {};
	for (const [, msgs] of filteredConversationEntries) {
		for (const m of Array.isArray(msgs) ? msgs : []) {
			const text = (
				(m as ConversationMessage).text ||
				(m as ConversationMessage).message ||
				""
			)
				.toString()
				.toLowerCase();
			const tokens = text
				.toLowerCase()
				.replace(DIGIT_REGEX, " ")
				.replace(NON_WORD_ARABIC_REGEX, " ")
				.split(WORD_SPACE_REGEX)
				.filter((w: string) => w.length > 2);
			for (const t of tokens) {
				words[t] = (words[t] || 0) + 1;
			}
		}
	}
	return Object.entries(words)
		.map(([word, count]) => ({ word, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, TOP_WORDS_LIMIT);
};

const getTopCustomers = (
	data: {
		conversations: Record<string, ConversationMessage[]>;
		reservations: Record<string, Reservation[]>;
		filteredConversationEntries: [string, ConversationMessage[]][];
		filteredReservationEntries: [string, Reservation[]][];
	},
	parsers: {
		parseMessageDate: (m: ConversationMessage) => Date | null;
		parseReservationDate: (r: Reservation) => Date | null;
	}
) => {
	const map = new Map<
		string,
		{ messageCount: number; reservationCount: number; lastActivity: string }
	>();
	const uniqueCustomerIds = new Set<string>([
		...Object.keys(data.reservations ?? {}),
		...Object.keys(data.conversations ?? {}),
	]);
	for (const id of uniqueCustomerIds) {
		const msgs = (data.filteredConversationEntries.find(
			([k]) => k === id
		)?.[1] ?? []) as ConversationMessage[];
		const resv = (data.filteredReservationEntries.find(
			([k]) => k === id
		)?.[1] ?? []) as Reservation[];
		const lastMsg = msgs
			.map((m) => parsers.parseMessageDate(m))
			.filter(Boolean)
			.sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
			| Date
			| undefined;
		const lastRes = resv
			.map((r) => parsers.parseReservationDate(r))
			.filter(Boolean)
			.sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
			| Date
			| undefined;
		const getLatestDate = (msg?: Date, res?: Date): Date | undefined => {
			if (msg && res) {
				return msg.getTime() > res.getTime() ? msg : res;
			}
			return msg || res;
		};
		const last = getLatestDate(lastMsg, lastRes);
		map.set(id, {
			messageCount: Array.isArray(msgs) ? msgs.length : 0,
			reservationCount: Array.isArray(resv) ? resv.length : 0,
			lastActivity: last
				? last.toISOString().slice(0, 10)
				: new Date(0).toISOString().slice(0, 10),
		});
	}
	return Array.from(map.entries())
		.map(([wa_id, v]) => ({ wa_id, ...v }))
		.sort((a, b) => b.messageCount - a.messageCount)
		.slice(0, TOP_CUSTOMERS_LIMIT);
};

const computeTrendMetric = (
	current: number,
	previous: number,
	higherIsBetter = true
) => {
	if (previous === 0) {
		const percentChange = current > 0 ? PERCENTAGE_MULTIPLIER : 0;
		const isPositive = higherIsBetter ? current > 0 : current === 0;
		return { percentChange, isPositive };
	}
	const raw =
		((current - previous) / Math.abs(previous)) * PERCENTAGE_MULTIPLIER;
	const isPositive = higherIsBetter ? raw >= 0 : raw <= 0;
	return { percentChange: raw, isPositive };
};

const buildDateParsers = (activeRange?: {
	fromDate?: string;
	toDate?: string;
}) => {
	const parseISO = (value?: string | null) => {
		if (!value) {
			return null;
		}
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	};

	const createDateAtMidnight = (d: Date) =>
		new Date(d.getFullYear(), d.getMonth(), d.getDate());

	const createDateAtEndOfDay = (d: Date) =>
		new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		);

	const parseReservationDate = (r: Reservation): Date | null => {
		const iso = parseISO(r?.start);
		if (iso) {
			return iso;
		}
		const date: string | undefined = (r as Reservation & { date?: string })
			?.date;
		const time: string | undefined =
			(r as Reservation & { time_slot?: string; time?: string })?.time_slot ||
			(r as Reservation & { time_slot?: string; time?: string })?.time;
		if (date && time) {
			return parseISO(`${date}T${time}`);
		}
		if (date) {
			return parseISO(`${date}T00:00:00`);
		}
		return null;
	};

	const parseMessageDate = (m: ConversationMessage): Date | null => {
		const iso = parseISO(
			m?.ts || (m as ConversationMessage & { datetime?: string })?.datetime
		);
		if (iso) {
			return iso;
		}
		const date: string | undefined = (
			m as ConversationMessage & { date?: string }
		)?.date;
		const time: string | undefined = (
			m as ConversationMessage & { time?: string }
		)?.time;
		if (date && time) {
			return parseISO(`${date}T${time}`);
		}
		if (date) {
			return parseISO(`${date}T00:00:00`);
		}
		return null;
	};

	const isDateAfterStart = (d: Date, from: Date | null): boolean => {
		if (!from) {
			return true;
		}
		const f = createDateAtMidnight(from);
		return d >= f;
	};

	const isDateBeforeEnd = (d: Date, to: Date | null): boolean => {
		if (!to) {
			return true;
		}
		const t = createDateAtEndOfDay(to);
		return d <= t;
	};

	const withinRange = (d: Date | null) => {
		if (!d) {
			return false;
		}
		const from = activeRange?.fromDate ? new Date(activeRange.fromDate) : null;
		const to = activeRange?.toDate ? new Date(activeRange.toDate) : null;
		return isDateAfterStart(d, from) && isDateBeforeEnd(d, to);
	};

	const calculateRangeDays = (from: Date, to: Date): number => {
		const endOfCurrentRange = createDateAtEndOfDay(to).getTime();
		const startOfCurrentRange = createDateAtMidnight(from).getTime();
		return (
			Math.max(
				1,
				Math.floor(
					(endOfCurrentRange - startOfCurrentRange) / MILLISECONDS_PER_DAY
				)
			) + 1
		);
	};

	const createPreviousDateRange = (
		from: Date,
		days: number
	): { prevFrom: Date; prevTo: Date } => {
		const prevTo = new Date(
			from.getFullYear(),
			from.getMonth(),
			from.getDate() - 1
		);
		const prevFrom = new Date(
			prevTo.getFullYear(),
			prevTo.getMonth(),
			prevTo.getDate() - (days - 1)
		);
		return { prevFrom, prevTo };
	};

	const getPreviousRange = () => {
		const fromStr = activeRange?.fromDate;
		const toStr = activeRange?.toDate;
		if (!(fromStr && toStr)) {
			return null;
		}
		const from = new Date(fromStr);
		const to = new Date(toStr);
		const days = calculateRangeDays(from, to);
		return createPreviousDateRange(from, days);
	};

	const prevRange = getPreviousRange();
	const withinPrevRange = (d: Date | null) => {
		if (!(d && prevRange)) {
			return false;
		}
		const { prevFrom, prevTo } = prevRange;
		const f = new Date(
			prevFrom.getFullYear(),
			prevFrom.getMonth(),
			prevFrom.getDate()
		);
		const t = new Date(
			prevTo.getFullYear(),
			prevTo.getMonth(),
			prevTo.getDate(),
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		);
		return d >= f && d <= t;
	};

	return {
		parseReservationDate,
		parseMessageDate,
		withinRange,
		withinPrevRange,
	};
};

const filterEntriesByDateRange = (
	entries: [string, unknown[]][],
	dateGetter: (item: unknown) => Date | null,
	withinRangeCheck: (d: Date | null) => boolean
) =>
	entries.map(([id, items]) => [
		id,
		(Array.isArray(items) ? items : []).filter((item) =>
			withinRangeCheck(dateGetter(item))
		),
	]) as [string, unknown[]][];

const computeConversionMetrics = (
	chattedIds: Set<string>,
	reservedIds: Set<string>
) => {
	const denominator = chattedIds.size;
	let numerator = 0;
	for (const id of chattedIds) {
		if (reservedIds.has(id)) {
			numerator += 1;
		}
	}
	return {
		conversionDenominator: denominator,
		conversionNumerator: numerator,
		rate:
			denominator > 0
				? Math.min(
						PERCENTAGE_CAP,
						(numerator / denominator) * PERCENTAGE_MULTIPLIER
					)
				: 0,
	};
};

const computeAverageFollowups = (
	reservationEntries: [string, Reservation[]][]
) => {
	const returningCounts = reservationEntries
		.map(([, items]) => (Array.isArray(items) ? items.length : 0))
		.filter((len) => len > 1)
		.map((len) => len - 1);
	if (returningCounts.length === 0) {
		return 0;
	}
	const total = returningCounts.reduce((a, b) => a + b, 0);
	return total / returningCounts.length;
};

// Helper to compute current and previous period metrics
function computePeriodMetrics(
	entries: [string, unknown[]][],
	parseDate: (item: unknown) => Date | null,
	withinRange: (d: Date | null) => boolean,
	withinPrevRange: (d: Date | null) => boolean
): { current: number; previous: number } {
	const parseAndFilter = (filterFn: (d: Date | null) => boolean) =>
		entries.reduce(
			(sum, [, items]) =>
				sum +
				(Array.isArray(items)
					? items.filter((item) => filterFn(parseDate(item))).length
					: 0),
			0
		);
	return {
		current: parseAndFilter(withinRange),
		previous: parseAndFilter(withinPrevRange),
	};
}

// Helper to calculate active upcoming customers
function buildActiveUpcomingCustomerIds(
	reservationEntries: [string, Reservation[]][],
	parseReservationDate: (r: Reservation) => Date | undefined
): Set<string> {
	const activeUpcomingCustomerIds = new Set<string>();
	const now = new Date();
	for (const [id, items] of reservationEntries) {
		const hasUpcoming = (Array.isArray(items) ? items : []).some((r) => {
			const d = parseReservationDate(r);
			return d && d > now && (r as Reservation).cancelled !== true;
		});
		if (hasUpcoming) {
			activeUpcomingCustomerIds.add(id);
		}
	}
	return activeUpcomingCustomerIds;
}

// Helper to filter entries and return relevant sets for conversion metrics
function buildCustomerIdSets(
	entries: [string, ConversationMessage[] | Reservation[]][],
	_isReservation: boolean
): Set<string> {
	return new Set<string>(
		entries
			.filter(([, items]) => (Array.isArray(items) ? items.length : 0) > 0)
			.map(([id]) => id)
	);
}

type FilteredData = {
	filteredReservationEntries: [string, Reservation[]][];
	filteredConversationEntries: [string, ConversationMessage[]][];
	prevReservationEntries: [string, Reservation[]][];
	prevConversationEntries: [string, ConversationMessage[]][];
	reservationEntries: [string, Reservation[]][];
	conversationEntries: [string, ConversationMessage[]][];
};

type DateParsers = ReturnType<typeof buildDateParsers>;

function buildFilteredData(
	conversations: Record<string, ConversationMessage[]>,
	reservations: Record<string, Reservation[]>,
	dateParsers: DateParsers
): FilteredData {
	const reservationEntries = Object.entries(reservations ?? {});
	const conversationEntries = Object.entries(conversations ?? {});
	const {
		parseReservationDate,
		parseMessageDate,
		withinRange,
		withinPrevRange,
	} = dateParsers;

	return {
		filteredReservationEntries: filterEntriesByDateRange(
			reservationEntries,
			parseReservationDate as (item: unknown) => Date | null,
			withinRange
		) as [string, Reservation[]][],
		filteredConversationEntries: filterEntriesByDateRange(
			conversationEntries,
			parseMessageDate as (item: unknown) => Date | null,
			withinRange
		) as [string, ConversationMessage[]][],
		prevReservationEntries: filterEntriesByDateRange(
			reservationEntries,
			parseReservationDate as (item: unknown) => Date | null,
			withinPrevRange
		) as [string, Reservation[]][],
		prevConversationEntries: filterEntriesByDateRange(
			conversationEntries,
			parseMessageDate as (item: unknown) => Date | null,
			withinPrevRange
		) as [string, ConversationMessage[]][],
		reservationEntries,
		conversationEntries,
	};
}

type MetricsPhaseResult = {
	totalReservations: number;
	prevTotalReservations: number;
	totalMessages: number;
	returningCustomers: number;
	uniqueCustomers: number;
	prevUniqueCustomers: number;
	conversionRate: number;
	prevConversionRate: number;
	avgFollowups: number;
	prevAvgFollowups: number;
	totalCancellations: number;
	prevTotalCancellations: number;
	activeUpcomingCustomerIds: Set<string>;
};

function computeMetricsPhase(
	filtered: FilteredData,
	dateParsers: DateParsers
): MetricsPhaseResult {
	const { parseReservationDate, withinRange, withinPrevRange } = dateParsers;

	const { current: totalReservations, previous: prevTotalReservations } =
		computePeriodMetrics(
			filtered.filteredReservationEntries,
			parseReservationDate as (item: unknown) => Date | null,
			withinRange,
			withinPrevRange
		);

	const totalMessages = filtered.filteredConversationEntries.reduce(
		(sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.length : 0),
		0
	);

	const returningCustomers = filtered.filteredReservationEntries.reduce(
		(count, [, items]) =>
			count + (Array.isArray(items) && items.length > 1 ? 1 : 0),
		0
	);

	// Calculate unique customers
	const firstReservationDateByCustomer = new Map<string, Date | null>();
	for (const [id, items] of filtered.reservationEntries) {
		const first = (Array.isArray(items) ? items : [])
			.map((r) => parseReservationDate(r))
			.filter(Boolean)
			.sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] as
			| Date
			| undefined;
		firstReservationDateByCustomer.set(id, first ?? null);
	}
	const uniqueCustomers = Array.from(
		firstReservationDateByCustomer.entries()
	).reduce((count, [, d]) => count + (withinRange(d) ? 1 : 0), 0);
	const prevUniqueCustomers = Array.from(
		firstReservationDateByCustomer.entries()
	).reduce((count, [, d]) => count + (withinPrevRange(d) ? 1 : 0), 0);

	// Build id sets for conversion metrics
	const chattedIdsPeriod = buildCustomerIdSets(
		filtered.filteredConversationEntries,
		false
	);
	const reservedIdsPeriod = buildCustomerIdSets(
		filtered.filteredReservationEntries,
		true
	);

	const { rate: conversionRate } = computeConversionMetrics(
		chattedIdsPeriod,
		reservedIdsPeriod
	);

	const avgFollowups = computeAverageFollowups(
		filtered.filteredReservationEntries
	);
	const prevAvgFollowups = computeAverageFollowups(
		filtered.prevReservationEntries
	);

	const prevChattedIds = buildCustomerIdSets(
		filtered.prevConversationEntries,
		false
	);
	const prevReservedIds = buildCustomerIdSets(
		filtered.prevReservationEntries,
		true
	);

	const { rate: prevConversionRate } = computeConversionMetrics(
		prevChattedIds,
		prevReservedIds
	);

	// Calculate cancellations
	const totalCancellations = filtered.filteredReservationEntries.reduce(
		(sum, [, items]) =>
			sum +
			(Array.isArray(items)
				? items.filter((r) => (r as Reservation).cancelled === true).length
				: 0),
		0
	);
	const prevTotalCancellations = filtered.prevReservationEntries.reduce(
		(sum, [, items]) =>
			sum +
			(Array.isArray(items)
				? items.filter((r) => (r as Reservation).cancelled === true).length
				: 0),
		0
	);

	// Calculate active upcoming customers
	const activeUpcomingCustomerIds = buildActiveUpcomingCustomerIds(
		filtered.reservationEntries,
		parseReservationDate as (r: Reservation) => Date | undefined
	);

	return {
		totalReservations,
		prevTotalReservations,
		totalMessages,
		returningCustomers,
		uniqueCustomers,
		prevUniqueCustomers,
		conversionRate,
		prevConversionRate,
		avgFollowups,
		prevAvgFollowups,
		totalCancellations,
		prevTotalCancellations,
		activeUpcomingCustomerIds,
	};
}

type ResponseMetricsResult = {
	avgResponseTime: number;
	prevAvgResponseTime: number;
};

function computeResponseMetrics(
	filtered: FilteredData,
	dateParsers: DateParsers
): ResponseMetricsResult {
	const { parseMessageDate } = dateParsers;

	// Calculate response times
	const responseDurationsMinutes: number[] = calculateResponseDurations(
		filtered.filteredConversationEntries,
		parseMessageDate
	);
	const prevResponseDurationsMinutes: number[] = calculateResponseDurations(
		filtered.prevConversationEntries,
		parseMessageDate
	);

	const avg = (arr: number[]) =>
		arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

	return {
		avgResponseTime: Math.min(
			MAX_RESPONSE_TIME_MINUTES,
			avg(responseDurationsMinutes)
		),
		prevAvgResponseTime: Math.min(
			MAX_RESPONSE_TIME_MINUTES,
			avg(prevResponseDurationsMinutes)
		),
	};
}

function computeDashboardStats(
	metrics: ReturnType<typeof computeMetricsPhase>,
	responseMetrics: ReturnType<typeof computeResponseMetrics>
) {
	const returningRate =
		metrics.uniqueCustomers > 0
			? (metrics.returningCustomers / metrics.uniqueCustomers) *
				PERCENTAGE_MULTIPLIER
			: 0;

	const avgResponseTime = Number.isFinite(responseMetrics.avgResponseTime)
		? responseMetrics.avgResponseTime
		: 0;

	return {
		totalReservations: metrics.totalReservations,
		totalCancellations: metrics.totalCancellations,
		uniqueCustomers: metrics.uniqueCustomers,
		conversionRate: metrics.conversionRate,
		returningCustomers: metrics.returningCustomers,
		returningRate,
		avgFollowups: metrics.avgFollowups,
		avgResponseTime,
		activeCustomers: metrics.activeUpcomingCustomerIds.size,
		trends: {
			totalReservations: computeTrendMetric(
				metrics.totalReservations,
				metrics.prevTotalReservations,
				true
			),
			cancellations: computeTrendMetric(
				metrics.totalCancellations,
				metrics.prevTotalCancellations,
				false
			),
			avgResponseTime: computeTrendMetric(
				responseMetrics.avgResponseTime,
				responseMetrics.prevAvgResponseTime,
				false
			),
			avgFollowups: computeTrendMetric(
				metrics.avgFollowups,
				metrics.prevAvgFollowups,
				true
			),
			uniqueCustomers: computeTrendMetric(
				metrics.uniqueCustomers,
				metrics.prevUniqueCustomers,
				true
			),
			conversionRate: computeTrendMetric(
				metrics.conversionRate,
				metrics.prevConversionRate,
				true
			),
		},
	};
}

function extractPrometheusMetrics(prom: Record<string, unknown>) {
	const result: Record<string, number> = {};

	// Helper to safely add metrics
	const addMetric = (
		promKey: string,
		resultKey: string,
		typeCheck?: (val: unknown) => boolean
	) => {
		const check = typeCheck || ((val) => typeof val === "number");
		if (check(prom[promKey])) {
			result[resultKey] = prom[promKey] as number;
		}
	};

	addMetric("process_cpu_percent", "cpu_percent");
	addMetric("cpu_percent", "cpu_percent");
	addMetric("process_memory_bytes", "memory_bytes");
	addMetric("memory_bytes", "memory_bytes");
	addMetric("reservations_requested_total", "reservations_requested_total");
	addMetric("reservations_successful_total", "reservations_successful_total");
	addMetric("reservations_failed_total", "reservations_failed_total");
	addMetric(
		"reservations_cancellation_requested_total",
		"reservations_cancellation_requested_total"
	);
	addMetric(
		"reservations_cancellation_successful_total",
		"reservations_cancellation_successful_total"
	);
	addMetric(
		"reservations_cancellation_failed_total",
		"reservations_cancellation_failed_total"
	);
	addMetric(
		"reservations_modification_requested_total",
		"reservations_modification_requested_total"
	);
	addMetric(
		"reservations_modification_successful_total",
		"reservations_modification_successful_total"
	);
	addMetric(
		"reservations_modification_failed_total",
		"reservations_modification_failed_total"
	);
	addMetric("unread_messages", "unread_messages");
	addMetric("error_rate", "error_rate");

	return result;
}

export function computeFullDashboardData(
	conversations: Record<string, ConversationMessage[]>,
	reservations: Record<string, Reservation[]>,
	activeRange?: { fromDate?: string; toDate?: string },
	prometheusMetrics?: PrometheusMetrics
): DashboardData {
	const dateParsers = buildDateParsers(activeRange);
	const filtered = buildFilteredData(conversations, reservations, dateParsers);
	const metrics = computeMetricsPhase(filtered, dateParsers);
	const responseMetrics = computeResponseMetrics(filtered, dateParsers);

	const stats = computeDashboardStats(metrics, responseMetrics);
	const prom = extractPrometheusMetrics(prometheusMetrics || {});

	return {
		_isMockData: false,
		stats,
		prometheusMetrics: prom,
		dailyTrends: calculateDailyTrends(
			filtered.filteredReservationEntries,
			filtered.reservationEntries,
			dateParsers.parseReservationDate,
			dateParsers.withinRange
		),
		typeDistribution: calculateTypeDistribution(
			filtered.filteredReservationEntries
		),
		timeSlots: calculateTimeSlots(
			filtered.filteredReservationEntries,
			dateParsers.parseReservationDate
		),
		messageHeatmap: getMessageHeatmap(
			filtered.filteredConversationEntries,
			dateParsers.parseMessageDate
		),
		topCustomers: getTopCustomers(
			{
				conversations,
				reservations,
				filteredConversationEntries: filtered.filteredConversationEntries,
				filteredReservationEntries: filtered.filteredReservationEntries,
			},
			{
				parseMessageDate: dateParsers.parseMessageDate,
				parseReservationDate: dateParsers.parseReservationDate,
			}
		),
		conversationAnalysis: {
			avgMessageLength:
				metrics.totalMessages > 0
					? filtered.filteredConversationEntries.reduce(
							(sum, [, msgs]) =>
								sum +
								(Array.isArray(msgs)
									? msgs.reduce(
											(s, m) =>
												s +
												(
													(m as ConversationMessage).text ||
													(m as ConversationMessage).message ||
													""
												).toString().length,
											0
										)
									: 0),
							0
						) / metrics.totalMessages
					: 0,
			avgWordsPerMessage:
				metrics.totalMessages > 0
					? filtered.filteredConversationEntries.reduce(
							(sum, [, msgs]) =>
								sum +
								(Array.isArray(msgs)
									? msgs.reduce(
											(s, m) =>
												s +
												(
													(m as ConversationMessage).text ||
													(m as ConversationMessage).message ||
													""
												)
													.toString()
													.trim()
													.split(WORD_SPACE_REGEX)
													.filter(Boolean).length,
											0
										)
									: 0),
							0
						) / metrics.totalMessages
					: 0,
			avgMessagesPerCustomer:
				metrics.uniqueCustomers > 0
					? metrics.totalMessages / metrics.uniqueCustomers
					: 0,
			totalMessages: metrics.totalMessages,
			uniqueCustomers: metrics.uniqueCustomers,
			responseTimeStats: {
				avg: Number.isFinite(responseMetrics.avgResponseTime)
					? responseMetrics.avgResponseTime
					: 0,
				median: (() => {
					const arr: number[] = [];
					if (arr.length === 0) {
						return 0;
					}
					const s = [...arr].sort((a, b) => a - b);
					const mid = Math.floor(s.length / 2);
					return s.length % 2
						? (s[mid] ?? 0)
						: ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
				})(),
				max: 0,
			},
			messageCountDistribution: {
				avg:
					metrics.uniqueCustomers > 0
						? metrics.totalMessages / metrics.uniqueCustomers
						: 0,
				median: (() => {
					const counts = filtered.filteredConversationEntries.map(([, msgs]) =>
						Array.isArray(msgs) ? msgs.length : 0
					);
					if (counts.length === 0) {
						return 0;
					}
					const s = [...counts].sort((a, b) => a - b);
					const mid = Math.floor(s.length / 2);
					return s.length % 2
						? (s[mid] ?? 0)
						: ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
				})(),
				max: filtered.filteredConversationEntries.length
					? Math.max(
							...filtered.filteredConversationEntries.map(([, msgs]) =>
								Array.isArray(msgs) ? msgs.length : 0
							)
						)
					: 0,
			},
		},
		wordFrequency: getWordFrequency(filtered.filteredConversationEntries),
		dayOfWeekData: getDayOfWeekData(
			filtered.filteredReservationEntries,
			dateParsers.parseReservationDate
		),
		monthlyTrends: getMonthlyTrends(
			filtered.filteredReservationEntries,
			filtered.filteredConversationEntries,
			dateParsers.parseReservationDate,
			dateParsers.parseMessageDate
		),
		funnelData: [
			{
				stage: "Conversations",
				count: filtered.filteredConversationEntries.filter(
					([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0
				).length,
			},
			{
				stage: "Made reservation",
				count: filtered.filteredReservationEntries.filter(
					([, items]) => (Array.isArray(items) ? items.length : 0) > 0
				).length,
			},
			{ stage: "Returned for another", count: metrics.returningCustomers },
			{ stage: "Cancelled", count: 0 },
		],
		customerSegments: getCustomerSegments(
			filtered.filteredReservationEntries,
			metrics.uniqueCustomers
		),
	};
}
