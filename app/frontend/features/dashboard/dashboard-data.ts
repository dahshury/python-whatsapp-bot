import type { DashboardData } from "@features/dashboard/types";
import { useMemo } from "react";
import type { ConversationMessage } from "@/entities/conversation";
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

// Constants for date range filtering
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;

// Helper to parse ISO date/datetime
function parseISO(value?: string | null): Date | null {
	if (!value) {
		return null;
	}
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

// Helper to parse reservation date
function parseReservationDate(r: ReservationItem): Date | null {
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
}

// Helper to parse message date
function parseMessageDate(m: ConversationItem): Date | null {
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
}

// Helper to check if date is within range
function isDateInRange(
	d: Date | null,
	range?: { fromDate?: string; toDate?: string }
): boolean {
	if (!d) {
		return false;
	}
	if (range?.fromDate) {
		const from = new Date(range.fromDate);
		if (d < from) {
			return false;
		}
	}
	if (range?.toDate) {
		const to = new Date(range.toDate);
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

export const useDashboardData = (state?: {
	conversations?: Record<string, ConversationMessage[]>;
	reservations?: Record<string, Reservation[]>;
	activeRange?: unknown;
}) => {
	const { conversations, reservations, activeRange } = state || {};

	const dashboardData = useMemo<DashboardData | null>(() => {
		try {
			const reservationEntries = Object.entries(reservations ?? {});
			const conversationEntries = Object.entries(conversations ?? {});

			const reservationEntriesFiltered = reservationEntries.map(
				([id, items]) => [
					id,
					(Array.isArray(items) ? items : []).filter((r) =>
						isDateInRange(
							parseReservationDate(r),
							activeRange as { fromDate?: string; toDate?: string }
						)
					),
				]
			) as [string, Reservation[]][];
			const conversationEntriesFiltered = conversationEntries.map(
				([id, msgs]) => [
					id,
					(Array.isArray(msgs) ? msgs : []).filter((m) =>
						isDateInRange(
							parseMessageDate(m),
							activeRange as { fromDate?: string; toDate?: string }
						)
					),
				]
			) as unknown as [string, ConversationMessage[]][];

			const totalReservations = reservationEntriesFiltered.reduce(
				(sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0),
				0
			);
			const totalMessages = conversationEntriesFiltered.reduce(
				(sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.length : 0),
				0
			);

			const uniqueCustomerIds = new Set<string>([
				...Object.keys(reservations ?? {}),
				...Object.keys(conversations ?? {}),
			]);

			const dashboard: DashboardData = {
				_isMockData: false,
				stats: {
					totalReservations,
					totalCancellations: 0,
					uniqueCustomers: uniqueCustomerIds.size,
					conversionRate: 0,
					returningCustomers: 0,
					returningRate: 0,
					avgFollowups: 0,
					avgResponseTime: 0,
					activeCustomers: 0,
					trends: {
						totalReservations: { percentChange: 0, isPositive: true },
						cancellations: { percentChange: 0, isPositive: true },
						avgResponseTime: { percentChange: 0, isPositive: true },
						avgFollowups: { percentChange: 0, isPositive: true },
						uniqueCustomers: { percentChange: 0, isPositive: true },
						conversionRate: { percentChange: 0, isPositive: true },
					},
				},
				prometheusMetrics:
					(globalThis as { __prom_metrics__?: Record<string, unknown> })
						.__prom_metrics__ || {},
				dailyTrends: [],
				typeDistribution: [],
				timeSlots: [],
				messageHeatmap: [],
				topCustomers: [],
				conversationAnalysis: {
					avgMessageLength: 0,
					avgWordsPerMessage: 0,
					avgMessagesPerCustomer: uniqueCustomerIds.size
						? totalMessages / uniqueCustomerIds.size
						: 0,
					totalMessages,
					uniqueCustomers: uniqueCustomerIds.size,
					responseTimeStats: { avg: 0, median: 0, max: 0 },
					messageCountDistribution: { avg: 0, median: 0, max: 0 },
				},
				wordFrequency: [],
				dayOfWeekData: [],
				monthlyTrends: [],
				funnelData: [
					{
						stage: "Conversations",
						count: conversationEntriesFiltered.filter(
							([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0
						).length,
					},
					{
						stage: "Made reservation",
						count: reservationEntriesFiltered.filter(
							([, items]) => (Array.isArray(items) ? items.length : 0) > 0
						).length,
					},
					{ stage: "Returned for another", count: 0 },
					{ stage: "Cancelled", count: 0 },
				],
				customerSegments: [],
			};

			return dashboard;
		} catch (_e) {
			return null;
		}
	}, [conversations, reservations, activeRange]);

	return { dashboardData };
};
