import type {
  GroupEntry,
  ItemEntry,
  NotificationItem,
  RenderEntry,
  ReservationData,
} from "@/entities/notification/types";
import { getWaId } from "@/entities/notification/value-objects";
import {
  getUnknownCustomerLabel,
  isSameAsWaId,
} from "@/shared/libs/customer-name";

export function aggregateNotifications(
  items: NotificationItem[],
  resolveCustomerName: (
    waId?: string,
    fallbackName?: string
  ) => string | undefined
): { computedUnreadCount: number; renderEntries: RenderEntry[] } {
  const groups = new Map<
    string,
    {
      items: NotificationItem[];
      latest: NotificationItem;
      customerName: string;
      date: string;
    }
  >();
  const nonMessages: NotificationItem[] = [];

  for (const it of items) {
    if (it.type === "conversation_new_message") {
      const waId = getWaId(it.data);
      if (!waId) {
        continue;
      }
      const dateStr = String(
        (it.data as { date?: string } | undefined)?.date || ""
      );
      const key = `${waId}|${dateStr}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(it);
        if (it.timestamp > existing.latest.timestamp) {
          existing.latest = it;
        }
      } else {
        const resolvedName = resolveCustomerName(
          (it.data as ReservationData | undefined)?.wa_id,
          (it.data as ReservationData | undefined)?.customer_name
        );
        const safeName =
          resolvedName && !isSameAsWaId(resolvedName, waId)
            ? resolvedName
            : getUnknownCustomerLabel();
        groups.set(key, {
          items: [it],
          latest: it,
          customerName: safeName,
          date: dateStr,
        });
      }
    } else {
      nonMessages.push(it);
    }
  }

  const groupEntries: GroupEntry[] = Array.from(groups.entries()).map(
    ([key, g]) => {
      const waId = String(key.split("|")[0] ?? "");
      const unreadCount = g.items.reduce(
        (acc, n) => acc + (n.unread ? 1 : 0),
        0
      );
      return {
        kind: "group",
        waId,
        date: g.date,
        customerName: g.customerName,
        latest: g.latest,
        unreadCount,
        totalCount: g.items.length,
      };
    }
  );

  const nonMsgUnread = nonMessages.reduce(
    (acc, n) => acc + (n.unread ? 1 : 0),
    0
  );
  const groupUnread = groupEntries.reduce(
    (acc, g) => acc + (g.unreadCount > 0 ? 1 : 0),
    0
  );
  const computedUnreadCount = nonMsgUnread + groupUnread;

  const renderEntries: RenderEntry[] = [
    ...nonMessages.map((item) => ({ kind: "item", item }) as ItemEntry),
    ...groupEntries,
  ];
  renderEntries.sort((a, b) => {
    const ta = a.kind === "item" ? a.item.timestamp : a.latest.timestamp;
    const tb = b.kind === "item" ? b.item.timestamp : b.latest.timestamp;
    return tb - ta;
  });

  return { computedUnreadCount, renderEntries };
}
