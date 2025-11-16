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
        __notif_history_request_time__?: number;
      };

      // Prevent duplicate requests within 5 seconds
      const now = Date.now();
      const lastRequest = windowNotif.__notif_history_request_time__ || 0;
      const REQUEST_COOLDOWN_MS = 5000;

      if (
        windowNotif.__notif_history_requested__ &&
        now - lastRequest < REQUEST_COOLDOWN_MS
      ) {
        return;
      }

      let attempts = 0;
      const sendRequest = () => {
        attempts += 1;
        try {
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
            windowNotif.__notif_history_requested__ = true;
            windowNotif.__notif_history_request_time__ = now;
            return;
          }
        } catch {
          // Ignore and retry while under attempt threshold
        }
        if (attempts < 10) {
          window.setTimeout(sendRequest, 250);
        }
      };

      sendRequest();
    } catch {
      // Silently ignore errors in notification history request (e.g., WebSocket unavailable)
    }
  };

  return { requestHistory, onHistory, onEvent };
}
