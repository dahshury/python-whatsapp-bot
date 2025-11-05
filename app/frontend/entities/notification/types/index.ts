// Notification domain types

export type NotificationType =
  | "reservation_created"
  | "reservation_updated"
  | "reservation_reinstated"
  | "reservation_cancelled"
  | "conversation_new_message"
  | "vacation_period_updated"
  | (string & {});

export type ReservationData = {
  id?: string;
  wa_id?: string;
  waId?: string;
  customer_name?: string;
  date?: string;
  time_slot?: string;
  // Additional fields potentially present on conversation message notifications
  time?: string;
  message?: string;
  role?: string;
};

export type NotificationItem = {
  id: string;
  text: string;
  timestamp: number; // epoch ms
  unread: boolean;
  type: NotificationType;
  data?: Record<string, unknown>;
};

export type GroupEntry = {
  kind: "group";
  waId: string;
  date: string; // YYYY-MM-DD grouping key
  customerName: string;
  latest: NotificationItem;
  unreadCount: number;
  totalCount: number;
};

export type ItemEntry = { kind: "item"; item: NotificationItem };
export type RenderEntry = GroupEntry | ItemEntry;
