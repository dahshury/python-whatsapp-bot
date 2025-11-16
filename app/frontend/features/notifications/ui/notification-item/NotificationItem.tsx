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
import { formatPhoneForDisplay } from "@/shared/libs/utils/phone-utils";
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
  firedAt?: string;
  unread: boolean;
  icon: LucideIcon;
  details: string[];
};

type NotificationGroupUIEntry = {
  kind: "group";
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  firedAt?: string;
  unread: boolean;
  icon: LucideIcon;
  waId: string;
  date: string;
  details: string[];
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
        {entry.details.length > 0 && (
          <div className="space-y-0.5 whitespace-pre-line text-muted-foreground text-xs">
            {entry.details.map((detail, idx) => (
              <p key={`${entry.id}-detail-${idx}`}>{detail}</p>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          {entry.timestamp}
          {entry.firedAt ? ` • ${entry.firedAt}` : ""}
        </p>
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
  const details = buildDetailsForItem(item.type, d);

  const firedAt = formatAbsoluteTimestamp(item.timestamp, isLocalized);
  return {
    kind: "item",
    id: item.id,
    user: customer || i18n.getMessage("notification_customer", isLocalized),
    action,
    target,
    timestamp: formatTimeAgo(isLocalized, item.timestamp),
    ...(firedAt ? { firedAt } : {}),
    unread: item.unread,
    icon,
    details,
  };
}

export function mapNotificationGroupToUIEntry(
  group: GroupEntry,
  isLocalized: boolean
): NotificationGroupUIEntry {
  const latestDetails = buildDetailsForItem(
    group.latest.type,
    (group.latest.data || {}) as ReservationData
  );
  const userLabel = resolveGroupUserLabel(group, isLocalized);
  const firedAt = formatAbsoluteTimestamp(group.latest.timestamp, isLocalized);
  return {
    kind: "group",
    id: `group:${group.waId}|${group.date}`,
    user: userLabel,
    action: i18n.getMessage("msg_messages", isLocalized),
    target: `${group.totalCount}`,
    timestamp: formatTimeAgo(isLocalized, group.latest.timestamp),
    ...(firedAt ? { firedAt } : {}),
    unread: group.unreadCount > 0,
    icon: MessageSquareQuote as LucideIcon,
    waId: group.waId,
    date: group.date,
    details: latestDetails,
  };
}

function formatAbsoluteTimestamp(
  ts: number,
  isLocalized: boolean
): string | undefined {
  try {
    const locale = isLocalized ? "ar-SA" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return;
    }
  }
}

function buildDetailsForItem(
  type: string | undefined,
  data: ReservationData | undefined
): string[] {
  if (!data) {
    return [];
  }
  if (type === "conversation_new_message") {
    const preview = buildMessagePreview(data.message);
    const when = [data.date, (data as { time?: string }).time]
      .filter(Boolean)
      .join(" • ");
    return [preview, when].filter((entry): entry is string =>
      Boolean(entry && entry.trim())
    );
  }
  if (type?.startsWith("reservation_")) {
    return buildReservationDetails(data);
  }
  return [];
}

function buildReservationDetails(data: ReservationData): string[] {
  const details: string[] = [];
  const when = [data.date, data.time_slot || data.time]
    .filter(Boolean)
    .join(" • ");
  if (when) {
    details.push(when);
  }
  const identifiers = [data.wa_id || data.waId, data.id ? `#${data.id}` : ""]
    .filter(Boolean)
    .join(" • ");
  if (identifiers) {
    details.push(identifiers);
  }
  const preview = buildMessagePreview(data.message);
  if (preview) {
    details.push(preview);
  }
  return details;
}

function buildMessagePreview(message?: string | null): string | undefined {
  if (!message) {
    return;
  }
  const lines = String(message)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return;
  }
  return lines.slice(0, 2).join("\n");
}

function resolveGroupUserLabel(
  group: GroupEntry,
  isLocalized: boolean
): string {
  const localizedUnknown = i18n.getMessage("phone_unknown_label", isLocalized);
  const englishUnknown = i18n.getMessage("phone_unknown_label", false);
  const arabicUnknown = i18n.getMessage("phone_unknown_label", true);
  const baseName = group.customerName?.trim();
  const unknownLabels = new Set(
    [localizedUnknown, englishUnknown, arabicUnknown].filter(Boolean)
  );
  const isUnknown = !baseName || unknownLabels.has(baseName);
  if (!isUnknown && baseName) {
    return baseName;
  }
  const formattedWaId = formatPhoneForDisplay(group.waId);
  if (formattedWaId) {
    return `${localizedUnknown} (${formattedWaId})`;
  }
  return localizedUnknown;
}
