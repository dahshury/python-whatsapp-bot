import type { NotificationType } from "@/entities/notification/types";

export type NotificationHistoryItem = {
  id?: number | string;
  type?: NotificationType | string;
  timestamp?: string | number;
  data?: Record<string, unknown>;
};

export type NotificationLiveEventDetail = {
  type?: NotificationType | string;
  data?: Record<string, unknown>;
  ts?: number | string;
  __local?: boolean;
};

export type NotificationSourcePort = {
  /** Request notifications history from the backend/transport */
  requestHistory(limit: number): void;

  /** Subscribe to history payloads. Returns an unsubscribe fn. */
  onHistory(
    handler: (payload: { items?: NotificationHistoryItem[] }) => void
  ): () => void;

  /** Subscribe to live notification events. Returns an unsubscribe fn. */
  onEvent(handler: (detail: NotificationLiveEventDetail) => void): () => void;
};
