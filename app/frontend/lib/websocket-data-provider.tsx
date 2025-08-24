"use client";
import * as React from "react";
import type { DashboardData } from "@/types/dashboard";
import {
  fetchConversations,
  fetchReservations,
  fetchVacations,
} from "@/lib/api";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { BackendConnectionOverlay } from "@/components/backend-connection-overlay";
import { toast as sonner } from "sonner";
import { to24h } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export interface ConversationMessage { id?: string; text?: string; ts?: string }
export interface Reservation { id: string; title: string; start: string; end?: string; customer_name?: string }
export interface Vacation { id: string; start: string; end: string }

interface DataShape {
  // Keyed by waId
  conversations: Record<string, ConversationMessage[]>;
  reservations: Record<string, Reservation[]>;
  vacations: Vacation[];
  // Meta
  isLoading: boolean;
  error: string | null;
  refresh: (range?: { fromDate?: string; toDate?: string }) => Promise<void>;
  activeRange?: { fromDate?: string; toDate?: string };
}

const DataContext = React.createContext<DataShape>({
  conversations: {},
  reservations: {},
  vacations: [],
  isLoading: false,
  error: null,
  refresh: async () => {},
  activeRange: {},
});

export const WebSocketDataProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [conversations, setConversations] = React.useState<Record<string, ConversationMessage[]>>({});
  const [reservations, setReservations] = React.useState<Record<string, Reservation[]>>({});
  const [vacations, setVacations] = React.useState<Vacation[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasLoadedRef = React.useRef<boolean>(false);
  const lastRangeRef = React.useRef<{ fromDate?: string; toDate?: string }>({});
  const [activeRange, setActiveRange] = React.useState<{ fromDate?: string; toDate?: string }>({});

  // Subscribe to backend websocket for realtime updates (disable internal toasts)
  const ws = useWebSocketData({ enableNotifications: false });
  const { isRTL } = useLanguage();
  const lastToastKeyRef = React.useRef<string>("");

  // Offline overlay state
  const [showOffline, setShowOffline] = React.useState<boolean>(false);
  const [isRetrying, setIsRetrying] = React.useState<boolean>(false);

  // Show overlay when not connected, with a small debounce to avoid flashing
  React.useEffect(() => {
    if (ws?.isConnected) {
      setShowOffline(false);
      return;
    }
    const t = setTimeout(() => setShowOffline(true), 700);
    return () => clearTimeout(t);
  }, [ws?.isConnected]);

  const handleRetry = React.useCallback(async () => {
    try {
      setIsRetrying(true);
      // Ping a lightweight endpoint to check backend availability
      await fetch("/api/metrics", { cache: "no-store" }).catch(() => {});
      // Attempt to reconnect websocket without full refresh
      try { ws?.connect?.(); } catch {}
      // Optionally refresh fallback data so UI has content even before ws connects
      try { await ws?.refreshData?.(); } catch {}
    } finally {
      setIsRetrying(false);
    }
  }, [ws]);

  // Mirror websocket state into provider state
  React.useEffect(() => {
    if (ws && ws.conversations) setConversations(ws.conversations as any);
  }, [ws?.conversations]);

  React.useEffect(() => {
    if (ws && ws.reservations) setReservations(ws.reservations as any);
  }, [ws?.reservations]);

  React.useEffect(() => {
    if (ws && ws.vacations) setVacations(ws.vacations as any);
  }, [ws?.vacations]);

  // Notification capture from ws hook (which dispatches window events)
  React.useEffect(() => {
    const handler = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const { type, data } = detail;
      if (!type || !data) return;
      const key = `${type}:${data.id ?? ""}:${data.date ?? ""}:${data.time_slot ?? ""}`;
      if (key && lastToastKeyRef.current === key) {
        return; // de-dupe bursts
      }
      lastToastKeyRef.current = key;
      try {
        if (type === "reservation_created") {
          const title = isRTL ? `تم إنشاء الحجز #${data.id ?? ""}`.trim() : `Reservation #${data.id ?? ""}`.trim();
          const desc = isRTL ? `${data.customer_name || data.wa_id} • ${data.date} ${data.time_slot} • النوع ${data.type}` : `${data.customer_name || data.wa_id} • ${data.date} ${data.time_slot} • type ${data.type}`;
          sonner.success(title, { description: desc, duration: 3000 });
        } else if (type === "reservation_updated" || type === "reservation_reinstated") {
          // Fancy, theme-aware success toast describing what changed
          const customer = data.customer_name || data.wa_id || "";
          const changeBits: string[] = [];
          try {
            const ctxMap: Map<string, any> | undefined = (globalThis as any).__calendarLastModifyContext;
            const ctx = ctxMap?.get(String(data.id));
            if (ctx) {
              if (ctx.prevDate && data.date && ctx.prevDate !== data.date) {
                changeBits.push(isRTL ? `التاريخ: ${ctx.prevDate} → ${data.date}` : `date: ${ctx.prevDate} → ${data.date}`);
              }
              if (ctx.prevTime && data.time_slot) {
                const to12 = (t: string) => {
                  try { const [h, m] = t.split(":"); const H = Number(h); const ap = H >= 12 ? "PM" : "AM"; const h12 = (H % 12) || 12; return `${h12}:${m} ${ap}`; } catch { return t; }
                };
                const prevT = to12(ctx.prevTime);
                const newT = to12(data.time_slot?.slice(0,5) || data.time_slot);
                if (prevT !== newT) changeBits.push(isRTL ? `الوقت: ${prevT} → ${newT}` : `time: ${prevT} → ${newT}`);
              }
              const prevType = ctx.prevType;
              if (typeof prevType === "number" && typeof data.type === "number" && prevType !== data.type) {
                const label = (v: number) => (v === 1 ? (isRTL ? "متابعة" : "Follow‑up") : (isRTL ? "فحص" : "Check‑up"));
                changeBits.push(isRTL ? `النوع: ${label(prevType)} → ${label(data.type)}` : `type: ${label(prevType)} → ${label(data.type)}`);
              }
            }
          } catch {}

          const title = isRTL ? `تم تعديل الحجز` : `Reservation updated`;
          const desc = [customer, changeBits.join(isRTL ? " • " : " • ")].filter(Boolean).join(isRTL ? " • " : " • ");
          sonner.custom((id) => (
            <div className="sonner-description fancy-toast">
              <div className="fancy-toast-bg" />
              <div className="fancy-toast-content">
                <div className="fancy-toast-title">{title}</div>
                <div className="fancy-toast-sub">{desc || (isRTL ? "تم التحديث" : "Updated")}</div>
              </div>
            </div>
          ), { duration: 3000 });
        } else if (type === "reservation_cancelled") {
          const title = isRTL ? `تم إلغاء الحجز #${data.id ?? ""}`.trim() : `Reservation #${data.id ?? ""}`.trim();
          const desc = isRTL ? `أُلغي • ${data.wa_id}${data.date ? ` • ${data.date}` : ""}` : `Cancelled • ${data.wa_id}${data.date ? ` • ${data.date}` : ""}`;
          sonner.warning(title, { description: desc, duration: 2500 });
        } else if (type === "conversation_new_message") {
          const title = isRTL ? `رسالة • ${data.wa_id}` : `Message • ${data.wa_id}`;
          sonner.message(title, { description: (data.message || "").slice(0, 100), duration: 2500 });
        } else if (type === "vacation_period_updated") {
          sonner.info(isRTL ? "الإجازات" : "Vacations", { description: isRTL ? "تم تحديث فترات الإجازة" : "Vacation periods updated", duration: 2000 });
        }
        const notif = new CustomEvent("notification:add", { detail: { type, data, ts: Date.now() } });
        window.dispatchEvent(notif);
      } catch {}
    };
    window.addEventListener("realtime", handler as EventListener);
    return () => window.removeEventListener("realtime", handler as EventListener);
  }, [isRTL]);

  const refresh = React.useCallback(async (range?: { fromDate?: string; toDate?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      if (range) {
        lastRangeRef.current = range;
        setActiveRange(range);
      }
      const { fromDate, toDate } = lastRangeRef.current;

      const qs = new URLSearchParams();
      if (fromDate) qs.set("from_date", fromDate);
      if (toDate) qs.set("to_date", toDate);

      const [conv, res, vac, metrics] = await Promise.all([
        // conversations with optional date filters
        fetch(qs.toString() ? `/api/conversations?${qs}` : "/api/conversations")
          .then(r => r.json())
          .catch(() => ({ success: false, data: {} })),
        fetchReservations({ future: false, includeCancelled: true, fromDate, toDate }),
        fetchVacations(),
        fetch("/api/metrics").then(r => r.json()).catch(() => ({ success: false, data: {} })),
      ]);

      if (conv?.success) setConversations(conv.data ?? {});
      else setConversations({});

      if (res?.success) setReservations(res.data ?? {});
      else setReservations({});

      if (vac?.success) setVacations(vac.data ?? []);
      else setVacations([]);

      // Attach metrics onto a ref for later use in dashboard aggregation via context
      (globalThis as any).__prom_metrics__ = metrics?.success ? (metrics.data ?? {}) : {};
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove unconditional initial REST load; fallback is handled elsewhere

  // Bridge: dispatch fine-grained window events for calendar to update via FullCalendar API
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      // No-op; events are dispatched directly from useWebSocketData
    };
    window.addEventListener("realtime", handler);
    return () => window.removeEventListener("realtime", handler);
  }, []);

  const value = React.useMemo<DataShape>(() => ({
    conversations,
    reservations,
    vacations,
    isLoading,
    error,
    refresh,
    activeRange,
  }), [conversations, reservations, vacations, isLoading, error, refresh, activeRange]);

  return (
    <DataContext.Provider value={value}>
      {children}
      {showOffline && (
        <BackendConnectionOverlay onRetry={handleRetry} isRetrying={isRetrying} />
      )}
    </DataContext.Provider>
  );
};

export const useConversationsData = () => {
  const { conversations, isLoading, error, refresh } = React.useContext(DataContext);
  return { conversations, isLoading, error, refresh };
};

export const useReservationsData = () => {
  const { reservations, isLoading, error, refresh } = React.useContext(DataContext);
  return { reservations, isLoading, error, refresh };
};

export const useVacationsData = () => {
  const { vacations, isLoading, error, refresh } = React.useContext(DataContext);
  return { vacations, isLoading, error, refresh };
};

export const useDashboardData = () => {
  const { conversations, reservations, isLoading, error, refresh, activeRange } = React.useContext(DataContext);

  const dashboardData = React.useMemo<DashboardData | null>(() => {
    try {
      const reservationEntries = Object.entries(reservations ?? {});
      const conversationEntries = Object.entries(conversations ?? {});

      const parseISO = (value?: string | null) => {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
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
        const from = activeRange?.fromDate ? new Date(activeRange.fromDate) : null;
        const to = activeRange?.toDate ? new Date(activeRange.toDate) : null;
        if (from) {
          const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
          if (d < f) return false;
        }
        if (to) {
          const t = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
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
        const days = Math.max(1, Math.floor((new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) / oneDayMs) + 1);
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

      // Unique customers based on full datasets (not filtered) so denominators make sense,
      // while time-bounded metrics use filtered subsets
      const uniqueCustomerIds = new Set<string>([
        ...Object.keys(reservations ?? {}),
        ...Object.keys(conversations ?? {}),
      ]);

      const filteredReservationEntries = reservationEntries.map(([id, items]) => [
        id,
        (Array.isArray(items) ? items : []).filter((r) => withinRange(parseReservationDate(r))),
      ]) as [string, any[]][];
      const filteredConversationEntries = conversationEntries.map(([id, msgs]) => [
        id,
        (Array.isArray(msgs) ? msgs : []).filter((m) => withinRange(parseMessageDate(m))),
      ]) as [string, any[]][];

      // Previous period filtered datasets
      const prevReservationEntries = reservationEntries.map(([id, items]) => [
        id,
        (Array.isArray(items) ? items : []).filter((r) => withinPrevRange(parseReservationDate(r))),
      ]) as [string, any[]][];
      const prevConversationEntries = conversationEntries.map(([id, msgs]) => [
        id,
        (Array.isArray(msgs) ? msgs : []).filter((m) => withinPrevRange(parseMessageDate(m))),
      ]) as [string, any[]][];

      const totalReservations = filteredReservationEntries.reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0), 0);
      const prevTotalReservations = prevReservationEntries.reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0), 0);
      const totalMessages = filteredConversationEntries.reduce((sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.length : 0), 0);
      const prevTotalMessages = prevConversationEntries.reduce((sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.length : 0), 0);

      const returningCustomers = filteredReservationEntries.reduce((count, [, items]) => count + ((Array.isArray(items) && items.length > 1) ? 1 : 0), 0);

      // Unique customers for the KPI as "first reservation in selected period"
      const firstReservationDateByCustomer = new Map<string, Date | null>();
      reservationEntries.forEach(([id, items]) => {
        const first = (Array.isArray(items) ? items : [])
          .map((r) => parseReservationDate(r))
          .filter(Boolean)
          .sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] as Date | undefined;
        firstReservationDateByCustomer.set(id, first ?? null);
      });
      const uniqueCustomers = Array.from(firstReservationDateByCustomer.entries()).reduce((count, [, d]) => count + (withinRange(d) ? 1 : 0), 0);
      const prevUniqueCustomers = Array.from(firstReservationDateByCustomer.entries()).reduce((count, [, d]) => count + (withinPrevRange(d) ? 1 : 0), 0);

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
      const conversionRate = conversionDenominator > 0
        ? Math.min(100, (conversionNumerator / conversionDenominator) * 100)
        : 0;

      const avgFollowups = (() => {
        const returningCounts = filteredReservationEntries
          .map(([, items]) => Array.isArray(items) ? items.length : 0)
          .filter(len => len > 1)
          .map(len => len - 1);
        if (returningCounts.length === 0) return 0;
        const total = returningCounts.reduce((a, b) => a + b, 0);
        return total / returningCounts.length;
      })();
      const prevAvgFollowups = (() => {
        const returningCounts = prevReservationEntries
          .map(([, items]) => Array.isArray(items) ? items.length : 0)
          .filter(len => len > 1)
          .map(len => len - 1);
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
      const prevConversionRate = prevDen > 0 ? Math.min(100, (prevNum / prevDen) * 100) : 0;

      const responseDurationsMinutes: number[] = (() => {
        const diffs: number[] = [];
        filteredConversationEntries.forEach(([, msgs]) => {
          const sorted = (Array.isArray(msgs) ? msgs : [])
            .map(m => ({ d: parseMessageDate(m), role: (m as any).role || (m as any).sender || (m as any).author || "user" }))
            .filter((x) => Boolean(x.d))
            .sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            // Measure only customer -> assistant transitions
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
            .map(m => ({ d: parseMessageDate(m), role: (m as any).role || (m as any).sender || (m as any).author || "user" }))
            .filter((x) => Boolean(x.d))
            .sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime());
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
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

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const median = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      };

      const avgResponseTime = Math.min(60, avg(responseDurationsMinutes));
      const prevAvgResponseTime = Math.min(60, avg(prevResponseDurationsMinutes));

      const dailyMap = new Map<string, { reservations: number; cancellations: number; modifications: number }>();
      filteredReservationEntries.forEach(([, items]) => {
        (Array.isArray(items) ? items : []).forEach(r => {
          const d = parseReservationDate(r);
          if (!d) return;
          const key = d.toISOString().slice(0, 10);
          const entry = dailyMap.get(key) || { reservations: 0, cancellations: 0, modifications: 0 };
          entry.reservations += 1;
          if ((r as any).cancelled === true) entry.cancellations += 1;
          dailyMap.set(key, entry);
        });
      });

      const dailyTrends = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, reservations: v.reservations, cancellations: v.cancellations, modifications: v.modifications }));

      const typeDistribution = (() => {
        let checkup = 0;
        let followup = 0;
        filteredReservationEntries.forEach(([, items]) => {
          (Array.isArray(items) ? items : []).forEach(r => {
            if (typeof (r as any).type === "number") {
              if ((r as any).type === 1) {
                followup += 1;
              } else {
                checkup += 1;
              }
            } else {
              const title = ((r as any).title || "").toString().toLowerCase();
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
        (Array.isArray(items) ? items : []).forEach(r => {
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
        .map(([time, count]) => ({ slot: time, time, count, normalized: count, type: "regular" as const, availDays: 0 }));

      const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;
      const heatmapMap = new Map<string, number>();
      filteredConversationEntries.forEach(([, msgs]) => {
        (Array.isArray(msgs) ? msgs : []).forEach(m => {
          const d = parseMessageDate(m);
          if (!d) return;
          const key = `${weekdays[d.getDay()]}_${d.getHours()}`;
          heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
        });
      });
      const messageHeatmap = Array.from(heatmapMap.entries()).map(([k, count]) => {
        const [weekday, hourStr] = k.split("_");
        return { weekday, hour: Number(hourStr), count };
      });

      const topCustomers = (() => {
        const map = new Map<string, { messageCount: number; reservationCount: number; lastActivity: string }>();
        uniqueCustomerIds.forEach(id => {
          const msgs = (filteredConversationEntries.find(([k]) => k === id)?.[1] ?? []) as any[];
          const resv = (filteredReservationEntries.find(([k]) => k === id)?.[1] ?? []) as any[];
          const lastMsg = msgs
            .map(m => parseMessageDate(m))
            .filter(Boolean)
            .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
          const lastRes = resv
            .map(r => parseReservationDate(r))
            .filter(Boolean)
            .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;
          const last = lastMsg && lastRes ? (lastMsg > lastRes ? lastMsg : lastRes) : (lastMsg || lastRes);
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
      })();

      const words: Record<string, number> = {};
      filteredConversationEntries.forEach(([, msgs]) => {
        (Array.isArray(msgs) ? msgs : []).forEach(m => {
          const text = ((m as any).text || (m as any).message || "").toString().toLowerCase();
          const tokens = text
            .toLowerCase()
            .replace(/[\d]+/g, " ")
            .replace(/[^\w\s\u0600-\u06FF]/g, " ")
            .split(/\s+/)
            .filter((w: string) => w.length > 2);
          tokens.forEach((t: string) => { (words as Record<string, number>)[t] = ((words as Record<string, number>)[t] || 0) + 1; });
        });
      });
      const wordFrequency = Object.entries(words)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      const dayOfWeekMap = new Map<string, { reservations: number; cancellations: number; }>();
      filteredReservationEntries.forEach(([, items]) => {
        (Array.isArray(items) ? items : []).forEach(r => {
          const d = parseReservationDate(r);
          if (!d) return;
          const day = weekdays[d.getDay()];
          const entry = dayOfWeekMap.get(day) || { reservations: 0, cancellations: 0 };
          entry.reservations += 1;
          if ((r as any).cancelled === true) entry.cancellations += 1;
          dayOfWeekMap.set(day, entry);
        });
      });
      const dayOfWeekData = Array.from(dayOfWeekMap.entries()).map(([day, v]) => ({
        day,
        reservations: v.reservations,
        cancellations: v.cancellations,
        cancelRate: v.reservations > 0 ? (v.cancellations / v.reservations) * 100 : 0,
      }));

      const monthMap = new Map<string, { reservations: number; cancellations: number; conversations: number }>();
      filteredReservationEntries.forEach(([, items]) => {
        (Array.isArray(items) ? items : []).forEach(r => {
          const d = parseReservationDate(r);
          if (!d) return;
          const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, "0")}`;
          const entry = monthMap.get(key) || { reservations: 0, cancellations: 0, conversations: 0 };
          entry.reservations += 1;
          if ((r as any).cancelled === true) entry.cancellations += 1;
          monthMap.set(key, entry);
        });
      });
      filteredConversationEntries.forEach(([, msgs]) => {
        (Array.isArray(msgs) ? msgs : []).forEach(m => {
          const d = parseMessageDate(m);
          if (!d) return;
          const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, "0")}`;
          const entry = monthMap.get(key) || { reservations: 0, cancellations: 0, conversations: 0 };
          entry.conversations += 1;
          monthMap.set(key, entry);
        });
      });
      const monthlyTrends = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, v]) => {
          const [y, m] = key.split("-").map(Number);
          const date = new Date(y, m - 1, 1);
          const isRTLFlag = (() => {
            if (typeof window === "undefined") return false;
            try {
              return localStorage.getItem("isRTL") === "true";
            } catch {
              return false;
            }
          })();
          const month = date.toLocaleString(isRTLFlag ? "ar" : "en", { month: "short" });
          return { month, reservations: v.reservations, cancellations: v.cancellations, conversations: v.conversations };
        });

      const prom = (globalThis as any).__prom_metrics__ || {};

      // Active customers: customers with at least one upcoming (future) reservation
      const now = new Date();
      const activeUpcomingCustomerIds = new Set<string>();
      reservationEntries.forEach(([id, items]) => {
        const hasUpcoming = (Array.isArray(items) ? items : []).some((r) => {
          const d = parseReservationDate(r);
          return d && d > now && (r as any).cancelled !== true;
        });
        if (hasUpcoming) activeUpcomingCustomerIds.add(id);
      });

      const totalCancellations = filteredReservationEntries.reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.filter((r) => (r as any).cancelled === true).length : 0), 0);
      const prevTotalCancellations = prevReservationEntries.reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.filter((r) => (r as any).cancelled === true).length : 0), 0);

      // Helper to compute percent change safely
      const computeTrend = (current: number, previous: number, higherIsBetter = true) => {
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
          cpu_percent: typeof prom.process_cpu_percent === "number" ? prom.process_cpu_percent : undefined,
          memory_bytes: typeof prom.process_memory_bytes === "number" ? prom.process_memory_bytes : undefined,
          reservations_requested_total: prom.reservations_requested_total,
          reservations_successful_total: prom.reservations_successful_total,
          reservations_failed_total: prom.reservations_failed_total,
          reservations_cancellation_requested_total: prom.reservations_cancellation_requested_total,
          reservations_cancellation_successful_total: prom.reservations_cancellation_successful_total,
          reservations_cancellation_failed_total: prom.reservations_cancellation_failed_total,
          reservations_modification_requested_total: prom.reservations_modification_requested_total,
          reservations_modification_successful_total: prom.reservations_modification_successful_total,
          reservations_modification_failed_total: prom.reservations_modification_failed_total,
        },
        dailyTrends,
        typeDistribution,
        timeSlots,
        messageHeatmap,
        topCustomers,
        conversationAnalysis: {
          avgMessageLength: totalMessages > 0 ? filteredConversationEntries.reduce((sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.reduce((s, m) => s + ((m as any).text || (m as any).message || "").toString().length, 0) : 0), 0) / totalMessages : 0,
          avgWordsPerMessage: totalMessages > 0 ? filteredConversationEntries.reduce((sum, [, msgs]) => sum + (Array.isArray(msgs) ? msgs.reduce((s, m) => s + (((m as any).text || (m as any).message || "").toString().trim().split(/\s+/).filter(Boolean).length), 0) : 0), 0) / totalMessages : 0,
          avgMessagesPerCustomer: uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
          totalMessages,
          uniqueCustomers,
          responseTimeStats: {
            avg: Number.isFinite(avgResponseTime) ? avgResponseTime : 0,
            median: Number.isFinite(median(responseDurationsMinutes)) ? median(responseDurationsMinutes) : 0,
            max: responseDurationsMinutes.length ? Math.max(...responseDurationsMinutes) : 0,
          },
          messageCountDistribution: {
            avg: uniqueCustomers > 0 ? totalMessages / uniqueCustomers : 0,
            median: (() => {
              const counts = filteredConversationEntries.map(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0));
              return median(counts);
            })(),
            max: filteredConversationEntries.length ? Math.max(...filteredConversationEntries.map(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0))) : 0,
          },
        },
        wordFrequency,
        dayOfWeekData,
        monthlyTrends,
        funnelData: [
          { stage: "Conversations", count: filteredConversationEntries.filter(([, msgs]) => (Array.isArray(msgs) ? msgs.length : 0) > 0).length },
          { stage: "Made reservation", count: filteredReservationEntries.filter(([, items]) => (Array.isArray(items) ? items.length : 0) > 0).length },
          { stage: "Returned for another", count: returningCustomers },
          { stage: "Cancelled", count: 0 },
        ],
        customerSegments: (() => {
          let new1 = 0, returning2to5 = 0, loyal6 = 0;
          filteredReservationEntries.forEach(([, items]) => {
            const len = Array.isArray(items) ? items.length : 0;
            if (len <= 1) new1 += 1; else if (len <= 5) returning2to5 += 1; else loyal6 += 1;
          });
          return [
            { segment: "New (1 visit)", count: new1, percentage: uniqueCustomers ? (new1 / uniqueCustomers) * 100 : 0, avgReservations: new1 ? 1 : 0 },
            { segment: "Returning (2-5 visits)", count: returning2to5, percentage: uniqueCustomers ? (returning2to5 / uniqueCustomers) * 100 : 0, avgReservations: returning2to5 ? 3 : 0 },
            { segment: "Loyal (6+ visits)", count: loyal6, percentage: uniqueCustomers ? (loyal6 / uniqueCustomers) * 100 : 0, avgReservations: loyal6 ? 6 : 0 },
          ];
        })(),
      };

      return dashboard;
    } catch (e) {
      console.error("Failed to compute dashboard data:", e);
      return null;
    }
  }, [conversations, reservations, activeRange]);

  return { dashboardData, isLoading, error, refresh };
};

