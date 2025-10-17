"use client";
import type {
	DashboardData,
	PrometheusMetrics,
} from "@features/dashboard/types";
import { DataContext } from "@shared/libs/data/data-context";
import { useOfflineOverlay } from "@shared/libs/ws/use-offline-overlay";
import { useWebSocketData } from "@shared/libs/ws/use-websocket-data";
import { BackendConnectionOverlay } from "@shared/ui/backend-connection-overlay";
import {
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
// import { callPythonBackend } from "@shared/libs/backend";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";
import { computeFullDashboardData } from "@/features/dashboard/compute";
import type { VacationSnapshot } from "@/shared/libs/ws/types";

// DataContext is now defined in data-context.tsx

export const WebSocketDataProvider: FC<PropsWithChildren> = ({ children }) => {
	// Local mirrors of websocket state
	const [conversations, setConversations] = useState<
		Record<string, ConversationMessage[]>
	>({});
	const [reservations, setReservations] = useState<
		Record<string, Reservation[]>
	>({});
	const [vacations, setVacations] = useState<Vacation[]>([]);
	const [prometheusMetrics, setPrometheusMetrics] = useState<PrometheusMetrics>(
		{}
	);
	const [isLoading, _setIsLoading] = useState<boolean>(false);
	const [error, _setError] = useState<string | null>(null);
	const hasLoadedRef = useRef<boolean>(false);
	const lastRangeRef = useRef<{ fromDate?: string; toDate?: string }>({});
	const [activeRange, setActiveRange] = useState<{
		fromDate?: string;
		toDate?: string;
	}>({});

	// Subscribe to backend websocket for realtime updates (disable internal toasts)
	const ws = useWebSocketData({ enableNotifications: false });

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
			setVacations(normalized);
		}
	}, [ws?.vacations, ws]);

	// Offline overlay state (extracted to a dedicated hook)
	const { showOffline, isRetrying, handleRetry } = useOfflineOverlay(
		ws as unknown as ReturnType<typeof useWebSocketData>
	);

	// Mirror websocket state into provider state
	useEffect(() => {
		if (ws?.conversations) {
			setConversations(
				ws.conversations as Record<string, ConversationMessage[]>
			);
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
	}, [ws?.conversations, ws?.reservations, ws?.vacations]);

	useEffect(() => {
		if (ws?.reservations) {
			setReservations(
				ws.reservations as unknown as Record<string, Reservation[]>
			);
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
	}, [ws?.reservations, ws?.conversations, ws?.vacations]);

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
			setPrometheusMetrics(
				(globalThis as { __prom_metrics__?: PrometheusMetrics })
					.__prom_metrics__ || {}
			);
		} catch (_error) {
			// Silently ignore metrics initialization errors
		}
	}, []);

	// Capture realtime metrics updates from the websocket hook
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const customEvent = ev as CustomEvent;
				const detail: { type?: string } = customEvent.detail || {};
				if (detail?.type === "metrics_updated" || detail?.type === "snapshot") {
					setPrometheusMetrics(
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
	}, []);

	const refresh = useCallback(
		(range?: { fromDate?: string; toDate?: string }): Promise<void> => {
			// Update active range only; no REST calls. Consumers aggregate client-side.
			if (range) {
				lastRangeRef.current = range;
				setActiveRange(range);
			}
			// If needed, request a fresh snapshot from the websocket
			try {
				(ws as { refreshData?: () => void })?.refreshData?.();
			} catch (_error) {
				// Silently ignore refresh errors
			}
			return Promise.resolve();
		},
		[ws]
	);

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

	const value = useMemo(() => {
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
					isRetrying={Boolean(
						isRetrying || (ws as { isReconnecting?: boolean })?.isReconnecting
					)}
					onRetry={handleRetry}
				/>
			)}
		</DataContext.Provider>
	);
};

export const useConversationsData = () => {
	const { conversations, isLoading, error, refresh } = useContext(DataContext);
	return { conversations, isLoading, error, refresh };
};

export const useReservationsData = () => {
	const { reservations, isLoading, error, refresh } = useContext(DataContext);
	return { reservations, isLoading, error, refresh };
};

export const useVacationsData = () => {
	const { vacations, isLoading, error, refresh, sendVacationUpdate } =
		useContext(DataContext);
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
	} = useContext(DataContext);

	const dashboardData = useMemo<DashboardData | null>(() => {
		try {
			return computeFullDashboardData(
				conversations as Record<string, ConversationMessage[]>,
				reservations as Record<string, Reservation[]>,
				activeRange,
				prometheusMetrics
			);
		} catch (_e) {
			return null;
		}
	}, [conversations, reservations, activeRange, prometheusMetrics]);

	return { dashboardData, isLoading, error, refresh };
};
