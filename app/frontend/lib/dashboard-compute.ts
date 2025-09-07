import type { DashboardData } from "@/types/dashboard";
import type { ConversationMessage, Reservation } from "@/types/calendar";

interface ReservationItem {
	date?: string;
	time_slot?: string;
	time?: string;
	start?: string;
	[key: string]: unknown;
}

interface ConversationItem {
	date?: string;
	time?: string;
	ts?: string;
	datetime?: string;
	[key: string]: unknown;
}

export function computeDashboardData(
	conversations: Record<string, ConversationItem[]>,
	reservations: Record<string, ReservationItem[]>,
	activeRange?: { fromDate?: string; toDate?: string },
): DashboardData | null {
	try {
		const reservationEntries = Object.entries(reservations ?? {});
		const conversationEntries = Object.entries(conversations ?? {});

		const parseISO = (value?: string | null) => {
			if (!value) return null;
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? null : d;
		};
		const parseReservationDate = (r: ReservationItem) => {
			const iso = parseISO(r?.start);
			if (iso) return iso;
			const date: string | undefined = r?.date;
			const time: string | undefined = r?.time_slot || r?.time;
			if (date && time) return parseISO(`${date}T${time}`);
			if (date) return parseISO(`${date}T00:00:00`);
			return null;
		};
		const parseMessageDate = (m: ConversationItem) => {
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
				const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
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

		// Build previous period range (same length, immediately before current range)
		const getPreviousRange = () => {
			const fromStr = activeRange?.fromDate;
			const toStr = activeRange?.toDate;
			if (!fromStr || !toStr) return null;
			const from = new Date(fromStr);
			const to = new Date(toStr);
			const oneDayMs = 24 * 60 * 60 * 1000;
			const days = Math.max(
				1,
				Math.floor(
					(new Date(
						to.getFullYear(),
						to.getMonth(),
						to.getDate(),
						23,
						59,
						59,
						999,
					).getTime() -
						new Date(
							from.getFullYear(),
							from.getMonth(),
							from.getDate(),
						).getTime()) /
						oneDayMs,
				) + 1,
			);
			const prevTo = new Date(
				from.getFullYear(),
				from.getMonth(),
				from.getDate() - 1,
			);
			const prevFrom = new Date(
				prevTo.getFullYear(),
				prevTo.getMonth(),
				prevTo.getDate() - (days - 1),
			);
			return { prevFrom, prevTo };
		};

		const prevRange = getPreviousRange();
		const withinPrevRange = (d: Date | null) => {
			if (!d || !prevRange) return false;
			const { prevFrom, prevTo } = prevRange;
			const f = new Date(
				prevFrom.getFullYear(),
				prevFrom.getMonth(),
				prevFrom.getDate(),
			);
			const t = new Date(
				prevTo.getFullYear(),
				prevTo.getMonth(),
				prevTo.getDate(),
				23,
				59,
				59,
				999,
			);
			return d >= f && d <= t;
		};

		// Unique customers based on full datasets (not filtered) so denominators make sense,
		// while time-bounded metrics use filtered subsets

		const filteredReservationEntries = reservationEntries.map(([id, items]) => [
			id,
			(Array.isArray(items) ? items : []).filter((r) =>
				withinRange(parseReservationDate(r)),
			),
		]) as unknown as [string, ConversationMessage[]][];
		const filteredConversationEntries = conversationEntries.map(
			([id, msgs]) => [
				id,
				(Array.isArray(msgs) ? msgs : []).filter((m) =>
					withinRange(parseMessageDate(m)),
				),
			],
		) as unknown as [string, ConversationMessage[]][];

		// Previous period filtered datasets
		const prevReservationEntries = reservationEntries.map(([id, items]) => [
			id,
			(Array.isArray(items) ? items : []).filter((r) =>
				withinPrevRange(parseReservationDate(r)),
			),
		]) as unknown as [string, ConversationMessage[]][];
		const prevConversationEntries = conversationEntries.map(([id, msgs]) => [
			id,
			(Array.isArray(msgs) ? msgs : []).filter((m) =>
				withinPrevRange(parseMessageDate(m)),
			),
		]) as unknown as [string, ConversationMessage[]][];

		const totalReservations = filteredReservationEntries.reduce(
			(sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0),
			0,
		);
		const prevTotalReservations = prevReservationEntries.reduce(
			(sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0),
			0,
		);
		const totalMessages = filteredConversationEntries.reduce(
			(sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.length : 0),
			0,
		);

		const returningCustomers = filteredReservationEntries.reduce(
			(count, [, items]) =>
				count + (Array.isArray(items) && items.length > 1 ? 1 : 0),
			0,
		);

		// Unique customers for the KPI as "first reservation in selected period"
		const firstReservationDateByCustomer = new Map<string, Date | null>();
		reservationEntries.forEach(([id, items]) => {
			const first = (Array.isArray(items) ? items : [])
				.map((r) => parseReservationDate(r))
				.filter(Boolean)
				.sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] as
				| Date
				| undefined;
			firstReservationDateByCustomer.set(id, first ?? null);
		});
		const uniqueCustomers = Array.from(
			firstReservationDateByCustomer.entries(),
		).reduce((count, [, d]) => count + (withinRange(d) ? 1 : 0), 0);
		const prevUniqueCustomers = Array.from(
			firstReservationDateByCustomer.entries(),
		).reduce((count, [, d]) => count + (withinPrevRange(d) ? 1 : 0), 0);

		// Conversion rate: customers who chatted in period and also booked in period
		const chattedIdsPeriod = new Set<string>(
			filteredConversationEntries
				.filter(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0)
				.map(([id]) => id),
		);
		const reservedIdsPeriod = new Set<string>(
			filteredReservationEntries
				.filter(([, items]) => (Array.isArray(items) ? items.length : 0) > 0)
				.map(([id]) => id),
		);
		const conversionDenominator = chattedIdsPeriod.size;
		let conversionNumerator = 0;
		chattedIdsPeriod.forEach((id) => {
			if (reservedIdsPeriod.has(id)) conversionNumerator += 1;
		});
		const conversionRate =
			conversionDenominator > 0
				? Math.min(100, (conversionNumerator / conversionDenominator) * 100)
				: 0;

		const avgFollowups = (() => {
			const returningCounts = filteredReservationEntries
				.map(([, items]) => (Array.isArray(items) ? items.length : 0))
				.filter((len) => len > 1)
				.map((len) => len - 1);
			if (returningCounts.length === 0) return 0;
			const total = returningCounts.reduce((a, b) => a + b, 0);
			return total / returningCounts.length;
		})();
		const prevAvgFollowups = (() => {
			const returningCounts = prevReservationEntries
				.map(([, items]) => (Array.isArray(items) ? items.length : 0))
				.filter((len) => len > 1)
				.map((len) => len - 1);
			if (returningCounts.length === 0) return 0;
			const total = returningCounts.reduce((a, b) => a + b, 0);
			return total / returningCounts.length;
		})();

		// Previous period conversion rate for trend
		const prevChattedIds = new Set<string>(
			prevConversationEntries
				.filter(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0)
				.map(([id]) => id),
		);
		const prevReservedIds = new Set<string>(
			prevReservationEntries
				.filter(([, items]) => (Array.isArray(items) ? items.length : 0) > 0)
				.map(([id]) => id),
		);
		const prevDen = prevChattedIds.size;
		let prevNum = 0;
		prevChattedIds.forEach((id) => {
			if (prevReservedIds.has(id)) prevNum += 1;
		});
		const prevConversionRate =
			prevDen > 0 ? Math.min(100, (prevNum / prevDen) * 100) : 0;

		const responseDurationsMinutes: number[] = (() => {
			const diffs: number[] = [];
			filteredConversationEntries.forEach(([, msgs]) => {
				const sorted = (Array.isArray(msgs) ? msgs : [])
					.map((m) => ({
						d: parseMessageDate(m as unknown as ConversationItem),
						role:
							(m as ConversationMessage & { role?: string }).role ||
							(m as ConversationMessage & { sender?: string }).sender ||
							(m as ConversationMessage & { author?: string }).author ||
							"user",
					}))
					.filter((x) => Boolean(x.d))
					.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
				for (let i = 1; i < sorted.length; i++) {
					const prev = sorted[i - 1];
					const curr = sorted[i];
					if (!prev || !curr) continue;
					const prevIsCustomer =
						String(prev.role).toLowerCase() !== "assistant";
					const currIsAssistant =
						String(curr.role).toLowerCase() === "assistant";
					if (prevIsCustomer && currIsAssistant) {
						const deltaMs =
							(curr.d as Date).getTime() - (prev.d as Date).getTime();
						if (deltaMs > 0) diffs.push(deltaMs / 60000);
					}
				}
			});
			return diffs;
		})();
		const prevResponseDurationsMinutes: number[] = (() => {
			const diffs: number[] = [];
			prevConversationEntries.forEach(([, msgs]) => {
				const sorted = (Array.isArray(msgs) ? msgs : [])
					.map((m) => ({
						d: parseMessageDate(m as unknown as ConversationItem),
						role:
							(m as ConversationMessage & { role?: string }).role ||
							(m as ConversationMessage & { sender?: string }).sender ||
							(m as ConversationMessage & { author?: string }).author ||
							"user",
					}))
					.filter((x) => Boolean(x.d))
					.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
				for (let i = 1; i < sorted.length; i++) {
					const prev = sorted[i - 1];
					const curr = sorted[i];
					if (!prev || !curr) continue;
					const prevIsCustomer =
						String(prev.role).toLowerCase() !== "assistant";
					const currIsAssistant =
						String(curr.role).toLowerCase() === "assistant";
					if (prevIsCustomer && currIsAssistant) {
						const deltaMs =
							(curr.d as Date).getTime() - (prev.d as Date).getTime();
						if (deltaMs > 0) diffs.push(deltaMs / 60000);
					}
				}
			});
			return diffs;
		})();

		const avg = (arr: number[]) =>
			arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

		const avgResponseTime = Math.min(60, avg(responseDurationsMinutes));
		const prevAvgResponseTime = Math.min(60, avg(prevResponseDurationsMinutes));

		const prom =
			(globalThis as { __prom_metrics__?: Record<string, unknown> })
				.__prom_metrics__ || {};

		// Active customers: customers with at least one upcoming (future) reservation
		const now = new Date();
		const activeUpcomingCustomerIds = new Set<string>();
		reservationEntries.forEach(([id, items]) => {
			const hasUpcoming = (Array.isArray(items) ? items : []).some((r) => {
				const d = parseReservationDate(r);
				return (
					d &&
					d > now &&
					(r as Reservation & { cancelled?: boolean }).cancelled !== true
				);
			});
			if (hasUpcoming) activeUpcomingCustomerIds.add(id);
		});

		const totalCancellations = filteredReservationEntries.reduce(
			(sum, [, items]) =>
				sum +
				(Array.isArray(items)
					? items.filter(
							(r) =>
								(r as unknown as Reservation & { cancelled?: boolean }).cancelled === true,
						).length
					: 0),
			0,
		);
		const prevTotalCancellations = prevReservationEntries.reduce(
			(sum, [, items]) =>
				sum +
				(Array.isArray(items)
					? items.filter(
							(r) =>
								(r as unknown as Reservation & { cancelled?: boolean }).cancelled === true,
						).length
					: 0),
			0,
		);

		// Helper to compute percent change safely
		const computeTrend = (
			current: number,
			previous: number,
			higherIsBetter = true,
		) => {
			if (previous === 0) {
				const percentChange = current > 0 ? 100 : 0;
				const isPositive = higherIsBetter ? current > 0 : current === 0;
				return { percentChange, isPositive };
			}
			const raw = ((current - previous) / Math.abs(previous)) * 100;
			const isPositive = higherIsBetter ? raw >= 0 : raw <= 0;
			return { percentChange: raw, isPositive };
		};

		const dashboard: DashboardData = {
			_isMockData: false,
			stats: {
				totalReservations,
				totalCancellations,
				uniqueCustomers,
				conversionRate,
				returningCustomers,
				returningRate: uniqueCustomers
					? (returningCustomers / uniqueCustomers) * 100
					: 0,
				avgFollowups,
				avgResponseTime: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
				activeCustomers: activeUpcomingCustomerIds.size,
				trends: {
					totalReservations: computeTrend(
						totalReservations,
						prevTotalReservations,
						true,
					),
					cancellations: computeTrend(
						totalCancellations,
						prevTotalCancellations,
						false,
					),
					avgResponseTime: computeTrend(
						avgResponseTime,
						prevAvgResponseTime,
						false,
					),
					avgFollowups: computeTrend(avgFollowups, prevAvgFollowups, true),
					uniqueCustomers: computeTrend(
						uniqueCustomers,
						prevUniqueCustomers,
						true,
					),
					conversionRate: computeTrend(
						conversionRate,
						prevConversionRate,
						true,
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
				reservations_requested_total: prom.reservations_requested_total as number,
				reservations_successful_total: prom.reservations_successful_total as number,
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
				avgMessagesPerCustomer:
					uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
				totalMessages,
				uniqueCustomers,
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
						([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0,
					).length,
				},
				{
					stage: "Made reservation",
					count: filteredReservationEntries.filter(
						([, items]) => (Array.isArray(items) ? items.length : 0) > 0,
					).length,
				},
				{ stage: "Returned for another", count: returningCustomers },
				{ stage: "Cancelled", count: 0 },
			],
			customerSegments: [],
		};

		return dashboard;
	} catch (e) {
		console.error("Failed to compute dashboard data (compute)", e);
		return null;
	}
}
