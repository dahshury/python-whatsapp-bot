"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
  mapHistoryItems,
  mapLiveEvent,
} from "@/entities/notification/mappers/ws-to-notification";
import type {
  NotificationItem,
  RenderEntry,
} from "@/entities/notification/types";
import { getWaId } from "@/entities/notification/value-objects";
import { notificationKeys } from "@/shared/api/query-keys";
import { useBackendReconnectRefetch } from "@/shared/libs/hooks/useBackendReconnectRefetch";
import { createWindowNotificationSource } from "../infrastructure/ws-notification-source";
import { aggregateNotifications } from "../model/aggregate";
import type { NotificationHistoryItem } from "../ports/notification-source";

type UseNotificationsArgs = {
  getMessage: (key: string) => string;
  resolveCustomerName: (
    waId?: string,
    fallbackName?: string
  ) => string | undefined;
};

const inFlightHistoryRequests = new Map<string, Promise<NotificationItem[]>>();

function historyRequestKey(limit: number) {
  return `notifications:history:${limit}`;
}

export function useNotifications({
  getMessage,
  resolveCustomerName,
}: UseNotificationsArgs): {
  open: boolean;
  setOpen: (open: boolean) => void;
  items: NotificationItem[];
  computedUnreadCount: number;
  renderEntries: RenderEntry[];
  markAllAsRead: () => void;
  addFromLiveEvent: (detail: {
    type?: string;
    data?: Record<string, unknown>;
    ts?: number | string;
    __local?: boolean;
  }) => void;
  markItemAsRead: (id: string) => void;
  markGroupAsRead: (waId: string, date: string) => void;
} {
  const NOTIFICATIONS_LIMIT = 100;
  const queryKey = React.useMemo(
    () => notificationKeys.history(NOTIFICATIONS_LIMIT),
    [NOTIFICATIONS_LIMIT]
  );
  const queryClient = useQueryClient();

  const ALLOWED_SOURCES = React.useMemo(
    () => new Set(["assistant", "backend"]),
    []
  );
  const isServerNotification = React.useCallback(
    (source?: string | null): boolean => {
      if (!source) {
        return true;
      }
      const normalized = String(source).trim().toLowerCase();
      return ALLOWED_SOURCES.has(normalized);
    },
    [ALLOWED_SOURCES]
  );

  const openRef = React.useRef(false);
  const [openState, setOpenState] = React.useState(false);
  const setOpen = React.useCallback((next: boolean) => {
    openRef.current = next;
    setOpenState(next);
  }, []);
  const open = openState;

  const filterServerItems = React.useCallback(
    (list: NotificationItem[]) =>
      list.filter((item) => {
        const source = (item.data as { _source?: string } | undefined)?._source;
        return isServerNotification(source);
      }),
    [isServerNotification]
  );

  const fetchHistory = React.useCallback(async () => {
    const cacheKey = historyRequestKey(NOTIFICATIONS_LIMIT);
    const existingRequest = inFlightHistoryRequests.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }
    const requestPromise = (async () => {
      const response = await fetch(
        `/api/notifications?limit=${NOTIFICATIONS_LIMIT}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error("failed_to_load_notifications");
      }
      const payload = (await response.json()) as {
        success?: boolean;
        data?: NotificationHistoryItem[];
        message?: string;
      };
      if (payload?.success === false) {
        throw new Error(payload.message || "failed_to_load_notifications");
      }
      const mapped = mapHistoryItems(payload?.data, {
        getMessage,
        resolveCustomerName,
      });
      return filterServerItems(mapped).slice(0, NOTIFICATIONS_LIMIT);
    })();

    inFlightHistoryRequests.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inFlightHistoryRequests.delete(cacheKey);
    }
  }, [NOTIFICATIONS_LIMIT, filterServerItems, getMessage, resolveCustomerName]);

  const historyQuery = useQuery<NotificationItem[]>({
    queryKey,
    queryFn: fetchHistory,
    placeholderData: [] as NotificationItem[],
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 300_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });

  useBackendReconnectRefetch(historyQuery.refetch, {
    enabled: !historyQuery.isFetching,
  });

  const items = historyQuery.data ?? [];

  const mergeHistoryIntoCache = React.useCallback(
    (incoming: NotificationItem[]) => {
      if (!incoming.length) {
        return;
      }
      queryClient.setQueryData<NotificationItem[]>(queryKey, (prev) => {
        const base = Array.isArray(prev) ? prev : [];
        if (!base.length) {
          return incoming
            .slice(0, NOTIFICATIONS_LIMIT)
            .sort((a, b) => b.timestamp - a.timestamp);
        }
        const byId = new Map<string, NotificationItem>();
        for (const existing of base) {
          byId.set(existing.id, existing);
        }
        for (const item of incoming) {
          if (!byId.has(item.id)) {
            byId.set(item.id, item);
          }
        }
        return Array.from(byId.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, NOTIFICATIONS_LIMIT);
      });
    },
    [NOTIFICATIONS_LIMIT, queryClient, queryKey]
  );

  const appendLiveEventToCache = React.useCallback(
    (item: NotificationItem) => {
      queryClient.setQueryData<NotificationItem[]>(queryKey, (prev) => {
        const base = Array.isArray(prev) ? prev : [];
        if (base.some((n) => n.id === item.id)) {
          return base;
        }
        const unread = openRef.current ? false : item.unread;
        return [{ ...item, unread }, ...base].slice(0, NOTIFICATIONS_LIMIT);
      });
    },
    [NOTIFICATIONS_LIMIT, queryClient, queryKey]
  );

  // Use ref to track if effect has run to prevent duplicate requests
  const hasRequestedHistory = React.useRef(false);

  React.useEffect(() => {
    // Prevent duplicate requests if hook is used in multiple components
    if (hasRequestedHistory.current) {
      return;
    }

    const source = createWindowNotificationSource();
    const unsubHistory = source.onHistory(({ items: list }) => {
      const loaded = mapHistoryItems(list, { getMessage, resolveCustomerName });
      const filtered = filterServerItems(loaded).slice(0, NOTIFICATIONS_LIMIT);
      if (filtered.length) {
        mergeHistoryIntoCache(filtered);
      }
    });

    // Only request history once
    if (!hasRequestedHistory.current) {
      source.requestHistory(NOTIFICATIONS_LIMIT);
      hasRequestedHistory.current = true;
    }

    const unsubEvent = source.onEvent((detail) => {
      const eventSource = (detail.data as { _source?: string })?._source;
      if (!isServerNotification(eventSource)) {
        return;
      }
      const item = mapLiveEvent(detail, { getMessage, resolveCustomerName });
      if (!item) {
        return;
      }
      appendLiveEventToCache(item);
    });
    return () => {
      unsubHistory();
      unsubEvent();
    };
  }, [
    NOTIFICATIONS_LIMIT,
    appendLiveEventToCache,
    filterServerItems,
    getMessage,
    isServerNotification,
    mergeHistoryIntoCache,
    resolveCustomerName,
  ]);

  const { computedUnreadCount, renderEntries } = React.useMemo(
    () => aggregateNotifications(items, resolveCustomerName),
    [items, resolveCustomerName]
  );

  const markAllAsRead = React.useCallback(() => {
    queryClient.setQueryData<NotificationItem[]>(queryKey, (prev) =>
      (prev ?? []).map((n) => ({ ...n, unread: false }))
    );
  }, [queryClient, queryKey]);

  const addFromLiveEvent = React.useCallback(
    (detail: {
      type?: string;
      data?: Record<string, unknown>;
      ts?: number | string;
      __local?: boolean;
    }) => {
      const eventSource = (detail.data as { _source?: string })?._source;
      if (!isServerNotification(eventSource)) {
        return;
      }
      const item = mapLiveEvent(detail, { getMessage, resolveCustomerName });
      if (!item) {
        return;
      }
      appendLiveEventToCache(item);
    },
    [
      appendLiveEventToCache,
      getMessage,
      isServerNotification,
      resolveCustomerName,
    ]
  );

  const markItemAsRead = React.useCallback(
    (id: string) => {
      queryClient.setQueryData<NotificationItem[]>(queryKey, (prev) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
    },
    [queryClient, queryKey]
  );

  const markGroupAsRead = React.useCallback(
    (waId: string, date: string) => {
      queryClient.setQueryData<NotificationItem[]>(queryKey, (prev) =>
        (prev ?? []).map((n) => {
          if (
            n.type === "conversation_new_message" &&
            getWaId(n.data) === waId &&
            String((n.data as { date?: string } | undefined)?.date || "") ===
              String(date || "")
          ) {
            return { ...n, unread: false };
          }
          return n;
        })
      );
    },
    [queryClient, queryKey]
  );

  return {
    open,
    setOpen,
    items,
    computedUnreadCount,
    renderEntries,
    markAllAsRead,
    addFromLiveEvent,
    markItemAsRead,
    markGroupAsRead,
  };
}
