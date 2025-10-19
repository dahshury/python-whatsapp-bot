"use client";
import type {
	DashboardData,
	PrometheusMetrics,
} from "@features/dashboard/types";
// (dashboard types no longer used)
// conversationQueryKey used by actions; not needed directly here
import { mergeConversationMessagesIntoInfiniteCache } from "@shared/libs/query/query-infinite-merge";
import { queryKeys } from "@shared/libs/query/query-keys";
import { bindOnlineManager } from "@shared/libs/query/query-online-manager";
import { invalidateGlobalData } from "@shared/libs/query/query-prefetch";
// Store actions
import {
	loadConversationMessages as loadConvAction,
	refreshRange as refreshRangeAction,
} from "@shared/libs/store/websocket.actions";
import { useWsStore } from "@shared/libs/store/ws-store";
import { computeRangeKey } from "@shared/libs/ws/range-utils";
import type { VacationSnapshot } from "@shared/libs/ws/types";
import { useWebSocketData } from "@shared/libs/ws/use-websocket-data";
import {
	notifyManager,
	onlineManager,
	useQueryClient,
} from "@tanstack/react-query";
import {
	type FC,
	type PropsWithChildren,
	useCallback,
	useEffect,
	useRef,
} from "react";
// import { callPythonBackend } from "@shared/libs/backend";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";

// Local time helpers moved to shared utils

// DataContext is now defined in data-context.tsx

// Local helpers removed; handled via actions

function areConversationMapsDifferent(
	prev: Record<string, ConversationMessage[]>,
	next: Record<string, ConversationMessage[]>
): boolean {
	const prevKeys = Object.keys(prev || {});
	const nextKeys = Object.keys(next || {});
	if (prevKeys.length !== nextKeys.length) {
		return true;
	}
	for (const k of nextKeys) {
		const a = prev[k] || [];
		const b = next[k] || [];
		if (a.length !== b.length) {
			return true;
		}
		const a0 = (a.at?.(0) as { date?: string } | undefined)?.date || "";
		const b0 = (b.at?.(0) as { date?: string } | undefined)?.date || "";
		const a1 = (a.at?.(-1) as { date?: string } | undefined)?.date || "";
		const b1 = (b.at?.(-1) as { date?: string } | undefined)?.date || "";
		if (a0 !== b0 || a1 !== b1) {
			return true;
		}
	}
	return false;
}

function syncConversationsToStoreAndCache(
	prev: Record<string, ConversationMessage[]>,
	next: Record<string, ConversationMessage[]>,
	setConversations: (map: Record<string, ConversationMessage[]>) => void,
	queryClient: ReturnType<typeof useQueryClient>
): void {
	if (areConversationMapsDifferent(prev, next)) {
		setConversations(next);
	}
	try {
		queryClient.setQueriesData({ queryKey: ["conversations"] }, () => ({
			data: next,
		}));
		for (const [waId, messages] of Object.entries(next)) {
			if (Array.isArray(messages) && messages.length > 0) {
				mergeConversationMessagesIntoInfiniteCache(queryClient, waId, messages);
			}
		}
	} catch {
		// ignore cache update errors
	}
}

export const WebSocketDataProvider: FC<PropsWithChildren> = ({ children }) => {
	// Zustand store actions/selectors
	const setConversations = useWsStore((s) => s.setConversations);
	const setReservations = useWsStore((s) => s.setReservations);
	const setVacations = useWsStore((s) => s.setVacations);
	const setMetrics = useWsStore((s) => s.setMetrics);
	const setActiveRange = useWsStore((s) => s.setActiveRange);
	const setRefresh = useWsStore((s) => s.setRefresh);
	const setLoadConversationMessages = useWsStore(
		(s) => s.setLoadConversationMessages
	);
	const setSendVacationUpdate = useWsStore((s) => s.setSendVacationUpdate);

	// Selectors retained if needed by future bridge logic
	// Selectors can be added when needed by bridge logic
	const hasLoadedRef = useRef<boolean>(false);
	const lastRangeRef = useRef<{ fromDate?: string; toDate?: string }>({});

	// Subscribe to backend websocket for realtime updates (disable internal toasts)
	const ws = useWebSocketData({ enableNotifications: false });
	const queryClient = useQueryClient();
	const pendingLoadsRef = useRef<Set<string>>(new Set());

	// Keep React Query online state in sync with WS + browser online/offline
	useEffect(() => {
		bindOnlineManager(() => {
			const browserOnline =
				typeof navigator !== "undefined" ? navigator.onLine : true;
			// Treat the app as online based on browser network status; don't gate on WS
			return browserOnline;
		});
	}, []);

	// Reflect WebSocket connectivity into React Query online state on change
	useEffect(() => {
		try {
			const browserOnline =
				typeof navigator !== "undefined" ? navigator.onLine : true;
			onlineManager.setOnline(browserOnline);
		} catch {
			// Ignore connectivity sync errors
		}
	}, []);

	// Keep vacations in sync from websocket snapshots only
	useEffect(() => {
		const wsVacSnapshots =
			(ws as { vacations?: VacationSnapshot[] })?.vacations || [];
		if (Array.isArray(wsVacSnapshots) && wsVacSnapshots.length > 0) {
			const normalized = wsVacSnapshots
				.filter((p) => p?.start && p.end)
				.map((p, idx) => ({
					id: `${String(p.start)}-${String(p.end)}-${idx}`,
					start: String(p.start),
					end: String(p.end),
				})) as Vacation[];
			// Batch state + cache updates to minimize renders
			notifyManager.batch(() => {
				setVacations(normalized);
				queryClient.setQueryData(queryKeys.vacations.all, { data: normalized });
			});
		}
	}, [ws?.vacations, ws, queryClient, setVacations]);

	// Offline overlay handling moved to BackendConnectionOverlayBridge

	// Mirror websocket state into provider state and update Query cache
	useEffect(() => {
		if (ws?.conversations) {
			notifyManager.batch(() => {
				const convData = ws.conversations as Record<
					string,
					ConversationMessage[]
				>;
				const prev = useWsStore.getState().conversations as Record<
					string,
					ConversationMessage[]
				>;
				syncConversationsToStoreAndCache(
					prev,
					convData,
					setConversations,
					queryClient
				);
			});
		}
		// Mark as loaded once we receive any data via websocket
		try {
			if (
				!hasLoadedRef.current &&
				(ws?.conversations || ws?.reservations || ws?.vacations)
			) {
				hasLoadedRef.current = true;
			}
		} catch (_error) {
			// Silently ignore state check errors
		}
	}, [
		ws?.conversations,
		ws?.reservations,
		ws?.vacations,
		queryClient,
		setConversations,
	]);

	useEffect(() => {
		if (ws?.reservations) {
			notifyManager.batch(() => {
				setReservations(
					ws.reservations as unknown as Record<string, Reservation[]>
				);
				try {
					queryClient.setQueriesData({ queryKey: ["reservations"] }, () => ({
						data: ws.reservations as unknown as Record<string, Reservation[]>,
					}));
				} catch {
					// ignore cache update errors
				}
			});
		}
		try {
			if (
				!hasLoadedRef.current &&
				(ws?.conversations || ws?.reservations || ws?.vacations)
			) {
				hasLoadedRef.current = true;
			}
		} catch (_error) {
			// Silently ignore state check errors
		}
	}, [
		ws?.reservations,
		ws?.conversations,
		ws?.vacations,
		queryClient,
		setReservations,
	]);

	// hasLoaded flag
	useEffect(() => {
		try {
			if (
				!hasLoadedRef.current &&
				(ws?.conversations || ws?.reservations || ws?.vacations)
			) {
				hasLoadedRef.current = true;
			}
		} catch (_error) {
			// Silently ignore state check errors
		}
	}, [ws?.vacations, ws?.conversations, ws?.reservations]);

	// Initialize metrics from global if present
	useEffect(() => {
		try {
			setMetrics(
				(globalThis as { __prom_metrics__?: PrometheusMetrics })
					.__prom_metrics__ || {}
			);
		} catch (_error) {
			// Silently ignore metrics initialization errors
		}
	}, [setMetrics]);

	// Capture realtime metrics updates from the websocket hook
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const customEvent = ev as CustomEvent;
				const detail: { type?: string } = customEvent.detail || {};
				if (detail?.type === "metrics_updated") {
					setMetrics(
						(globalThis as { __prom_metrics__?: PrometheusMetrics })
							.__prom_metrics__ || {}
					);
				}
			} catch (_error) {
				// Silently ignore event handler errors
			}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, [setMetrics]);

	// Expose sendVacationUpdate via the store for consumers
	useEffect(() => {
		const fn = (
			ws as {
				sendVacationUpdate?: (payload: {
					periods?: Array<{ start: string | Date; end: string | Date }>;
					start_dates?: string;
					durations?: string;
				}) => Promise<void> | void;
			}
		)?.sendVacationUpdate;
		setSendVacationUpdate(fn);
	}, [ws, setSendVacationUpdate]);

	const lastRefreshKeyRef = useRef<string>("");
	const targetRangeKeyRef = useRef<string>("");
	const pendingRangeFetches = useRef<Promise<void>[]>([]);

	// Generate neighbor ranges for prefetch
	// Prefetch moved to actions

	// Helper: build API promises for a range
	// Range fetching moved to actions

	// (kept inline usage below to reduce dependencies noise)

	// Prefetch helper moved to actions; no local usage here

	// Helper: apply range results to state + cache and optionally prefetch neighbors
	// Range application moved to actions

	// conversationQueryKey moved to shared libs

	// Range fetch moved to actions

	const refresh = useCallback(
		async (range?: {
			fromDate?: string;
			toDate?: string;
			includeConversations?: boolean;
		}): Promise<void> => {
			const key = computeRangeKey(range);
			if (lastRefreshKeyRef.current === key) {
				return;
			}
			lastRefreshKeyRef.current = key;

			if (range) {
				lastRangeRef.current = range;
				setActiveRange(range);
				targetRangeKeyRef.current = key;
			}

			// Queue this fetch; ensure sequential completion even on rapid nav
			const job = refreshRangeAction(range, queryClient);
			pendingRangeFetches.current.push(job);
			try {
				await job;
			} finally {
				// Trim finished jobs
				pendingRangeFetches.current = pendingRangeFetches.current.filter(
					(p) => p !== job
				);
			}

			if (!range) {
				// Kick React Query to refetch global datasets when a manual refresh is requested
				try {
					invalidateGlobalData(queryClient);
				} catch {
					// ignore
				}
			}
		},
		[queryClient, setActiveRange]
	);

	// Inject refresh into store
	useEffect(() => {
		setRefresh(refresh);
	}, [refresh, setRefresh]);

	// Remove unconditional initial REST load; fallback is handled elsewhere

	// Bridge: dispatch fine-grained window events for calendar to update via FullCalendar API
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const handler = (_e: Event) => {
			// No-op; events are dispatched directly from useWebSocketData
		};
		window.addEventListener("realtime", handler);
		return () => window.removeEventListener("realtime", handler);
	}, []);

	// Conversation loader handled in action; keep local helper for potential future use

	// Expose loader via store with de-duplication guard
	useEffect(() => {
		setLoadConversationMessages(async (waId, range) => {
			const key = `${waId}|${range?.fromDate ?? ""}|${range?.toDate ?? ""}|${typeof range?.limit === "number" ? range?.limit : ""}`;
			if (pendingLoadsRef.current.has(key)) {
				return;
			}
			pendingLoadsRef.current.add(key);
			try {
				await loadConvAction(waId, range, queryClient);
			} finally {
				pendingLoadsRef.current.delete(key);
			}
		});
	}, [queryClient, setLoadConversationMessages]);

	// No longer exporting context value; keep minimal local derivations only if needed later

	return <>{children}</>;
};

export const useConversationsData = () => {
	const conversations = useWsStore((s) => s.conversations);
	const isLoading = useWsStore((s) => s.isLoading);
	const error = useWsStore((s) => s.error);
	const refresh = useWsStore((s) => s.refresh);
	const loadConversationMessages = useWsStore(
		(s) => s.loadConversationMessages
	);
	return { conversations, isLoading, error, refresh, loadConversationMessages };
};

export const useReservationsData = () => {
	const reservations = useWsStore((s) => s.reservations);
	const isLoading = useWsStore((s) => s.isLoading);
	const error = useWsStore((s) => s.error);
	const refresh = useWsStore((s) => s.refresh);
	return { reservations, isLoading, error, refresh };
};

export const useVacationsData = () => {
	const vacations = useWsStore((s) => s.vacations);
	const isLoading = useWsStore((s) => s.isLoading);
	const error = useWsStore((s) => s.error);
	const refresh = useWsStore((s) => s.refresh);
	const sendVacationUpdate = useWsStore((s) => s.sendVacationUpdate);
	return { vacations, isLoading, error, refresh, sendVacationUpdate };
};

export const useDashboardData = () => {
	const prometheusMetrics = useWsStore((s) => s.prometheusMetrics);
	const isLoading = useWsStore((s) => s.isLoading);
	const error = useWsStore((s) => s.error);
	const refresh = useWsStore((s) => s.refresh);

	// Aggregate dashboard data from WebSocket store
	const dashboardData: DashboardData = {
		stats: {
			totalReservations: 0,
			totalCancellations: 0,
			uniqueCustomers: 0,
			conversionRate: 0,
			returningCustomers: 0,
			returningRate: 0,
			avgFollowups: 0,
			avgResponseTime: 0,
			activeCustomers: 0,
		},
		prometheusMetrics: prometheusMetrics as Record<string, unknown>,
		dailyTrends: [],
		typeDistribution: [],
		timeSlots: [],
		messageHeatmap: [],
		topCustomers: [],
		conversationAnalysis: {
			avgMessageLength: 0,
			avgWordsPerMessage: 0,
			avgMessagesPerCustomer: 0,
			totalMessages: 0,
			uniqueCustomers: 0,
			responseTimeStats: {
				avg: 0,
				median: 0,
				max: 0,
			},
			messageCountDistribution: {
				avg: 0,
				median: 0,
				max: 0,
			},
		},
		wordFrequency: [],
		dayOfWeekData: [],
		monthlyTrends: [],
		funnelData: [],
		customerSegments: [],
	};

	return { dashboardData, isLoading, error, refresh };
};

// Dashboard aggregation moved elsewhere; use widgets/features for computed views
