"use client";

import { formatTimeAgo } from "@shared/libs/date";
import { i18n } from "@shared/libs/i18n";
import { Badge } from "@ui/badge";
import type { LucideIcon } from "lucide-react";
import { MessageSquareQuote } from "lucide-react";
import type {
  GroupEntry,
  NotificationItem,
  ReservationData,
} from "@/entities/notification/types";
import { getNotificationAction } from "./get-notification-action";
import { getNotificationIcon } from "./get-notification-icon";
import { getNotificationTarget } from "./get-notification-target";

type NotificationItemUIEntry = {
  kind: "item";
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  unread: boolean;
  icon: LucideIcon;
};

type NotificationGroupUIEntry = {
  kind: "group";
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  unread: boolean;
  icon: LucideIcon;
  waId: string;
  date: string;
};

export type NotificationUIEntry =
  | NotificationItemUIEntry
  | NotificationGroupUIEntry;

type NotificationItemProps = {
  entry: NotificationUIEntry;
  onClick: () => void;
};

export function NotificationItemComponent({
  entry,
  onClick,
}: NotificationItemProps) {
  const Icon = entry.icon;

  return (
    <button
      className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-accent"
      onClick={onClick}
      type="button"
    >
      <div className="mt-1 text-muted-foreground">
        <Icon size={18} />
      </div>
      <div className="flex-1 space-y-1">
        <p
          className={`text-sm ${entry.unread ? "font-semibold text-foreground" : "text-foreground/80"}`}
        >
          {entry.user} {entry.action}{" "}
          {entry.kind === "group" ? (
            <Badge className="ml-1" variant="secondary">
              {entry.target}
            </Badge>
          ) : (
            <span className="font-medium">{entry.target}</span>
          )}
        </p>
        <p className="text-muted-foreground text-xs">{entry.timestamp}</p>
      </div>
      {entry.unread && (
        <span className="mt-1 inline-block size-2 rounded-full bg-primary" />
      )}
    </button>
  );
}

export function mapNotificationItemToUIEntry(
  item: NotificationItem,
  isLocalized: boolean,
  resolveCustomerName: (
    waId?: string,
    fallbackName?: string
  ) => string | undefined
): NotificationItemUIEntry {
  const d = (item.data || {}) as ReservationData;
  const customer =
    resolveCustomerName(d.wa_id, d.customer_name) || d.wa_id || "";
  const icon = getNotificationIcon(item.type);
  const action = getNotificationAction(item.type, isLocalized);
  const target = getNotificationTarget(item.type, d);

  return {
    kind: "item",
    id: item.id,
    user: customer || i18n.getMessage("notification_customer", isLocalized),
    action,
    target,
    timestamp: formatTimeAgo(isLocalized, item.timestamp),
    unread: item.unread,
    icon,
  };
}

export function mapNotificationGroupToUIEntry(
  group: GroupEntry,
  isLocalized: boolean
): NotificationGroupUIEntry {
  return {
    kind: "group",
    id: `group:${group.waId}|${group.date}`,
    user:
      group.customerName ||
      i18n.getMessage("notification_customer", isLocalized),
    action: i18n.getMessage("msg_messages", isLocalized),
    target: `${group.totalCount}`,
    timestamp: formatTimeAgo(isLocalized, group.latest.timestamp),
    unread: group.unreadCount > 0,
    icon: MessageSquareQuote as LucideIcon,
    waId: group.waId,
    date: group.date,
  };
}
