"use client";
import {
  useConversationsData,
  useReservationsData,
} from "@shared/libs/data/websocket-data-provider";
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCustomerNames } from "@/features/chat/hooks/useCustomerNames";
import {
  buildBaseCustomers,
  mergeCustomerOverlays,
  sortCustomersByLastMessage,
} from "@/features/customers/services/customers.process";

export type CustomerDataState = {
  customers: Array<{ id: string; name: string; phone?: string }>;
  conversations: Record<
    string,
    Array<{ id?: string; text?: string; ts?: string }>
  >;
  reservations: Record<
    string,
    Array<{
      id?: string | number;
      title?: string;
      start?: string;
      end?: string;
      customer_name?: string;
    }>
  >;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CustomerDataContext = createContext<CustomerDataState | undefined>(
  undefined
);

export const CustomerDataProvider: FC<PropsWithChildren> = ({ children }) => {
  // Source canonical data from the unified websocket/data provider
  const { conversations, isLoading: conversationsLoading } =
    useConversationsData();
  const { reservations, isLoading: reservationsLoading } =
    useReservationsData();
  const { data: customerNamesData, isLoading: customerNamesLoading } =
    useCustomerNames();

  const customerNames = useMemo(
    () => customerNamesData || {},
    [customerNamesData]
  );

  // Build base customers list by combining conversations and reservations
  const baseCustomers = useMemo<CustomerDataState["customers"]>(
    () => buildBaseCustomers(conversations, reservations, customerNames),
    [conversations, reservations, customerNames]
  );

  // Realtime overlays for add/update/delete without requiring snapshots
  const [customerOverrides, setCustomerOverrides] = useState<
    Map<string, { name?: string; phone?: string }>
  >(new Map());
  const [deletedCustomers, setDeletedCustomers] = useState<Set<string>>(
    new Set()
  );

  // Listen for websocket fan-out events to keep customer names/entries fresh
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const { type, data } = (ev as CustomEvent).detail || {};
        if (!type) {
          return;
        }
        const t = String(type).toLowerCase();
        const d = (data || {}) as Record<string, unknown>;
        const wa = String(
          (d?.wa_id as string) || (d?.waId as string) || (d?.id as string) || ""
        );
        if (!wa) {
          return;
        }

        if (t === "customer_updated" || t === "customer_created") {
          // Apply name/phone overrides and clear any delete marker
          setCustomerOverrides((prev) => {
            const next = new Map(prev);
            const cur = next.get(wa) || {};
            const nameAny =
              (d?.name as string) || (d?.customer_name as string) || undefined;
            const phoneAny = (d?.phone as string) || undefined;
            next.set(wa, {
              ...cur,
              ...(nameAny !== undefined ? { name: nameAny } : {}),
              ...(phoneAny !== undefined ? { phone: phoneAny } : {}),
            });
            return next;
          });
          setDeletedCustomers((prev) => {
            if (!prev.has(wa)) {
              return prev;
            }
            const n = new Set(prev);
            n.delete(wa);
            return n;
          });
          return;
        }

        if (t === "customer_deleted" || t === "customer_removed") {
          // Mark as deleted and drop any overrides
          setDeletedCustomers((prev) => {
            const n = new Set(prev);
            n.add(wa);
            return n;
          });
          setCustomerOverrides((prev) => {
            if (!prev.has(wa)) {
              return prev;
            }
            const n = new Map(prev);
            n.delete(wa);
            return n;
          });
          return;
        }
      } catch {
        // Event handling failed; silently ignore
      }
    };
    window.addEventListener("realtime", handler as EventListener);
    return () =>
      window.removeEventListener("realtime", handler as EventListener);
  }, []);

  // Merge base customers with realtime overlays, supporting adds/updates/deletes
  const customers = useMemo<CustomerDataState["customers"]>(() => {
    const merged = mergeCustomerOverlays(
      baseCustomers,
      customerOverrides,
      deletedCustomers
    );
    return sortCustomersByLastMessage(merged, conversations);
  }, [baseCustomers, customerOverrides, deletedCustomers, conversations]);

  const loading =
    conversationsLoading || reservationsLoading || customerNamesLoading;

  const refresh = useCallback(async () => {
    // No-op: unified provider manages refresh; expose to satisfy consumers
    await Promise.resolve();
  }, []);

  // Transform conversations to match CustomerDataState interface
  const transformedConversations = useMemo(() => {
    const result: Record<
      string,
      Array<{ id?: string; text?: string; ts?: string }>
    > = {};
    for (const [waId, messages] of Object.entries(conversations || {})) {
      result[waId] = messages.map((msg, index) => ({
        id: `${waId}-${index}`,
        text: msg.message,
        ts: msg.date && msg.time ? `${msg.date}T${msg.time}` : "",
      }));
    }
    return result;
  }, [conversations]);

  const value = useMemo(
    () => ({
      customers,
      conversations: transformedConversations,
      reservations,
      loading,
      refresh,
    }),
    [customers, transformedConversations, reservations, loading, refresh]
  );

  return (
    <CustomerDataContext.Provider value={value}>
      {children}
    </CustomerDataContext.Provider>
  );
};

export function useCustomerData(): CustomerDataState {
  const ctx = useContext(CustomerDataContext);
  if (!ctx) {
    throw new Error("useCustomerData must be used within CustomerDataProvider");
  }
  return ctx;
}
