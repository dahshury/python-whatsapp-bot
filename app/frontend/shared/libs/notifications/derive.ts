import type {
	GroupEntry,
	ItemEntry,
	NotificationItem,
	RenderEntry,
	ReservationData,
} from "@shared/libs/notifications/types";
import { getWaId } from "@shared/libs/notifications/utils";

function addToGroup(
	groups: Map<
		string,
		{
			items: NotificationItem[];
			latest: NotificationItem;
			customerName: string;
			date: string;
		}
	>,
	item: NotificationItem,
	resolveCustomerName: (
		waId?: string,
		fallbackName?: string
	) => string | undefined
): void {
	const waId = getWaId(item.data);
	if (!waId) {
		return;
	}
	const dateStr = String(
		(item.data as { date?: string } | undefined)?.date || ""
	);
	const key = `${waId}|${dateStr}`;
	const existing = groups.get(key);
	if (existing) {
		existing.items.push(item);
		if (item.timestamp > existing.latest.timestamp) {
			existing.latest = item;
		}
	} else {
		groups.set(key, {
			items: [item],
			latest: item,
			customerName:
				resolveCustomerName(
					(item.data as ReservationData | undefined)?.wa_id,
					(item.data as ReservationData | undefined)?.customer_name
				) || waId,
			date: dateStr,
		});
	}
}

export function deriveNotifications(
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
			addToGroup(groups, it, resolveCustomerName);
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
