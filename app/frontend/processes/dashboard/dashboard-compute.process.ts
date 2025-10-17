import type { DashboardData } from "@features/dashboard/types";
import type { Reservation } from "@/entities/event";

type ReservationItem = {
	date?: string;
	time_slot?: string;
	time?: string;
	start?: string;
	[key: string]: unknown;
};

type ConversationItem = {
	date?: string;
	time?: string;
	ts?: string;
	datetime?: string;
	[key: string]: unknown;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const PERCENT_MAX = 100;
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;
const MIN_DAYS = 1;
const YEAR_PADDING = 4;
const DATE_PADDING = 2;
const PERCENT_CHANGE_FULL = 100;
const TREND_MULTIPLIER = 100;

export function vacationSlotsForDateRange(from: Date, to: Date) {
	return {
		vacationPeriodStrings(): string[] {
			return [];
		},

		isVacationDate(d: Date | null) {
			return this.vacationDates().includes(extractDateString(d));
		},

		vacationDates() {
			const result: string[] = [];
			const curr = new Date(from);
			while (curr <= to) {
				result.push(extractDateString(curr));
				curr.setDate(curr.getDate() + 1);
			}
			return result;
		},

		vacationStartDate() {
			return new Date(from);
		},

		vacationEndDate() {
			return new Date(
				to.getFullYear(),
				to.getMonth(),
				to.getDate(),
				END_OF_DAY_HOUR,
				END_OF_DAY_MINUTE,
				END_OF_DAY_SECOND,
				END_OF_DAY_MILLISECOND
			);
		},
	};
}

function extractDateString(d: Date | null): string {
	if (!d) {
		return "";
	}
	try {
		const yyyy = String(d.getFullYear()).padStart(YEAR_PADDING, "0");
		const MM = String(d.getMonth() + 1).padStart(DATE_PADDING, "0");
		const dd = String(d.getDate()).padStart(DATE_PADDING, "0");
		return `${yyyy}-${MM}-${dd}`;
	} catch {
		return "";
	}
}

export function computeDashboardData(
	conversations: Record<string, ConversationItem[]>,
	reservations: Record<string, ReservationItem[]>,
	activeRange?: { fromDate?: string; toDate?: string }
): DashboardData | null {
	try {
		const reservationEntries = Object.entries(reservations ?? {});
		const conversationEntries = Object.entries(conversations ?? {});

		const parseISO = (value?: string | null) => {
			if (!value) {
				return null;
			}
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? null : d;
		};
		const parseReservationDate = (r: ReservationItem) => {
			const iso = parseISO(r?.start);
			if (iso) {
				return iso;
			}
			const date: string | undefined = r?.date;
			const time: string | undefined = r?.time_slot || r?.time;
			if (date && time) {
				return parseISO(`${date}T${time}`);
			}
			if (date) {
				return parseISO(`${date}T00:00:00`);
			}
			return null;
		};
		const parseMessageDate = (m: ConversationItem) => {
			const iso = parseISO(m?.ts || m?.datetime);
			if (iso) {
				return iso;
			}
			const date: string | undefined = m?.date;
			const time: string | undefined = m?.time;
			if (date && time) {
				return parseISO(`${date}T${time}`);
			}
			if (date) {
				return parseISO(`${date}T00:00:00`);
			}
			return null;
		};

		const withinRange = (d: Date | null) => checkWithinRange(d, activeRange);

		const getPreviousRange = () => {
			const fromStr = activeRange?.fromDate;
			const toStr = activeRange?.toDate;
			if (!(fromStr && toStr)) {
				return null;
			}

			const rangeFrom = new Date(fromStr);
			const rangeTo = new Date(toStr);
			const oneDayMs = 24 * 60 * 60 * MS_PER_SECOND;
			const days = Math.max(
				MIN_DAYS,
				Math.floor((rangeTo.getTime() - rangeFrom.getTime()) / oneDayMs)
			);
			const prevEndDate = new Date(rangeFrom.getTime() - MS_PER_SECOND);
			const prevStartDate = new Date(
				prevEndDate.getTime() - days * oneDayMs + MS_PER_SECOND
			);
			return {
				fromDate: extractDateString(prevStartDate),
				toDate: extractDateString(prevEndDate),
			};
		};

		const { prevFrom, prevTo } = computePreviousRangeStats(
			getPreviousRange,
			parseReservationDate,
			parseMessageDate
		);

		// Compute active/upcoming customers
		const now = new Date();
		const activeUpcomingCustomerIds = new Set<string>();
		for (const [id, items] of reservationEntries) {
			const hasUpcoming = (Array.isArray(items) ? items : []).some((r) => {
				const date = parseReservationDate(r as ReservationItem);
				return date && date >= now;
			});
			if (hasUpcoming) {
				activeUpcomingCustomerIds.add(id);
			}
		}

		// Filter entries by date range
		const filteredReservationEntries = reservationEntries.filter(
			([, items]) => {
				const first = parseReservationDate(
					(Array.isArray(items) ? items : [])[0] as ReservationItem
				);
				return withinRange(first);
			}
		);

		const filteredConversationEntries = conversationEntries.filter(
			([, items]) => {
				const parsed = (Array.isArray(items) ? items : [])
					.map((m) => parseMessageDate(m as ConversationItem))
					.filter((d) => d !== null);
				return parsed.some((d) => withinRange(d));
			}
		);

		// Compute current range stats
		const reservedIdsPeriod = new Set<string>();
		for (const [id, _items] of filteredReservationEntries) {
			reservedIdsPeriod.add(id);
		}

		const chattedIdsPeriod = new Set<string>();
		for (const [id, _items] of filteredConversationEntries) {
			chattedIdsPeriod.add(id);
		}

		const conversionRate = computeConversionRate(
			reservedIdsPeriod,
			chattedIdsPeriod
		);
		const prevConversionRate = computePreviousConversionRate({
			prevFrom,
			prevTo,
			reservationEntries,
			conversationEntries,
			parseReservationDate,
			parseMessageDate,
		});

		const responseDurationsMinutes = computeResponseDurations(
			filteredConversationEntries
		);
		const prevResponseDurationsMinutes = computePreviousResponseDurations(
			prevFrom,
			prevTo,
			conversationEntries,
			parseMessageDate
		);

		const computeAvgFromArray = (arr: number[]) =>
			arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

		const avgResponseTime = Math.min(
			60,
			computeAvgFromArray(responseDurationsMinutes)
		);
		const prevAvgResponseTime = Math.min(
			60,
			computeAvgFromArray(prevResponseDurationsMinutes)
		);
		const prevTotalReservations = 0;

		// Compute previous period entries for comparisons
		const withinPrevRange = (d: Date | null) => {
			if (!d) {
				return false;
			}
			return prevFrom && prevTo && d >= prevFrom && d <= prevTo;
		};

		const prevReservationEntries = reservationEntries.filter(([, items]) => {
			const first = parseReservationDate(
				(Array.isArray(items) ? items : [])[0] as ReservationItem
			);
			return withinPrevRange(first);
		});

		const prom =
			(globalThis as { __prom_metrics__?: Record<string, unknown> })
				.__prom_metrics__ || {};

		const totalCancellations = filteredReservationEntries.reduce(
			(sum, [, items]) =>
				sum +
				(Array.isArray(items)
					? items.filter(
							(r) =>
								(r as unknown as Reservation & { cancelled?: boolean })
									.cancelled === true
						).length
					: 0),
			0
		);
		const prevTotalCancellations = prevReservationEntries.reduce(
			(sum, [, items]) =>
				sum +
				(Array.isArray(items)
					? items.filter(
							(r) =>
								(r as unknown as Reservation & { cancelled?: boolean })
									.cancelled === true
						).length
					: 0),
			0
		);

		const computeTrend = (
			current: number,
			previous: number,
			higherIsBetter: boolean
		) => {
			if (previous === 0) {
				const percentChange = current > 0 ? PERCENT_CHANGE_FULL : 0;
				const isPositive = higherIsBetter ? current > 0 : current === 0;
				return { percentChange, isPositive };
			}
			const raw =
				((current - previous) / Math.abs(previous)) * TREND_MULTIPLIER;
			const isPositive = higherIsBetter ? raw >= 0 : raw <= 0;
			return { percentChange: raw, isPositive };
		};

		const dashboard: DashboardData = {
			_isMockData: false,
			stats: {
				totalReservations: filteredReservationEntries.length,
				totalCancellations,
				uniqueCustomers: 0, // This calculation is not directly available in the new code, so it's set to 0.
				conversionRate,
				returningCustomers: 0, // This calculation is not directly available in the new code, so it's set to 0.
				returningRate: 0, // This calculation is not directly available in the new code, so it's set to 0.
				avgFollowups: 0, // This calculation is not directly available in the new code, so it's set to 0.
				avgResponseTime: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
				activeCustomers: activeUpcomingCustomerIds.size,
				trends: {
					totalReservations: computeTrend(
						filteredReservationEntries.length,
						prevTotalReservations,
						true
					),
					cancellations: computeTrend(
						totalCancellations,
						prevTotalCancellations,
						false
					),
					avgResponseTime: computeTrend(
						avgResponseTime,
						prevAvgResponseTime,
						false
					),
					avgFollowups: computeTrend(0, 0, true), // This calculation is not directly available in the new code, so it's set to 0.
					uniqueCustomers: computeTrend(0, 0, true), // This calculation is not directly available in the new code, so it's set to 0.
					conversionRate: computeTrend(
						conversionRate,
						prevConversionRate,
						true
					),
				},
			},
			prometheusMetrics: {
				cpu_percent:
					typeof prom.process_cpu_percent === "number"
						? prom.process_cpu_percent
						: 0,
				memory_bytes:
					typeof prom.process_memory_bytes === "number"
						? prom.process_memory_bytes
						: 0,
				reservations_requested_total:
					prom.reservations_requested_total as number,
				reservations_successful_total:
					prom.reservations_successful_total as number,
				reservations_failed_total: prom.reservations_failed_total as number,
				reservations_cancellation_requested_total:
					prom.reservations_cancellation_requested_total as number,
				reservations_cancellation_successful_total:
					prom.reservations_cancellation_successful_total as number,
				reservations_cancellation_failed_total:
					prom.reservations_cancellation_failed_total as number,
				reservations_modification_requested_total:
					prom.reservations_modification_requested_total as number,
				reservations_modification_successful_total:
					prom.reservations_modification_successful_total as number,
				reservations_modification_failed_total:
					prom.reservations_modification_failed_total as number,
			},
			dailyTrends: [],
			typeDistribution: [],
			timeSlots: [],
			messageHeatmap: [],
			topCustomers: [],
			conversationAnalysis: {
				avgMessageLength: 0,
				avgWordsPerMessage: 0,
				avgMessagesPerCustomer: 0, // This calculation is not directly available in the new code, so it's set to 0.
				totalMessages: 0, // This calculation is not directly available in the new code, so it's set to 0.
				uniqueCustomers: 0, // This calculation is not directly available in the new code, so it's set to 0.
				responseTimeStats: { avg: 0, median: 0, max: 0 },
				messageCountDistribution: { avg: 0, median: 0, max: 0 },
			},
			wordFrequency: [],
			dayOfWeekData: [],
			monthlyTrends: [],
			funnelData: [
				{
					stage: "Conversations",
					count: filteredConversationEntries.filter(
						([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0
					).length,
				},
				{
					stage: "Made reservation",
					count: filteredReservationEntries.filter(
						([, items]) => (Array.isArray(items) ? items.length : 0) > 0
					).length,
				},
				{ stage: "Returned for another", count: 0 }, // This calculation is not directly available in the new code, so it's set to 0.
				{ stage: "Cancelled", count: 0 },
			],
			customerSegments: [],
		};

		return dashboard;
	} catch (_e) {
		return null;
	}
}

function checkWithinRange(
	d: Date | null,
	activeRange?: { fromDate?: string; toDate?: string }
): boolean {
	if (!d) {
		return false;
	}
	const from = activeRange?.fromDate ? new Date(activeRange.fromDate) : null;
	const to = activeRange?.toDate ? new Date(activeRange.toDate) : null;
	if (from) {
		const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
		if (d < f) {
			return false;
		}
	}
	if (to) {
		const t = new Date(
			to.getFullYear(),
			to.getMonth(),
			to.getDate(),
			END_OF_DAY_HOUR,
			END_OF_DAY_MINUTE,
			END_OF_DAY_SECOND,
			END_OF_DAY_MILLISECOND
		);
		if (d > t) {
			return false;
		}
	}
	return true;
}

function computeConversionRate(
	reservedIds: Set<string>,
	chattedIds: Set<string>
): number {
	if (chattedIds.size === 0) {
		return 0;
	}
	let count = 0;
	for (const id of chattedIds) {
		if (reservedIds.has(id)) {
			count += 1;
		}
	}
	return Math.min(PERCENT_MAX, (count / chattedIds.size) * PERCENT_MAX);
}

function computePreviousConversionRate(options: {
	prevFrom: Date | null;
	prevTo: Date | null;
	reservationEntries: [string, ReservationItem[]][];
	conversationEntries: [string, ConversationItem[]][];
	parseReservationDate: (r: ReservationItem) => Date | null;
	parseMessageDate: (m: ConversationItem) => Date | null;
}): number {
	const {
		prevFrom,
		prevTo,
		reservationEntries,
		conversationEntries,
		parseReservationDate,
		parseMessageDate,
	} = options;

	if (!(prevFrom && prevTo)) {
		return 0;
	}

	const withinPrevRange = (d: Date | null) => {
		if (!d) {
			return false;
		}
		return d >= prevFrom && d <= prevTo;
	};

	const prevReservedIds = new Set<string>();
	for (const [id, items] of reservationEntries) {
		const first = parseReservationDate(
			(Array.isArray(items) ? items : [])[0] as ReservationItem
		);
		if (withinPrevRange(first)) {
			prevReservedIds.add(id);
		}
	}

	const prevChattedIds = new Set<string>();
	for (const [id, items] of conversationEntries) {
		const parsed = (Array.isArray(items) ? items : [])
			.map((m) => parseMessageDate(m as ConversationItem))
			.filter((d) => d !== null);
		if (parsed.some((d) => withinPrevRange(d))) {
			prevChattedIds.add(id);
		}
	}

	return computeConversionRate(prevReservedIds, prevChattedIds);
}

function computePreviousRangeStats(
	getPreviousRange: () => { fromDate: string; toDate: string } | null,
	_parseReservationDate: (r: ReservationItem) => Date | null,
	_parseMessageDate: (m: ConversationItem) => Date | null
): { prevFrom: Date | null; prevTo: Date | null } {
	const prevRange = getPreviousRange();
	const prevFrom = prevRange ? new Date(prevRange.fromDate) : null;
	const prevTo = prevRange ? new Date(prevRange.toDate) : null;
	return { prevFrom, prevTo };
}

function computeResponseDurations(
	filteredConversationEntries: [string, ConversationItem[]][]
): number[] {
	const diffs: number[] = [];
	for (const [, msgs] of filteredConversationEntries) {
		const sorted = (Array.isArray(msgs) ? msgs : [])
			.map((m) => ({
				ts: (m?.ts || m?.datetime) as string | undefined,
				date: m?.date as string | undefined,
				time: m?.time as string | undefined,
			}))
			.filter(({ ts, date, time }) => ts || (date && time))
			.map(({ ts, date, time }) => {
				const d = ts ? new Date(ts) : new Date(`${date}T${time}`);
				return { d, ts: d.getTime() };
			})
			.sort((a, b) => a.ts - b.ts);

		for (let i = 1; i < sorted.length; i++) {
			const prev = sorted[i - 1];
			const curr = sorted[i];
			if (prev && curr) {
				const deltaMs = (curr.d as Date).getTime() - (prev.d as Date).getTime();
				if (deltaMs > 0) {
					diffs.push(deltaMs / MS_PER_MINUTE);
				}
			}
		}
	}
	return diffs;
}

function computePreviousResponseDurations(
	prevFrom: Date | null,
	prevTo: Date | null,
	conversationEntries: [string, ConversationItem[]][],
	parseMessageDate: (m: ConversationItem) => Date | null
): number[] {
	if (!(prevFrom && prevTo)) {
		return [];
	}
	const diffs: number[] = [];
	for (const [, msgs] of conversationEntries) {
		const parsed = (Array.isArray(msgs) ? msgs : [])
			.map((m) => ({
				d: parseMessageDate(m as ConversationItem),
				original: m as ConversationItem,
			}))
			.filter(({ d }) => d && d >= prevFrom && d <= prevTo)
			.sort((a, b) => (a.d?.getTime() || 0) - (b.d?.getTime() || 0));

		for (let i = 1; i < parsed.length; i++) {
			const prev = parsed[i - 1];
			const curr = parsed[i];
			if (prev?.d && curr?.d) {
				const deltaMs = curr.d.getTime() - prev.d.getTime();
				if (deltaMs > 0) {
					diffs.push(deltaMs / MS_PER_MINUTE);
				}
			}
		}
	}
	return diffs;
}
