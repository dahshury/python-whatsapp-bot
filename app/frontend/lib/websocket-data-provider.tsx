"use client";
import * as React from "react";
import { BackendConnectionOverlay } from "@/components/backend-connection-overlay";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { callPythonBackend } from "@/lib/backend";
import type { VacationSnapshot } from "@/lib/ws/types";
import type { DashboardData, PrometheusMetrics } from "@/types/dashboard";
import type {
    ConversationMessage as CalendarConversationMessage,
    Reservation as CalendarReservation,
} from "@/types/calendar";

// Unify message/reservation shapes to be compatible with calendar types while
// allowing optional fields that may appear in websocket payloads or REST fallbacks.
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
};
export interface Vacation {
	id: string;
	start: string;
	end: string;
}

interface DataShape {
	// Keyed by waId
	conversations: Record<string, ConversationMessage[]>;
	reservations: Record<string, Reservation[]>;
	vacations: Vacation[];
	prometheusMetrics: PrometheusMetrics;
	// Meta
	isLoading: boolean;
	error: string | null;
	refresh: (range?: { fromDate?: string; toDate?: string }) => Promise<void>;
	activeRange?: { fromDate?: string; toDate?: string };
	sendVacationUpdate?: (payload: {
		periods?: Array<{ start: string | Date; end: string | Date }>;
		start_dates?: string;
		durations?: string;
	}) => Promise<void> | void;
}

const DataContext = React.createContext<DataShape>({
	conversations: {},
	reservations: {},
	vacations: [],
	prometheusMetrics: {},
	isLoading: false,
	error: null,
	refresh: async () => {},
	activeRange: {},
	sendVacationUpdate: async () => {},
});

export const WebSocketDataProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	// Hydrate from cached snapshot to prevent blank UI on refresh
	const loadCached = () => {
		try {
			const raw =
				typeof window !== "undefined"
					? sessionStorage.getItem("ws_snapshot_v1")
					: null;
			if (raw) {
				const parsed = JSON.parse(raw);
				return {
					conversations: (parsed?.conversations || {}) as Record<
						string,
						ConversationMessage[]
					>,
					reservations: (parsed?.reservations || {}) as Record<
						string,
						Reservation[]
					>,
					// Re-enable vacation caching for instant load on refresh
					vacations: (parsed?.vacations || []) as Vacation[],
				};
			}
		} catch {}
		return { conversations: {}, reservations: {}, vacations: [] };
	};

	const cached = loadCached();
	const [conversations, setConversations] = React.useState<
		Record<string, ConversationMessage[]>
	>(cached.conversations);
    const [reservations, setReservations] = React.useState<
        Record<string, Reservation[]>
    >(cached.reservations);
	const [vacations, setVacations] = React.useState<Vacation[]>(
		cached.vacations,
	);
    const [prometheusMetrics, setPrometheusMetrics] =
        React.useState<PrometheusMetrics>({});
	const [isLoading, _setIsLoading] = React.useState<boolean>(false);
	const [error, _setError] = React.useState<string | null>(null);
	const hasLoadedRef = React.useRef<boolean>(false);
	const lastRangeRef = React.useRef<{ fromDate?: string; toDate?: string }>({});
	const [activeRange, setActiveRange] = React.useState<{
		fromDate?: string;
		toDate?: string;
	}>({});

	// Subscribe to backend websocket for realtime updates (disable internal toasts)
	const ws = useWebSocketData({ enableNotifications: false });

	// One-time REST fallback to ensure existing vacation periods are visible before WS snapshot
	React.useEffect(() => {
		let cancelled = false;
		const LOAD_KEY = "vacations_rest_loaded_v1";
		const hasRunRef = { current: false } as { current: boolean };
		try {
			hasRunRef.current =
				(typeof window !== "undefined" &&
					(sessionStorage.getItem(LOAD_KEY) === "true" ||
						(Array.isArray(cached.vacations) &&
							cached.vacations.length > 0))) ||
				false;
		} catch {}

		const loadInitialVacations = async () => {
			try {
				if (hasRunRef.current) return;
				// Small delay to allow WS snapshot; if none, fetch via REST
				await new Promise((r) => setTimeout(r, 350));
				if (cancelled) return;
				// If WS already populated vacations, skip
				try {
					const wsVacSnapshots =
						(ws as { vacations?: VacationSnapshot[] })?.vacations || [];
					if (Array.isArray(wsVacSnapshots) && wsVacSnapshots.length > 0)
						return;
				} catch {}
				const resp = await callPythonBackend<{
					success?: boolean;
					data?: Array<{ start: string; end: string; title?: string }>;
				}>("/vacations");
				if (cancelled) return;
				const list = (resp as unknown as { data?: unknown })?.data;
				if (Array.isArray(list)) {
					const normalized = list
						.filter(
							(p: { start?: unknown; end?: unknown }) => p?.start && p.end,
						)
						.map((p: { start: unknown; end: unknown }, idx: number) => ({
							id: `${String(p.start)}-${String(p.end)}-${idx}`,
							start: String(p.start),
							end: String(p.end),
						})) as Vacation[];
					setVacations(normalized);
				}
				try {
					if (typeof window !== "undefined")
						sessionStorage.setItem(LOAD_KEY, "true");
				} catch {}
				hasRunRef.current = true;
			} catch {}
		};
		loadInitialVacations();
		return () => {
			cancelled = true;
		};
	}, [ws, cached.vacations]);

	// Offline overlay state
	const [showOffline, setShowOffline] = React.useState<boolean>(false);
	const [isRetrying, setIsRetrying] = React.useState<boolean>(false);
	const disconnectedSinceRef = React.useRef<number | null>(null);
	const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	// Show overlay only if truly disconnected for a sustained period and no cached data
	React.useEffect(() => {
		const hasAnyData = (() => {
			try {
				const resv = ws?.reservations || {};
				const conv = ws?.conversations || {};
				const vac = ws?.vacations || [];
				return (
					Object.keys(resv).length > 0 ||
					Object.keys(conv).length > 0 ||
					(Array.isArray(vac) ? vac.length : 0) > 0
				);
			} catch {
				return false;
			}
		})();

		const isConnecting = (() => {
			try {
				const ref = (globalThis as { __wsConnection?: { current?: WebSocket } })
					.__wsConnection;
				return ref?.current?.readyState === WebSocket.CONNECTING;
			} catch {
				return false;
			}
		})();

		if (ws?.isConnected || isConnecting) {
			disconnectedSinceRef.current = null;
			setShowOffline(false);
			return;
		}

		if (disconnectedSinceRef.current == null) {
			disconnectedSinceRef.current = Date.now();
		}
		const elapsed = Date.now() - (disconnectedSinceRef.current || Date.now());
		const thresholdMs = hasAnyData ? 6000 : 2000; // a bit more lenient to avoid flicker during connect
		const t = setTimeout(
			() => {
				const stillDisconnected = !ws?.isConnected;
				if (stillDisconnected) setShowOffline(true);
			},
			Math.max(0, thresholdMs - elapsed),
		);
		return () => clearTimeout(t);
	}, [ws?.isConnected, ws?.reservations, ws?.conversations, ws?.vacations]);

	const handleRetry = React.useCallback(async () => {
		// Prevent parallel retries
		if (isRetrying) return;
		setIsRetrying(true);
		// Clear any previous timeout
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		// Kick a reconnect attempt
		try {
			ws?.connect?.();
		} catch {}
		// Safety timeout to re-enable the button if connection doesn't establish
		retryTimeoutRef.current = setTimeout(() => {
			setIsRetrying(false);
			retryTimeoutRef.current = null;
		}, 2500);
	}, [ws, isRetrying]);

	// Stop the spinner as soon as the websocket reports connected
	React.useEffect(() => {
		if (isRetrying && ws?.isConnected) {
			setIsRetrying(false);
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		}
	}, [isRetrying, ws?.isConnected]);

	// Cleanup on unmount
	React.useEffect(() => {
		return () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		};
	}, []);

	// Mirror websocket state into provider state
	React.useEffect(() => {
		if (ws?.conversations)
			setConversations(
				ws.conversations as Record<string, ConversationMessage[]>,
			);
		// Mark as loaded once we receive any data via websocket
		try {
			if (
				!hasLoadedRef.current &&
				ws &&
				(ws.conversations || ws.reservations || ws.vacations)
			) {
				hasLoadedRef.current = true;
			}
		} catch {}
	}, [ws?.conversations, ws.reservations, ws]);

	React.useEffect(() => {
        if (ws?.reservations)
            setReservations(
                (ws.reservations as unknown) as Record<string, Reservation[]>,
            );
		try {
			if (
				!hasLoadedRef.current &&
				ws &&
				(ws.conversations || ws.reservations || ws.vacations)
			) {
				hasLoadedRef.current = true;
			}
		} catch {}
	}, [ws?.reservations, ws.conversations, ws]);

	React.useEffect(() => {
		if (ws?.vacations) {
			// Convert VacationSnapshot[] to Vacation[] with generated IDs
			const normalized = (ws.vacations as VacationSnapshot[])
				.filter((p) => p?.start && p.end)
				.map((p, idx) => ({
					id: `${String(p.start)}-${String(p.end)}-${idx}`,
					start: String(p.start),
					end: String(p.end),
				})) as Vacation[];
			setVacations(normalized);
		}
		try {
			if (
				!hasLoadedRef.current &&
				ws &&
				(ws.conversations || ws.reservations || ws.vacations)
			) {
				hasLoadedRef.current = true;
			}
		} catch {}
	}, [ws?.vacations, ws.conversations, ws]);

	// Initialize metrics from global if present
	React.useEffect(() => {
		try {
			setPrometheusMetrics(
				(globalThis as { __prom_metrics__?: PrometheusMetrics })
					.__prom_metrics__ || {},
			);
		} catch {}
	}, []);

	// Capture realtime metrics updates from the websocket hook
	React.useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const customEvent = ev as CustomEvent;
				const detail: { type?: string } = customEvent.detail || {};
				if (detail?.type === "metrics_updated" || detail?.type === "snapshot") {
					setPrometheusMetrics(
						(globalThis as { __prom_metrics__?: PrometheusMetrics })
							.__prom_metrics__ || {},
					);
				}
			} catch {}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, []);

	const refresh = React.useCallback(
		async (range?: { fromDate?: string; toDate?: string }) => {
			// Update active range only; no REST calls. Consumers aggregate client-side.
			if (range) {
				lastRangeRef.current = range;
				setActiveRange(range);
			}
			// If needed, request a fresh snapshot from the websocket
			try {
				(ws as { refreshData?: () => void })?.refreshData?.();
			} catch {}
		},
		[ws],
	);

	// Remove unconditional initial REST load; fallback is handled elsewhere

	// Bridge: dispatch fine-grained window events for calendar to update via FullCalendar API
	React.useEffect(() => {
		if (typeof window === "undefined") return;
		const handler = (_e: Event) => {
			// No-op; events are dispatched directly from useWebSocketData
		};
		window.addEventListener("realtime", handler);
		return () => window.removeEventListener("realtime", handler);
	}, []);

	const value = React.useMemo<DataShape>(() => {
		const sendVacationUpdateFn = (
			ws as {
				sendVacationUpdate?: (payload: {
					periods?: Array<{ start: string | Date; end: string | Date }>;
					start_dates?: string;
					durations?: string;
				}) => Promise<void> | void;
			}
		)?.sendVacationUpdate;

		return {
			conversations,
			reservations,
			vacations,
			prometheusMetrics,
			isLoading,
			error,
			refresh,
			activeRange,
			...(sendVacationUpdateFn && { sendVacationUpdate: sendVacationUpdateFn }),
		};
	}, [
		conversations,
		reservations,
		vacations,
		prometheusMetrics,
		isLoading,
		error,
		refresh,
		activeRange,
		ws,
	]);

	return (
		<DataContext.Provider value={value}>
			{children}
			{showOffline && (
				<BackendConnectionOverlay
					onRetry={handleRetry}
					isRetrying={Boolean(
						isRetrying || (ws as { isReconnecting?: boolean })?.isReconnecting,
					)}
				/>
			)}
		</DataContext.Provider>
	);
};

export const useConversationsData = () => {
	const { conversations, isLoading, error, refresh } =
		React.useContext(DataContext);
	return { conversations, isLoading, error, refresh };
};

export const useReservationsData = () => {
	const { reservations, isLoading, error, refresh } =
		React.useContext(DataContext);
	return { reservations, isLoading, error, refresh };
};

export const useVacationsData = () => {
	const { vacations, isLoading, error, refresh, sendVacationUpdate } =
		React.useContext(DataContext);
	return { vacations, isLoading, error, refresh, sendVacationUpdate };
};

export const useDashboardData = () => {
	const {
		conversations,
		reservations,
		isLoading,
		error,
		refresh,
		activeRange,
		prometheusMetrics,
	} = React.useContext(DataContext);

	const dashboardData = React.useMemo<DashboardData | null>(() => {
		try {
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
				const date: string | undefined = (r as Reservation & { date?: string })
					?.date;
				const time: string | undefined =
					(r as Reservation & { time_slot?: string; time?: string })
						?.time_slot ||
					(r as Reservation & { time_slot?: string; time?: string })?.time;
				if (date && time) return parseISO(`${date}T${time}`);
				if (date) return parseISO(`${date}T00:00:00`);
				return null;
			};
			const parseMessageDate = (m: ConversationMessage) => {
				const iso = parseISO(
					m?.ts || (m as ConversationMessage & { datetime?: string })?.datetime,
				);
				if (iso) return iso;
				const date: string | undefined = (
					m as ConversationMessage & { date?: string }
				)?.date;
				const time: string | undefined = (
					m as ConversationMessage & { time?: string }
				)?.time;
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
			const uniqueCustomerIds = new Set<string>([
				...Object.keys(reservations ?? {}),
				...Object.keys(conversations ?? {}),
			]);

			const filteredReservationEntries = reservationEntries.map(
				([id, items]) => [
					id,
					(Array.isArray(items) ? items : []).filter((r) =>
						withinRange(parseReservationDate(r)),
					),
				],
			) as [string, Reservation[]][];
			const filteredConversationEntries = conversationEntries.map(
				([id, msgs]) => [
					id,
					(Array.isArray(msgs) ? msgs : []).filter((m) =>
						withinRange(parseMessageDate(m)),
					),
				],
			) as [string, ConversationMessage[]][];

			// Previous period filtered datasets
			const prevReservationEntries = reservationEntries.map(([id, items]) => [
				id,
				(Array.isArray(items) ? items : []).filter((r) =>
					withinPrevRange(parseReservationDate(r)),
				),
			]) as [string, Reservation[]][];
			const prevConversationEntries = conversationEntries.map(([id, msgs]) => [
				id,
				(Array.isArray(msgs) ? msgs : []).filter((m) =>
					withinPrevRange(parseMessageDate(m)),
				),
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
							d: parseMessageDate(m),
							role:
								(
									m as ConversationMessage & {
										role?: string;
										sender?: string;
										author?: string;
									}
								).role ||
								(
									m as ConversationMessage & {
										role?: string;
										sender?: string;
										author?: string;
									}
								).sender ||
								(
									m as ConversationMessage & {
										role?: string;
										sender?: string;
										author?: string;
									}
								).author ||
								"user",
						}))
						.filter((x) => Boolean(x.d))
						.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
					for (let i = 1; i < sorted.length; i++) {
						const prev = sorted[i - 1];
						const curr = sorted[i];
						if (!prev || !curr) continue;
						// Measure only customer -> assistant transitions
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
							d: parseMessageDate(m),
							role:
								(
									m as ConversationMessage & {
										role?: string;
										sender?: string;
										author?: string;
									}
								).role ||
								(
									m as ConversationMessage & {
										role?: string;
										sender?: string;
										author?: string;
									}
								).sender ||
								(
									m as ConversationMessage & {
										role?: string;
										sender?: string;
										author?: string;
									}
								).author ||
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
			const median = (arr: number[]): number => {
				if (arr.length === 0) return 0;
				const s = [...arr].sort((a, b) => a - b);
				const mid = Math.floor(s.length / 2);
				return s.length % 2
					? (s[mid] ?? 0)
					: ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
			};

			const avgResponseTime = Math.min(60, avg(responseDurationsMinutes));
			const prevAvgResponseTime = Math.min(
				60,
				avg(prevResponseDurationsMinutes),
			);

			// Heuristics to detect modification metadata on a reservation record
			const parseMaybeDateString = (value?: unknown): Date | null => {
				if (typeof value !== "string" || !value) return null;
				const d = new Date(value);
				return Number.isNaN(d.getTime()) ? null : d;
			};
			const getReservationModificationDate = (r: Reservation): Date | null => {
				// Prefer explicit timestamps if present
				const createdAt = parseReservationDate(r);
				let ts: Date | null = null;

				// Try explicit timestamp fields first
				ts =
					parseMaybeDateString(
						(r as Reservation & { updated_at?: string })?.updated_at,
					) ||
					parseMaybeDateString(
						(r as Reservation & { modified_at?: string })?.modified_at,
					) ||
					parseMaybeDateString(
						(r as Reservation & { last_modified?: string })?.last_modified,
					) ||
					parseMaybeDateString(
						(r as Reservation & { modified_on?: string })?.modified_on,
					) ||
					parseMaybeDateString(
						(r as Reservation & { update_ts?: string })?.update_ts,
					);

				// If no explicit timestamp, try history
				if (!ts) {
					const history = (
						r as Reservation & {
							history?: Array<{ ts?: string; timestamp?: string }>;
						}
					)?.history;
					if (history && history.length > 0) {
						const lastEntry = history[history.length - 1];
						ts = parseMaybeDateString(lastEntry?.ts || lastEntry?.timestamp);
					}
				}

				if (!ts) return null;

				// Ignore timestamps that are effectively the same as the creation time
				try {
					if (createdAt) {
						const deltaMs = Math.abs(ts.getTime() - createdAt.getTime());
						if (deltaMs < 60_000) return null; // less than 1 minute difference: treat as creation, not modification
					}
				} catch {}

				return ts;
			};

			const dailyMap = new Map<
				string,
				{ reservations: number; cancellations: number; modifications: number }
			>();
			// 1) Reservations and cancellations are counted from items within the active range
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const key = d.toISOString().slice(0, 10);
					const entry = dailyMap.get(key) || {
						reservations: 0,
						cancellations: 0,
						modifications: 0,
					};
					entry.reservations += 1;
					if ((r as Reservation & { cancelled?: boolean }).cancelled === true)
						entry.cancellations += 1;
					dailyMap.set(key, entry);
				});
			});
			// 2) Modifications are counted by scanning all reservations but only when the modification timestamp falls within the active range
			reservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const modDate = getReservationModificationDate(r);
					if (!modDate) return;
					if (!withinRange(modDate)) return;
					const mKey = modDate.toISOString().slice(0, 10);
					const mEntry = dailyMap.get(mKey) || {
						reservations: 0,
						cancellations: 0,
						modifications: 0,
					};
					mEntry.modifications += 1;
					dailyMap.set(mKey, mEntry);
				});
			});

			const dailyTrends = Array.from(dailyMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([date, v]) => ({
					date,
					reservations: v.reservations,
					cancellations: v.cancellations,
					modifications: v.modifications,
				}));

			const typeDistribution = (() => {
				let checkup = 0;
				let followup = 0;
				filteredReservationEntries.forEach(([, items]) => {
					(Array.isArray(items) ? items : []).forEach((r) => {
						if (
							typeof (r as Reservation & { type?: number }).type === "number"
						) {
							if ((r as Reservation & { type?: number }).type === 1) {
								followup += 1;
							} else {
								checkup += 1;
							}
						} else {
							const title = (
								(r as Reservation & { title?: string }).title || ""
							)
								.toString()
								.toLowerCase();
							if (title.includes("follow")) {
								followup += 1;
							} else {
								checkup += 1;
							}
						}
					});
				});
				return [
					{ type: 0, label: "Checkup", count: checkup },
					{ type: 1, label: "Followup", count: followup },
				];
			})();

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
			const timeSlots = Array.from(timeSlotMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([time, count]) => ({
					slot: time,
					time,
					count,
					normalized: count,
					type: "regular" as const,
					availDays: 0,
				}));

			const weekdays = [
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			] as const;
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
			const messageHeatmap = Array.from(heatmapMap.entries())
				.map(([k, count]) => {
					const parts = k.split("_");
					if (parts.length !== 2) return null;
					const [weekday, hourStr] = parts;
					const hour = Number(hourStr);
					if (!weekday || Number.isNaN(hour)) return null;
					return { weekday, hour, count };
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);

			const topCustomers = (() => {
				const map = new Map<
					string,
					{
						messageCount: number;
						reservationCount: number;
						lastActivity: string;
					}
				>();
				uniqueCustomerIds.forEach((id) => {
					const msgs = (filteredConversationEntries.find(
						([k]) => k === id,
					)?.[1] ?? []) as ConversationMessage[];
					const resv = (filteredReservationEntries.find(
						([k]) => k === id,
					)?.[1] ?? []) as Reservation[];
					const lastMsg = msgs
						.map((m) => parseMessageDate(m))
						.filter(Boolean)
						.sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
						| Date
						| undefined;
					const lastRes = resv
						.map((r) => parseReservationDate(r))
						.filter(Boolean)
						.sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
						| Date
						| undefined;
					const last =
						lastMsg && lastRes
							? lastMsg > lastRes
								? lastMsg
								: lastRes
							: lastMsg || lastRes;
					map.set(id, {
						messageCount: Array.isArray(msgs) ? msgs.length : 0,
						reservationCount: Array.isArray(resv) ? resv.length : 0,
						lastActivity: last
							? last.toISOString().slice(0, 10)
							: new Date(0).toISOString().slice(0, 10),
					});
				});
				return Array.from(map.entries())
					.map(([wa_id, v]) => ({ wa_id, ...v }))
					.sort((a, b) => b.messageCount - a.messageCount)
					.slice(0, 100);
			})();

			const words: Record<string, number> = {};
			filteredConversationEntries.forEach(([, msgs]) => {
				(Array.isArray(msgs) ? msgs : []).forEach((m) => {
					const text = (
						(m as ConversationMessage & { text?: string; message?: string })
							.text ||
						(m as ConversationMessage & { text?: string; message?: string })
							.message ||
						""
					)
						.toString()
						.toLowerCase();
					const tokens = text
						.toLowerCase()
						.replace(/[\d]+/g, " ")
						.replace(/[^\w\s\u0600-\u06FF]/g, " ")
						.split(/\s+/)
						.filter((w: string) => w.length > 2);
					tokens.forEach((t: string) => {
						(words as Record<string, number>)[t] =
							((words as Record<string, number>)[t] || 0) + 1;
					});
				});
			});
			const wordFrequency = Object.entries(words)
				.map(([word, count]) => ({ word, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 50);

			const dayOfWeekMap = new Map<
				string,
				{ reservations: number; cancellations: number }
			>();
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const dayIndex = d.getDay();
					if (dayIndex < 0 || dayIndex >= weekdays.length) return;
					const day = weekdays[dayIndex];
					const entry = dayOfWeekMap.get(day || "") || {
						reservations: 0,
						cancellations: 0,
					};
					entry.reservations += 1;
					if ((r as Reservation & { cancelled?: boolean }).cancelled === true)
						entry.cancellations += 1;
					dayOfWeekMap.set(day || "", entry);
				});
			});
			const dayOfWeekData = Array.from(dayOfWeekMap.entries()).map(
				([day, v]) => ({
					day,
					reservations: v.reservations,
					cancellations: v.cancellations,
					cancelRate:
						v.reservations > 0 ? (v.cancellations / v.reservations) * 100 : 0,
				}),
			);

			const monthMap = new Map<
				string,
				{ reservations: number; cancellations: number; conversations: number }
			>();
			filteredReservationEntries.forEach(([, items]) => {
				(Array.isArray(items) ? items : []).forEach((r) => {
					const d = parseReservationDate(r);
					if (!d) return;
					const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
					const entry = monthMap.get(key) || {
						reservations: 0,
						cancellations: 0,
						conversations: 0,
					};
					entry.reservations += 1;
					if ((r as Reservation & { cancelled?: boolean }).cancelled === true)
						entry.cancellations += 1;
					monthMap.set(key, entry);
				});
			});
			filteredConversationEntries.forEach(([, msgs]) => {
				(Array.isArray(msgs) ? msgs : []).forEach((m) => {
					const d = parseMessageDate(m);
					if (!d) return;
					const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
					const entry = monthMap.get(key) || {
						reservations: 0,
						cancellations: 0,
						conversations: 0,
					};
					entry.conversations += 1;
					monthMap.set(key, entry);
				});
			});
			const monthlyTrends = Array.from(monthMap.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([key, v]) => {
					const [y, m] = key.split("-").map(Number);
					if (!y || !m || Number.isNaN(y) || Number.isNaN(m)) {
						return null;
					}
					const date = new Date(y, m - 1, 1);
					const isLocalizedFlag = (() => {
						if (typeof window === "undefined") return false;
						try {
							return localStorage.getItem("isLocalized") === "true";
						} catch {
							return false;
						}
					})();
					const month = date.toLocaleString(isLocalizedFlag ? "ar" : "en", {
						month: "short",
					});
					return {
						month,
						reservations: v.reservations,
						cancellations: v.cancellations,
						conversations: v.conversations,
					};
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);

			const prom = prometheusMetrics || {};

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
									(r as Reservation & { cancelled?: boolean }).cancelled ===
									true,
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
									(r as Reservation & { cancelled?: boolean }).cancelled ===
									true,
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
					const isPositive = higherIsBetter ? current > 0 : current === 0; // if lower better and current>0 vs 0 prev => not positive
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
					avgResponseTime: Number.isFinite(avgResponseTime)
						? avgResponseTime
						: 0,
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
					...(typeof prom.process_cpu_percent === "number" && {
						cpu_percent: prom.process_cpu_percent,
					}),
					...(typeof prom.cpu_percent === "number" && {
						cpu_percent: prom.cpu_percent,
					}),
					...(typeof prom.process_memory_bytes === "number" && {
						memory_bytes: prom.process_memory_bytes,
					}),
					...(typeof prom.memory_bytes === "number" && {
						memory_bytes: prom.memory_bytes,
					}),
					...(typeof prom.reservations_requested_total === "number" && {
						reservations_requested_total: prom.reservations_requested_total,
					}),
					...(typeof prom.reservations_successful_total === "number" && {
						reservations_successful_total: prom.reservations_successful_total,
					}),
					...(typeof prom.reservations_failed_total === "number" && {
						reservations_failed_total: prom.reservations_failed_total,
					}),
					...(typeof prom.reservations_cancellation_requested_total ===
						"number" && {
						reservations_cancellation_requested_total:
							prom.reservations_cancellation_requested_total,
					}),
					...(typeof prom.reservations_cancellation_successful_total ===
						"number" && {
						reservations_cancellation_successful_total:
							prom.reservations_cancellation_successful_total,
					}),
					...(typeof prom.reservations_cancellation_failed_total ===
						"number" && {
						reservations_cancellation_failed_total:
							prom.reservations_cancellation_failed_total,
					}),
					...(typeof prom.reservations_modification_requested_total ===
						"number" && {
						reservations_modification_requested_total:
							prom.reservations_modification_requested_total,
					}),
					...(typeof prom.reservations_modification_successful_total ===
						"number" && {
						reservations_modification_successful_total:
							prom.reservations_modification_successful_total,
					}),
					...(typeof prom.reservations_modification_failed_total ===
						"number" && {
						reservations_modification_failed_total:
							prom.reservations_modification_failed_total,
					}),
				} as PrometheusMetrics,
				dailyTrends,
				typeDistribution,
				timeSlots,
				messageHeatmap,
				topCustomers,
				conversationAnalysis: {
					avgMessageLength:
						totalMessages > 0
							? filteredConversationEntries.reduce(
									(sum, [, msgs]) =>
										sum +
										(Array.isArray(msgs)
											? msgs.reduce(
													(s, m) =>
														s +
														(
															(
																m as ConversationMessage & {
																	text?: string;
																	message?: string;
																}
															).text ||
															(
																m as ConversationMessage & {
																	text?: string;
																	message?: string;
																}
															).message ||
															""
														).toString().length,
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
														(
															(
																m as ConversationMessage & {
																	text?: string;
																	message?: string;
																}
															).text ||
															(
																m as ConversationMessage & {
																	text?: string;
																	message?: string;
																}
															).message ||
															""
														)
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
					avgMessagesPerCustomer:
						uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
					totalMessages,
					uniqueCustomers,
					responseTimeStats: {
						avg: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
						median: median(responseDurationsMinutes),
						max: responseDurationsMinutes.length
							? Math.max(...responseDurationsMinutes)
							: 0,
					},
					messageCountDistribution: {
						avg: uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
						median: (() => {
							const counts = filteredConversationEntries.map(([, msgs]) =>
								Array.isArray(msgs) ? msgs.length : 0,
							);
							return median(counts);
						})(),
						max: filteredConversationEntries.length
							? Math.max(
									...filteredConversationEntries.map(([, msgs]) =>
										Array.isArray(msgs) ? msgs.length : 0,
									),
								)
							: 0,
					},
				},
				wordFrequency,
				dayOfWeekData,
				monthlyTrends,
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
							percentage: uniqueCustomers
								? (returning2to5 / uniqueCustomers) * 100
								: 0,
							avgReservations: returning2to5 ? 3 : 0,
						},
						{
							segment: "Loyal (6+ visits)",
							count: loyal6,
							percentage: uniqueCustomers
								? (loyal6 / uniqueCustomers) * 100
								: 0,
							avgReservations: loyal6 ? 6 : 0,
						},
					];
				})(),
			};

			return dashboard;
		} catch (e) {
			console.error("Failed to compute dashboard data:", e);
			return null;
		}
	}, [conversations, reservations, activeRange, prometheusMetrics]);

	return { dashboardData, isLoading, error, refresh };
};
