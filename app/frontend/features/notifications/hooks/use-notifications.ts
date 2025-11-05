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
import { createWindowNotificationSource } from "../infrastructure/ws-notification-source";
import { aggregateNotifications } from "../model/aggregate";

type UseNotificationsArgs = {
  getMessage: (key: string) => string;
  resolveCustomerName: (
    waId?: string,
    fallbackName?: string
  ) => string | undefined;
};

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
  const NOTIFICATIONS_LIMIT = 2000;
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const source = createWindowNotificationSource();
    const unsubHistory = source.onHistory(({ items: list }) => {
      const loaded = mapHistoryItems(list, { getMessage, resolveCustomerName });
      setItems(loaded.slice(0, NOTIFICATIONS_LIMIT));
    });
    source.requestHistory(NOTIFICATIONS_LIMIT);
    const unsubEvent = source.onEvent((detail) => {
      // Only show notifications for backend/LLM-initiated actions
      // Filter out frontend-initiated actions (e.g., user modifying events in UI)
      const eventSource = (detail.data as { _source?: string })?._source;
      const isAssistantAction = !eventSource || eventSource === "assistant";

      // Skip frontend-initiated events for notification button
      if (!isAssistantAction) {
        return;
      }

      const item = mapLiveEvent(detail, { getMessage, resolveCustomerName });
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) {
          return prev;
        }
        return [{ ...item, unread: !open }, ...prev].slice(
          0,
          NOTIFICATIONS_LIMIT
        );
      });
    });
    return () => {
      unsubHistory();
      unsubEvent();
    };
  }, [getMessage, resolveCustomerName, open]);

  const { computedUnreadCount, renderEntries } = React.useMemo(
    () => aggregateNotifications(items, resolveCustomerName),
    [items, resolveCustomerName]
  );

  const markAllAsRead = React.useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const addFromLiveEvent = React.useCallback(
    (detail: {
      type?: string;
      data?: Record<string, unknown>;
      ts?: number | string;
      __local?: boolean;
    }) => {
      const item = mapLiveEvent(detail, { getMessage, resolveCustomerName });
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) {
          return prev;
        }
        return [{ ...item, unread: !open }, ...prev].slice(
          0,
          NOTIFICATIONS_LIMIT
        );
      });
    },
    [getMessage, resolveCustomerName, open]
  );

  const markItemAsRead = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  const markGroupAsRead = React.useCallback((waId: string, date: string) => {
    setItems((prev) =>
      prev.map((n) => {
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
  }, []);

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
