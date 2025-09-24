import type { DashboardData, PrometheusMetrics } from "@/types/dashboard";
import type {
	ConversationMessage as CalendarConversationMessage,
	Reservation as CalendarReservation,
} from "@/types/calendar";

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

export function computeFullDashboardData(
	conversations: Record<string, ConversationMessage[]>,
	reservations: Record<string, Reservation[]>,
	activeRange?: { fromDate?: string; toDate?: string },
	prometheusMetrics?: PrometheusMetrics,
): DashboardData {
	const reservationEntries = Object.entries(reservations ?? {});
	const conversationEntries = Object.entries(conversations ?? {});

	const parseISO = (value?: string | null) => {
		if (!value) return null;
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d;
	};
	const parseReservationDate = (r: Reservation) => {
		const iso = parseISO(r?.start);
		if (iso) return iso;
		const date: string | undefined = (r as Reservation & { date?: string })?.date;
		const time: string | undefined =
			(r as Reservation & { time_slot?: string; time?: string })?.time_slot ||
			(r as Reservation & { time_slot?: string; time?: string })?.time;
		if (date && time) return parseISO(`${date}T${time}`);
		if (date) return parseISO(`${date}T00:00:00`);
		return null;
	};
	const parseMessageDate = (m: ConversationMessage) => {
		const iso = parseISO(m?.ts || (m as ConversationMessage & { datetime?: string })?.datetime);
		if (iso) return iso;
		const date: string | undefined = (m as ConversationMessage & { date?: string })?.date;
		const time: string | undefined = (m as ConversationMessage & { time?: string })?.time;
		if (date && time) return parseISO(`${date}T${time}`);
		if (date) return parseISO(`${date}T00:00:00`);
		return null;
	};

	const withinRange = (d: Date | null) => {
		if (!d) return false;
		const from = activeRange?.fromDate ? new Date(activeRange.fromDate) : null;
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
		const prevTo = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1);
		const prevFrom = new Date(prevTo.getFullYear(), prevTo.getMonth(), prevTo.getDate() - (days - 1));
		return { prevFrom, prevTo };
	};

	const prevRange = getPreviousRange();
	const withinPrevRange = (d: Date | null) => {
		if (!d || !prevRange) return false;
		const { prevFrom, prevTo } = prevRange;
		const f = new Date(prevFrom.getFullYear(), prevFrom.getMonth(), prevFrom.getDate());
		const t = new Date(prevTo.getFullYear(), prevTo.getMonth(), prevTo.getDate(), 23, 59, 59, 999);
		return d >= f && d <= t;
	};

	const uniqueCustomerIds = new Set<string>([
		...Object.keys(reservations ?? {}),
		...Object.keys(conversations ?? {}),
	]);

	const filteredReservationEntries = reservationEntries.map(([id, items]) => [
		id,
		(Array.isArray(items) ? items : []).filter((r) => withinRange(parseReservationDate(r))),
	]) as [string, Reservation[]][];
	const filteredConversationEntries = conversationEntries.map(([id, msgs]) => [
		id,
		(Array.isArray(msgs) ? msgs : []).filter((m) => withinRange(parseMessageDate(m))),
	]) as [string, ConversationMessage[]][];

	const prevReservationEntries = reservationEntries.map(([id, items]) => [
		id,
		(Array.isArray(items) ? items : []).filter((r) => withinPrevRange(parseReservationDate(r))),
	]) as [string, Reservation[]][];
	const prevConversationEntries = conversationEntries.map(([id, msgs]) => [
		id,
		(Array.isArray(msgs) ? msgs : []).filter((m) => withinPrevRange(parseMessageDate(m))),
	]) as [string, ConversationMessage[]][];

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
		(count, [, items]) => count + (Array.isArray(items) && items.length > 1 ? 1 : 0),
		0,
	);

	const firstReservationDateByCustomer = new Map<string, Date | null>();
	reservationEntries.forEach(([id, items]) => {
		const first = (Array.isArray(items) ? items : [])
			.map((r) => parseReservationDate(r))
			.filter(Boolean)
			.sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] as Date | undefined;
		firstReservationDateByCustomer.set(id, first ?? null);
	});
	const uniqueCustomers = Array.from(firstReservationDateByCustomer.entries()).reduce(
		(count, [, d]) => count + (withinRange(d) ? 1 : 0),
		0,
	);
	const prevUniqueCustomers = Array.from(firstReservationDateByCustomer.entries()).reduce(
		(count, [, d]) => count + (withinPrevRange(d) ? 1 : 0),
		0,
	);

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
		conversionDenominator > 0 ? Math.min(100, (conversionNumerator / conversionDenominator) * 100) : 0;

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
	const prevConversionRate = prevDen > 0 ? Math.min(100, (prevNum / prevDen) * 100) : 0;

	const responseDurationsMinutes: number[] = (() => {
		const diffs: number[] = [];
		filteredConversationEntries.forEach(([, msgs]) => {
			const sorted = (Array.isArray(msgs) ? msgs : [])
				.map((m) => ({
					d: parseMessageDate(m),
					role:
						(m as ConversationMessage & { role?: string; sender?: string; author?: string }).role ||
						(m as ConversationMessage & { role?: string; sender?: string; author?: string }).sender ||
						(m as ConversationMessage & { role?: string; sender?: string; author?: string }).author ||
						"user",
				}))
				.filter((x) => Boolean(x.d))
				.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
			for (let i = 1; i < sorted.length; i++) {
				const prev = sorted[i - 1];
				const curr = sorted[i];
				if (!prev || !curr) continue;
				const prevIsCustomer = String(prev.role).toLowerCase() !== "assistant";
				const currIsAssistant = String(curr.role).toLowerCase() === "assistant";
				if (prevIsCustomer && currIsAssistant) {
					const deltaMs = (curr.d as Date).getTime() - (prev.d as Date).getTime();
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
					d: parseMessageDate(m),
					role:
						(m as ConversationMessage & { role?: string; sender?: string; author?: string }).role ||
						(m as ConversationMessage & { role?: string; sender?: string; author?: string }).sender ||
						(m as ConversationMessage & { role?: string; sender?: string; author?: string }).author ||
						"user",
				}))
				.filter((x) => Boolean(x.d))
				.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
			for (let i = 1; i < sorted.length; i++) {
				const prev = sorted[i - 1];
				const curr = sorted[i];
				if (!prev || !curr) continue;
				const prevIsCustomer = String(prev.role).toLowerCase() !== "assistant";
				const currIsAssistant = String(curr.role).toLowerCase() === "assistant";
				if (prevIsCustomer && currIsAssistant) {
					const deltaMs = (curr.d as Date).getTime() - (prev.d as Date).getTime();
					if (deltaMs > 0) diffs.push(deltaMs / 60000);
				}
			}
		});
		return diffs;
	})();

	const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
	const median = (arr: number[]): number => {
		if (arr.length === 0) return 0;
		const s = [...arr].sort((a, b) => a - b);
		const mid = Math.floor(s.length / 2);
		return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
	};

	const avgResponseTime = Math.min(60, avg(responseDurationsMinutes));
	const prevAvgResponseTime = Math.min(60, avg(prevResponseDurationsMinutes));

	const now = new Date();
	const activeUpcomingCustomerIds = new Set<string>();
	reservationEntries.forEach(([id, items]) => {
		const hasUpcoming = (Array.isArray(items) ? items : []).some((r) => {
			const d = parseReservationDate(r);
			return d && d > now && (r as Reservation).cancelled !== true;
		});
		if (hasUpcoming) activeUpcomingCustomerIds.add(id);
	});

	const totalCancellations = filteredReservationEntries.reduce(
		(sum, [, items]) =>
			sum +
			(Array.isArray(items)
				? items.filter((r) => (r as Reservation).cancelled === true).length
				: 0),
		0,
	);
	const prevTotalCancellations = prevReservationEntries.reduce(
		(sum, [, items]) =>
			sum +
			(Array.isArray(items)
				? items.filter((r) => (r as Reservation).cancelled === true).length
				: 0),
		0,
	);

	const computeTrend = (current: number, previous: number, higherIsBetter = true) => {
		if (previous === 0) {
			const percentChange = current > 0 ? 100 : 0;
			const isPositive = higherIsBetter ? current > 0 : current === 0;
			return { percentChange, isPositive };
		}
		const raw = ((current - previous) / Math.abs(previous)) * 100;
		const isPositive = higherIsBetter ? raw >= 0 : raw <= 0;
		return { percentChange: raw, isPositive };
	};

	const prom = prometheusMetrics || {};

	return {
		_isMockData: false,
		stats: {
			totalReservations,
			totalCancellations,
			uniqueCustomers,
			conversionRate,
			returningCustomers,
			returningRate: uniqueCustomers ? (returningCustomers / uniqueCustomers) * 100 : 0,
			avgFollowups,
			avgResponseTime: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
			activeCustomers: activeUpcomingCustomerIds.size,
			trends: {
				totalReservations: computeTrend(totalReservations, prevTotalReservations, true),
				cancellations: computeTrend(totalCancellations, prevTotalCancellations, false),
				avgResponseTime: computeTrend(avgResponseTime, prevAvgResponseTime, false),
				avgFollowups: computeTrend(avgFollowups, prevAvgFollowups, true),
				uniqueCustomers: computeTrend(uniqueCustomers, prevUniqueCustomers, true),
				conversionRate: computeTrend(conversionRate, prevConversionRate, true),
			},
		},
		prometheusMetrics: {
			...(typeof (prom as { process_cpu_percent?: number }).process_cpu_percent === "number" && {
				cpu_percent: (prom as { process_cpu_percent?: number }).process_cpu_percent,
			}),
			...(typeof (prom as { cpu_percent?: number }).cpu_percent === "number" && {
				cpu_percent: (prom as { cpu_percent?: number }).cpu_percent,
			}),
			...(typeof (prom as { process_memory_bytes?: number }).process_memory_bytes === "number" && {
				memory_bytes: (prom as { process_memory_bytes?: number }).process_memory_bytes,
			}),
			...(typeof (prom as { memory_bytes?: number }).memory_bytes === "number" && {
				memory_bytes: (prom as { memory_bytes?: number }).memory_bytes,
			}),
			...(typeof (prom as { reservations_requested_total?: number }).reservations_requested_total ===
				"number" && {
				reservations_requested_total: (prom as {
					reservations_requested_total?: number;
				}).reservations_requested_total,
			}),
			...(typeof (prom as { reservations_successful_total?: number }).reservations_successful_total ===
				"number" && {
				reservations_successful_total: (prom as {
					reservations_successful_total?: number;
				}).reservations_successful_total,
			}),
			...(typeof (prom as { reservations_failed_total?: number }).reservations_failed_total === "number" && {
				reservations_failed_total: (prom as { reservations_failed_total?: number }).reservations_failed_total,
			}),
			...(typeof (prom as { reservations_cancellation_requested_total?: number })
				.reservations_cancellation_requested_total === "number" && {
				reservations_cancellation_requested_total: (prom as {
					reservations_cancellation_requested_total?: number;
				}).reservations_cancellation_requested_total,
			}),
			...(typeof (prom as { reservations_cancellation_successful_total?: number })
				.reservations_cancellation_successful_total === "number" && {
				reservations_cancellation_successful_total: (prom as {
					reservations_cancellation_successful_total?: number;
				}).reservations_cancellation_successful_total,
			}),
			...(typeof (prom as { reservations_cancellation_failed_total?: number })
				.reservations_cancellation_failed_total === "number" && {
				reservations_cancellation_failed_total: (prom as {
					reservations_cancellation_failed_total?: number;
				}).reservations_cancellation_failed_total,
			}),
			...(typeof (prom as { reservations_modification_requested_total?: number })
				.reservations_modification_requested_total === "number" && {
				reservations_modification_requested_total: (prom as {
					reservations_modification_requested_total?: number;
				}).reservations_modification_requested_total,
			}),
			...(typeof (prom as { reservations_modification_successful_total?: number })
				.reservations_modification_successful_total === "number" && {
				reservations_modification_successful_total: (prom as {
					reservations_modification_successful_total?: number;
				}).reservations_modification_successful_total,
			}),
			...(typeof (prom as { reservations_modification_failed_total?: number })
				.reservations_modification_failed_total === "number" && {
				reservations_modification_failed_total: (prom as {
					reservations_modification_failed_total?: number;
				}).reservations_modification_failed_total,
			}),
		},
		dailyTrends: (() => {
			const dailyMap = new Map<string, { reservations: number; cancellations: number; modifications: number }>();
			// count reservations/cancellations within active range
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const key = d.toISOString().slice(0, 10);
					const entry = dailyMap.get(key) || { reservations: 0, cancellations: 0, modifications: 0 };
					entry.reservations += 1;
					if ((r as Reservation).cancelled === true) entry.cancellations += 1;
					dailyMap.set(key, entry);
				});
			});
			// count modifications by modification timestamp within active range
			reservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const mayParse = (v?: string) => {
						if (!v) return null;
						const d = new Date(v);
						return Number.isNaN(d.getTime()) ? null : d;
					};
					const ts =
						mayParse((r as Reservation).updated_at) ||
						mayParse((r as Reservation).modified_at) ||
						mayParse((r as Reservation).last_modified) ||
						mayParse((r as Reservation).modified_on) ||
						mayParse((r as Reservation).update_ts);
					if (!ts || !withinRange(ts)) return;
					const key = ts.toISOString().slice(0, 10);
					const entry = dailyMap.get(key) || { reservations: 0, cancellations: 0, modifications: 0 };
					entry.modifications += 1;
					dailyMap.set(key, entry);
				});
			});
			return Array.from(dailyMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([date, v]) => ({ date, reservations: v.reservations, cancellations: v.cancellations, modifications: v.modifications }));
		})(),
		typeDistribution: (() => {
			let checkup = 0;
			let followup = 0;
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					if (typeof (r as Reservation & { type?: number }).type === "number") {
						if ((r as Reservation & { type?: number }).type === 1) followup += 1;
						else checkup += 1;
					} else {
						const title = ((r as Reservation & { title?: string }).title || "").toString().toLowerCase();
						if (title.includes("follow")) followup += 1;
						else checkup += 1;
					}
				});
			});
			return [
				{ type: 0, label: "Checkup", count: checkup },
				{ type: 1, label: "Followup", count: followup },
			];
		})(),
		timeSlots: (() => {
			const timeSlotMap = new Map<string, number>();
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const hh = d.getHours().toString().padStart(2, "0");
					const mm = d.getMinutes().toString().padStart(2, "0");
					const key = `${hh}:${mm}`;
					timeSlotMap.set(key, (timeSlotMap.get(key) || 0) + 1);
				});
			});
			return Array.from(timeSlotMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([time, count]) => ({ slot: time, time, count, normalized: count, type: "regular" as const, availDays: 0 }));
		})(),
		messageHeatmap: (() => {
			const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
			const heatmapMap = new Map<string, number>();
			filteredConversationEntries.forEach(([, msgs]) => {
				(Array.isArray(msgs) ? msgs : []).forEach((m) => {
					const d = parseMessageDate(m);
					if (!d) return;
					const dayIndex = d.getDay();
					if (dayIndex < 0 || dayIndex >= weekdays.length) return;
					const key = `${weekdays[dayIndex]}_${d.getHours()}`;
					heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
				});
			});
			return Array.from(heatmapMap.entries())
				.map(([k, count]) => {
					const parts = k.split("_");
					if (parts.length !== 2) return null;
					const [weekday, hourStr] = parts;
					const hour = Number(hourStr);
					if (!weekday || Number.isNaN(hour)) return null;
					return { weekday, hour, count };
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);
		})(),
		topCustomers: (() => {
			const map = new Map<string, { messageCount: number; reservationCount: number; lastActivity: string }>();
			uniqueCustomerIds.forEach((id) => {
				const msgs = (filteredConversationEntries.find(([k]) => k === id)?.[1] ?? []) as ConversationMessage[];
				const resv = (filteredReservationEntries.find(([k]) => k === id)?.[1] ?? []) as Reservation[];
				const lastMsg = msgs
					.map((m) => parseMessageDate(m))
					.filter(Boolean)
					.sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
				const lastRes = resv
					.map((r) => parseReservationDate(r))
					.filter(Boolean)
					.sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
				const last = lastMsg && lastRes ? (lastMsg > lastRes ? lastMsg : lastRes) : lastMsg || lastRes;
				map.set(id, {
					messageCount: Array.isArray(msgs) ? msgs.length : 0,
					reservationCount: Array.isArray(resv) ? resv.length : 0,
					lastActivity: last ? last.toISOString().slice(0, 10) : new Date(0).toISOString().slice(0, 10),
				});
			});
			return Array.from(map.entries())
				.map(([wa_id, v]) => ({ wa_id, ...v }))
				.sort((a, b) => b.messageCount - a.messageCount)
				.slice(0, 100);
		})(),
		conversationAnalysis: {
			avgMessageLength:
				totalMessages > 0
					? filteredConversationEntries.reduce(
							(sum, [, msgs]) =>
								sum +
								(Array.isArray(msgs)
									? msgs.reduce(
											(s, m) => s + ((m as ConversationMessage).text || (m as ConversationMessage).message || "").toString().length,
											0,
										)
									: 0),
						0,
					  ) / totalMessages
					: 0,
			avgWordsPerMessage:
				totalMessages > 0
					? filteredConversationEntries.reduce(
							(sum, [, msgs]) =>
								sum +
								(Array.isArray(msgs)
									? msgs.reduce(
											(s, m) =>
												s +
												((m as ConversationMessage).text || (m as ConversationMessage).message || "")
													.toString()
													.trim()
													.split(/\s+/)
													.filter(Boolean).length,
											0,
									  )
									: 0),
						0,
					  ) / totalMessages
					: 0,
			avgMessagesPerCustomer: uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
			totalMessages,
			uniqueCustomers,
			responseTimeStats: {
				avg: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
				median: median(responseDurationsMinutes),
				max: responseDurationsMinutes.length ? Math.max(...responseDurationsMinutes) : 0,
			},
			messageCountDistribution: {
				avg: uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
				median: (() => {
					const counts = filteredConversationEntries.map(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0));
					return median(counts);
				})(),
				max: filteredConversationEntries.length
					? Math.max(...filteredConversationEntries.map(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0)))
					: 0,
			},
		},
		wordFrequency: (() => {
			const words: Record<string, number> = {};
			filteredConversationEntries.forEach(([, msgs]) => {
				(Array.isArray(msgs) ? msgs : []).forEach((m) => {
					const text = ((m as ConversationMessage).text || (m as ConversationMessage).message || "")
						.toString()
						.toLowerCase();
					const tokens = text
						.toLowerCase()
						.replace(/[\d]+/g, " ")
						.replace(/[^\w\s\u0600-\u06FF]/g, " ")
						.split(/\s+/)
						.filter((w: string) => w.length > 2);
					tokens.forEach((t: string) => {
						words[t] = (words[t] || 0) + 1;
					});
				});
			});
			return Object.entries(words)
				.map(([word, count]) => ({ word, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 50);
		})(),
		dayOfWeekData: (() => {
			const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
			const map = new Map<string, { reservations: number; cancellations: number }>();
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const dayIndex = d.getDay();
					if (dayIndex < 0 || dayIndex >= weekdays.length) return;
					const day = weekdays[dayIndex];
					const entry = map.get(day || "") || { reservations: 0, cancellations: 0 };
					entry.reservations += 1;
					if ((r as Reservation).cancelled === true) entry.cancellations += 1;
					map.set(day || "", entry);
				});
			});
			return Array.from(map.entries()).map(([day, v]) => ({
				day,
				reservations: v.reservations,
				cancellations: v.cancellations,
				cancelRate: v.reservations > 0 ? (v.cancellations / v.reservations) * 100 : 0,
			}));
		})(),
		monthlyTrends: (() => {
			const monthMap = new Map<string, { reservations: number; cancellations: number; conversations: number }>();
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
					const entry = monthMap.get(key) || { reservations: 0, cancellations: 0, conversations: 0 };
					entry.reservations += 1;
					if ((r as Reservation).cancelled === true) entry.cancellations += 1;
					monthMap.set(key, entry);
				});
			});
			filteredConversationEntries.forEach(([, msgs]) => {
				(Array.isArray(msgs) ? msgs : []).forEach((m) => {
					const d = parseMessageDate(m);
					if (!d) return;
					const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
					const entry = monthMap.get(key) || { reservations: 0, cancellations: 0, conversations: 0 };
					entry.conversations += 1;
					monthMap.set(key, entry);
				});
			});
			return Array.from(monthMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([key, v]) => {
					const [y, m] = key.split("-").map(Number);
					if (!y || !m || Number.isNaN(y) || Number.isNaN(m)) return null;
					const date = new Date(y, m - 1, 1);
					const isLocalizedFlag = (() => {
						if (typeof window === "undefined") return false;
						try {
							return localStorage.getItem("isLocalized") === "true";
						} catch {
							return false;
						}
					})();
					const month = date.toLocaleString(isLocalizedFlag ? "ar" : "en", { month: "short" });
					return { month, reservations: v.reservations, cancellations: v.cancellations, conversations: v.conversations };
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);
		})(),
		funnelData: [
			{ stage: "Conversations", count: filteredConversationEntries.filter(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0).length },
			{ stage: "Made reservation", count: filteredReservationEntries.filter(([, items]) => (Array.isArray(items) ? items.length : 0) > 0).length },
			{ stage: "Returned for another", count: returningCustomers },
			{ stage: "Cancelled", count: 0 },
		],
		customerSegments: (() => {
			let new1 = 0;
			let returning2to5 = 0;
			let loyal6 = 0;
			filteredReservationEntries.forEach(([, items]) => {
				const len = Array.isArray(items) ? items.length : 0;
				if (len <= 1) new1 += 1;
				else if (len <= 5) returning2to5 += 1;
				else loyal6 += 1;
			});
			return [
				{
					segment: "New (1 visit)",
					count: new1,
					percentage: uniqueCustomers ? (new1 / uniqueCustomers) * 100 : 0,
					avgReservations: new1 ? 1 : 0,
				},
				{
					segment: "Returning (2-5 visits)",
					count: returning2to5,
					percentage: uniqueCustomers ? (returning2to5 / uniqueCustomers) * 100 : 0,
					avgReservations: returning2to5 ? 3 : 0,
				},
				{
					segment: "Loyal (6+ visits)",
					count: loyal6,
					percentage: uniqueCustomers ? (loyal6 / uniqueCustomers) * 100 : 0,
					avgReservations: loyal6 ? 6 : 0,
				},
			];
		})(),
	};
}


