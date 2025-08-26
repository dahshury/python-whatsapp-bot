import * as React from "react";
import type { DashboardData } from "@/types/dashboard";

// Expect reservations and conversations to be provided from a higher-level data context
export function useDashboardDataFrom(state: {
	conversations: Record<string, any[]>;
	reservations: Record<string, any[]>;
	vacations: any[];
	activeRange?: { fromDate?: string; toDate?: string };
}) {
	const { conversations, reservations, activeRange, vacations } = state;

	const dashboardData = React.useMemo<DashboardData | null>(() => {
		try {
			const reservationEntries = Object.entries(reservations ?? {});
			const conversationEntries = Object.entries(conversations ?? {});

			const parseISO = (value?: string | null) => {
				if (!value) return null;
				const d = new Date(value);
				return Number.isNaN(d.getTime()) ? null : d;
			};
			const parseReservationDate = (r: any) => {
				const iso = parseISO(r?.start);
				if (iso) return iso;
				const date: string | undefined = r?.date;
				const time: string | undefined = r?.time_slot || r?.time;
				if (date && time) return parseISO(`${date}T${time}`);
				if (date) return parseISO(`${date}T00:00:00`);
				return null;
			};
			const parseMessageDate = (m: any) => {
				const iso = parseISO(m?.ts || m?.datetime);
				if (iso) return iso;
				const date: string | undefined = m?.date;
				const time: string | undefined = m?.time;
				if (date && time) return parseISO(`${date}T${time}`);
				if (date) return parseISO(`${date}T00:00:00`);
				return null;
			};

			const withinRange = (d: Date | null) => {
				if (!d) return false;
				const from = activeRange?.fromDate
					? new Date(activeRange.fromDate)
					: null;
				const to = activeRange?.toDate ? new Date(activeRange.toDate) : null;
				if (from) {
					const f = new Date(
						from.getFullYear(),
						from.getMonth(),
						from.getDate(),
					);
					if (d < f) return false;
				}
				if (to) {
					const t = new Date(
						to.getFullYear(),
						to.getMonth(),
						to.getDate(),
						23,
						59,
						59,
						999,
					);
					if (d > t) return false;
				}
				return true;
			};

			const reservationEntriesFiltered = reservationEntries.map(
				([id, items]) => [
					id,
					(Array.isArray(items) ? items : []).filter((r) =>
						withinRange(parseReservationDate(r)),
					),
				],
			) as [string, any[]][];
			const conversationEntriesFiltered = conversationEntries.map(
				([id, msgs]) => [
					id,
					(Array.isArray(msgs) ? msgs : []).filter((m) =>
						withinRange(parseMessageDate(m)),
					),
				],
			) as [string, any[]][];

			const totalReservations = reservationEntriesFiltered.reduce(
				(sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0),
				0,
			);
			const totalMessages = conversationEntriesFiltered.reduce(
				(sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.length : 0),
				0,
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
				prometheusMetrics: (globalThis as any).__prom_metrics__ || {},
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
							([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0,
						).length,
					},
					{
						stage: "Made reservation",
						count: reservationEntriesFiltered.filter(
							([, items]) => (Array.isArray(items) ? items.length : 0) > 0,
						).length,
					},
					{ stage: "Returned for another", count: 0 },
					{ stage: "Cancelled", count: 0 },
				],
				customerSegments: [],
			};

			return dashboard;
		} catch (e) {
			console.error("Failed to compute dashboard data (slim):", e);
			return null;
		}
	}, [conversations, reservations, activeRange]);

	return { dashboardData };
}
