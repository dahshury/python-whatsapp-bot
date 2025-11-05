"use client";
import { DataContext } from "@shared/libs/data/data-context";
// import { callPythonBackend } from "@shared/libs/backend";
import { useOfflineOverlay } from "@shared/libs/ws/use-offline-overlay";
import { useWebSocketData } from "@shared/libs/ws/use-websocket-data";
import { BackendConnectionOverlay } from "@shared/ui/backend-connection-overlay";
import React from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";
import { buildDashboardData } from "@/features/dashboard/model/build";
import type {
  DashboardConversationMessage,
  DashboardData,
  DashboardReservation,
  PrometheusMetrics,
} from "@/features/dashboard/types";
import type { VacationSnapshot } from "@/shared/libs/ws/types";

// DataContext is now defined in data-context.tsx

export const WebSocketDataProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  // Local mirrors of websocket state
  const [conversations, setConversations] = React.useState<
    Record<string, ConversationMessage[]>
  >({});
  const [reservations, setReservations] = React.useState<
    Record<string, Reservation[]>
  >({});
  const [vacations, setVacations] = React.useState<Vacation[]>([]);
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

  // Extract specific properties to avoid unnecessary re-renders from ws object reference changes
  // Direct extraction allows React to do reference equality checks on the actual values
  const wsConversations = ws?.conversations;
  const wsReservations = ws?.reservations;
  const wsVacations = ws?.vacations;
  const wsRefreshData = (ws as { refreshData?: () => void })?.refreshData;
  const wsSendVacationUpdate = (
    ws as {
      sendVacationUpdate?: (payload: {
        periods?: Array<{ start: string | Date; end: string | Date }>;
        start_dates?: string;
        durations?: string;
      }) => Promise<void> | void;
    }
  )?.sendVacationUpdate;

  // Offline overlay state (extracted to a dedicated hook)
  const { showOffline, isRetrying, handleRetry } = useOfflineOverlay(
    ws as unknown as ReturnType<typeof useWebSocketData>
  );

  // Keep vacations in sync from websocket snapshots only
  React.useEffect(() => {
    const wsVacSnapshots =
      (wsVacations as VacationSnapshot[] | undefined) || [];
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
  }, [wsVacations]);

  // Mirror websocket conversations into provider state
  React.useEffect(() => {
    if (wsConversations) {
      setConversations(
        wsConversations as Record<string, ConversationMessage[]>
      );
    }
    if (
      !hasLoadedRef.current &&
      (wsConversations || wsReservations || wsVacations)
    ) {
      hasLoadedRef.current = true;
    }
  }, [wsConversations, wsReservations, wsVacations]);

  // Mirror websocket reservations into provider state
  React.useEffect(() => {
    if (wsReservations) {
      setReservations(
        wsReservations as unknown as Record<string, Reservation[]>
      );
    }
    if (
      !hasLoadedRef.current &&
      (wsConversations || wsReservations || wsVacations)
    ) {
      hasLoadedRef.current = true;
    }
  }, [wsReservations, wsConversations, wsVacations]);

  // Initialize metrics from global if present
  React.useEffect(() => {
    setPrometheusMetrics(
      (globalThis as { __prom_metrics__?: PrometheusMetrics })
        .__prom_metrics__ || {}
    );
  }, []);

  // Capture realtime metrics updates from the websocket hook
  React.useEffect(() => {
    const handler = (ev: Event) => {
      const customEvent = ev as CustomEvent;
      const detail: { type?: string } = customEvent.detail || {};
      if (detail?.type === "metrics_updated" || detail?.type === "snapshot") {
        setPrometheusMetrics(
          (globalThis as { __prom_metrics__?: PrometheusMetrics })
            .__prom_metrics__ || {}
        );
      }
    };
    window.addEventListener("realtime", handler as EventListener);
    return () =>
      window.removeEventListener("realtime", handler as EventListener);
  }, []);

  const refresh = React.useCallback(
    async (range?: { fromDate?: string; toDate?: string }) => {
      await Promise.resolve();
      // Update active range only; no REST calls. Consumers aggregate client-side.
      if (range) {
        lastRangeRef.current = range;
        setActiveRange(range);
      }
      // If needed, request a fresh snapshot from the websocket
      wsRefreshData?.();
    },
    [wsRefreshData]
  );

  // Remove unconditional initial REST load; fallback is handled elsewhere

  // Bridge: dispatch fine-grained window events for calendar to update via FullCalendar API
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (_e: Event) => {
      /* no-op */
    };
    window.addEventListener("realtime", handler);
    return () => window.removeEventListener("realtime", handler);
  }, []);

  const value = React.useMemo(
    () => ({
      conversations,
      reservations,
      vacations,
      prometheusMetrics,
      isLoading,
      error,
      refresh,
      activeRange,
      ...(wsSendVacationUpdate && { sendVacationUpdate: wsSendVacationUpdate }),
    }),
    [
      conversations,
      reservations,
      vacations,
      prometheusMetrics,
      isLoading,
      error,
      refresh,
      activeRange,
      wsSendVacationUpdate,
    ]
  );

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
      return buildDashboardData(
        conversations as unknown as Record<
          string,
          DashboardConversationMessage[]
        >,
        reservations as unknown as Record<string, DashboardReservation[]>,
        { activeRange, prometheusMetrics }
      );
    } catch {
      return null;
    }
  }, [conversations, reservations, activeRange, prometheusMetrics]);

  return { dashboardData, isLoading, error, refresh };
};
