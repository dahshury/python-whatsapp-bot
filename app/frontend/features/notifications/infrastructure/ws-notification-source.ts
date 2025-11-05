import type {
  NotificationHistoryItem,
  NotificationLiveEventDetail,
  NotificationSourcePort,
} from "../ports/notification-source";

export function createWindowNotificationSource(): NotificationSourcePort {
  const onHistory = (
    handler: (payload: { items?: NotificationHistoryItem[] }) => void
  ) => {
    const listener = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as
          | { items?: NotificationHistoryItem[] }
          | undefined;
        handler(detail || {});
      } catch {
        // Silently ignore errors in notification history handler to prevent UI disruption
      }
    };
    window.addEventListener("notifications:history", listener as EventListener);
    return () =>
      window.removeEventListener(
        "notifications:history",
        listener as EventListener
      );
  };

  const onEvent = (handler: (detail: NotificationLiveEventDetail) => void) => {
    const listener = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)
          .detail as NotificationLiveEventDetail;
        handler(detail || {});
      } catch {
        // Silently ignore errors in notification event handler to prevent UI disruption
      }
    };
    window.addEventListener("notification:add", listener as EventListener);
    return () =>
      window.removeEventListener("notification:add", listener as EventListener);
  };

  const requestHistory = (limit: number) => {
    try {
      const windowNotif = window as unknown as {
        __notif_history_requested__?: boolean;
      };
      const already = windowNotif.__notif_history_requested__;
      if (!already) {
        const wsRef = (
          globalThis as unknown as {
            __wsConnection?: { current?: WebSocket };
          }
        ).__wsConnection;
        if (wsRef?.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "get_notifications",
              data: { limit },
            })
          );
        }
        (
          window as unknown as { __notif_history_requested__?: boolean }
        ).__notif_history_requested__ = true;
      }
    } catch {
      // Silently ignore errors in notification history request (e.g., WebSocket unavailable)
    }
  };

  return { requestHistory, onHistory, onEvent };
}
