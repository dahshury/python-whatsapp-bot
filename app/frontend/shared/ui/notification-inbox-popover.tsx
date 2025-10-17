"use client";

import { useReservationsData } from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { isAllowedNotificationEvent } from "@shared/libs/notifications/utils";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import type { LucideIcon } from "lucide-react";
import {
	AlertCircle,
	Bell,
	ClipboardCheck,
	FileText,
	MessageSquareQuote,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

// Constants
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MAX_NOTIFICATION_ITEMS = 2000;

type NotificationItem = {
	id: string;
	text: string;
	timestamp: number;
	unread: boolean;
	type?: string;
	data?: Record<string, unknown>;
};

type GroupEntry = {
	kind: "group";
	waId: string;
	date: string;
	customerName: string;
	latest: NotificationItem;
	unreadCount: number;
	totalCount: number;
};

type ItemEntry = { kind: "item"; item: NotificationItem };
type RenderEntry = GroupEntry | ItemEntry;

type ReservationData = {
	id?: string;
	wa_id?: string;
	customer_name?: string;
	date?: string;
	time_slot?: string;
};

function getWaId(data?: Record<string, unknown>): string {
	try {
		const d = (data || {}) as { wa_id?: unknown; waId?: unknown };
		const val = (d.wa_id ?? d.waId) as unknown;
		return typeof val === "string" ? val : String(val ?? "");
	} catch {
		return "";
	}
}

function formatTimeAgo(isLocalized: boolean, ts: number): string {
	const now = Date.now();
	const diffSec = Math.max(1, Math.floor((now - ts) / MS_PER_SECOND));
	if (diffSec < SECONDS_PER_MINUTE) {
		return isLocalized ? "قبل ثوانٍ" : "just now";
	}
	const diffMin = Math.floor(diffSec / SECONDS_PER_MINUTE);
	if (diffMin < MINUTES_PER_HOUR) {
		return isLocalized ? `${diffMin} دقيقة` : `${diffMin} min ago`;
	}
	const diffHr = Math.floor(diffMin / MINUTES_PER_HOUR);
	if (diffHr < HOURS_PER_DAY) {
		return isLocalized ? `${diffHr} ساعة` : `${diffHr} h ago`;
	}
	const diffDay = Math.floor(diffHr / HOURS_PER_DAY);
	return isLocalized ? `${diffDay} يوم` : `${diffDay} d ago`;
}

function NotificationInboxPopover() {
	const { isLocalized } = useLanguage();
	const { reservations } = useReservationsData();
	const [open, setOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);
	const [items, setItems] = useState<NotificationItem[]>([]);
	const [tab, setTab] = useState("all");

	const resolveCustomerName = useCallback(
		(waId?: string, fallbackName?: string): string | undefined => {
			try {
				if (fallbackName && String(fallbackName).trim()) {
					return String(fallbackName);
				}
				const id = String(waId || "");
				if (!id) {
					return;
				}
				const list =
					(
						reservations as
							| Record<string, Array<{ customer_name?: string }>>
							| undefined
					)?.[id] || [];
				for (const r of list) {
					if (r?.customer_name) {
						return String(r.customer_name);
					}
				}
			} catch {
				// Silently ignore any error during customer name resolution
			}
			return;
		},
		[reservations]
	);

	// Load notifications history via WS
	useEffect(() => {
		let isCancelled = false;
		const fromWs = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| {
							items?: Array<{
								id?: number | string;
								type?: string;
								timestamp?: string | number;
								data?: Record<string, unknown>;
							}>;
					  }
					| undefined;
				const list = (
					detail && Array.isArray(detail.items) ? detail.items : []
				) as Array<{
					id?: number | string;
					type?: string;
					timestamp?: string | number;
					data?: Record<string, unknown>;
				}>;
				const loaded: NotificationItem[] = list
					.map((r) => {
						const tsNum = (() => {
							const t = r.timestamp as string | number | undefined;
							if (typeof t === "number") {
								return t;
							}
							const tsIso = String(t || "");
							return Number(new Date(tsIso).getTime() || Date.now());
						})();
						const d = (r.data || {}) as ReservationData;
						const compositeKey = `${r.type}:${d?.id ?? d?.wa_id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`;
						return {
							id: `${tsNum}:${compositeKey}`,
							text: String(r.type || ""),
							timestamp: tsNum,
							unread: false,
							type: String(r.type || ""),
							data: d,
						};
					})
					.sort((a, b) => b.timestamp - a.timestamp)
					.slice(0, MAX_NOTIFICATION_ITEMS);
				if (!isCancelled) {
					setItems(loaded);
				}
			} catch {
				// Silently ignore errors from WebSocket history event parsing
			}
		};
		window.addEventListener("notifications:history", fromWs as EventListener);
		// Request history once if WS is open
		try {
			(
				window as unknown as { __notif_history_requested__?: boolean }
			).__notif_history_requested__ = true;
			const already = (
				window as unknown as {
					__notif_history_requested__?: boolean;
				}
			).__notif_history_requested__;
			if (!already) {
				const wsRef = (
					globalThis as {
						__wsConnection?: { current?: WebSocket };
					}
				).__wsConnection;
				if (wsRef?.current?.readyState === WebSocket.OPEN) {
					wsRef.current.send(
						JSON.stringify({
							type: "get_notifications",
							data: { limit: MAX_NOTIFICATION_ITEMS },
						})
					);
				}
				(
					window as unknown as { __notif_history_requested__?: boolean }
				).__notif_history_requested__ = true;
			}
		} catch {
			// Silently ignore errors when requesting WebSocket history
		}
		return () => {
			isCancelled = true;
			window.removeEventListener(
				"notifications:history",
				fromWs as EventListener
			);
		};
	}, []);

	// Helper to process local operation tracking
	const isLocalNotification = useCallback(
		(compositeKey: string, isLocalFlag: boolean): boolean => {
			try {
				const localOps: Set<string> | undefined = (
					globalThis as { __localOps?: Set<string> }
				).__localOps;
				const isLocal = isLocalFlag === true || !!localOps?.has(compositeKey);
				if (isLocal) {
					localOps?.delete(compositeKey);
				}
				return isLocal;
			} catch {
				// Silently ignore errors when accessing global operations tracking
			}
			return false;
		},
		[]
	);

	// Live notifications
	useEffect(() => {
		const handler = (ev: Event) => {
			const { type, data, ts, __local } = (ev as CustomEvent).detail || {};
			if (!type) {
				return;
			}
			const timestamp = Number(ts) || Date.now();
			const compositeKey = `${type}:${data?.id ?? data?.wa_id ?? ""}:${data?.date ?? ""}:${data?.time_slot ?? ""}`;

			if (isLocalNotification(compositeKey, __local === true)) {
				return;
			}

			// Enforce a strict allow-list via shared policy
			if (!isAllowedNotificationEvent(type, data as Record<string, unknown>)) {
				return;
			}
			const uniqueId = `${timestamp}:${compositeKey}`;
			setItems((prev) => {
				if (prev.some((i) => i.id === uniqueId)) {
					return prev;
				}
				const shouldMarkUnread = !open;
				return [
					{
						id: uniqueId,
						text: String(type),
						timestamp,
						unread: shouldMarkUnread,
						type: String(type),
						data: data as Record<string, unknown>,
					},
					...prev,
				].slice(0, MAX_NOTIFICATION_ITEMS);
			});
		};
		window.addEventListener("notification:add", handler as EventListener);
		return () =>
			window.removeEventListener("notification:add", handler as EventListener);
	}, [open, isLocalNotification]);

	// Helper to process individual notification item and add to groups or non-messages
	const processNotificationItem = useCallback(
		(
			it: NotificationItem,
			groups: Map<
				string,
				{
					items: NotificationItem[];
					latest: NotificationItem;
					customerName: string;
					date: string;
				}
			>,
			nonMessages: NotificationItem[]
		) => {
			if (it.type !== "conversation_new_message") {
				nonMessages.push(it);
				return;
			}

			const waId = getWaId(it.data);
			if (!waId) {
				return;
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
				groups.set(key, {
					items: [it],
					latest: it,
					customerName:
						resolveCustomerName(
							(it.data as ReservationData | undefined)?.wa_id,
							(it.data as ReservationData | undefined)?.customer_name
						) || waId,
					date: dateStr,
				});
			}
		},
		[resolveCustomerName]
	);

	// Helper to group conversation messages and separate non-message notifications
	const groupConversationMessages = useCallback(
		(
			notificationItems: NotificationItem[]
		): {
			groups: Map<
				string,
				{
					items: NotificationItem[];
					latest: NotificationItem;
					customerName: string;
					date: string;
				}
			>;
			nonMessages: NotificationItem[];
		} => {
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

			for (const it of notificationItems) {
				processNotificationItem(it, groups, nonMessages);
			}

			return { groups, nonMessages };
		},
		[processNotificationItem]
	);

	// Helper to create group entries
	const createGroupEntries = useCallback(
		(
			groups: Map<
				string,
				{
					items: NotificationItem[];
					latest: NotificationItem;
					customerName: string;
					date: string;
				}
			>
		): GroupEntry[] =>
			Array.from(groups.entries()).map(([key, g]) => {
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
			}),
		[]
	);

	const { computedUnreadCount, renderEntries } = useMemo(() => {
		const { groups, nonMessages } = groupConversationMessages(items);
		const groupEntries = createGroupEntries(groups);

		const nonMsgUnread = nonMessages.reduce(
			(acc, n) => acc + (n.unread ? 1 : 0),
			0
		);
		const groupUnread = groupEntries.reduce(
			(acc, g) => acc + (g.unreadCount > 0 ? 1 : 0),
			0
		);
		const totalUnreadCount = nonMsgUnread + groupUnread;

		const entries: RenderEntry[] = [
			...nonMessages.map((item) => ({ kind: "item", item }) as ItemEntry),
			...groupEntries,
		];
		entries.sort((a, b) => {
			const ta = a.kind === "item" ? a.item.timestamp : a.latest.timestamp;
			const tb = b.kind === "item" ? b.item.timestamp : b.latest.timestamp;
			return tb - ta;
		});

		return {
			computedUnreadCount: totalUnreadCount,
			renderEntries: entries,
		} as const;
	}, [items, groupConversationMessages, createGroupEntries]);

	const filteredEntries = useMemo(
		() =>
			tab === "unread"
				? renderEntries.filter((e) =>
						e.kind === "item" ? e.item.unread : e.unreadCount > 0
					)
				: renderEntries,
		[renderEntries, tab]
	);

	const markAsRead = useCallback((id: string) => {
		setItems((prev) =>
			prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
		);
	}, []);

	const markAllAsRead = useCallback(() => {
		setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
	}, []);

	const onItemClick = useCallback(
		(n: NotificationItem) => {
			markAsRead(n.id);
			try {
				if (n.type === "conversation_new_message" && n.data) {
					const waId = getWaId(n.data);
					if (waId) {
						useSidebarChatStore.getState().openConversation(waId);
					}
				}
			} catch {
				// Silently ignore errors when opening conversation
			}
			// Always close popover after clicking any notification
			setOpen(false);
		},
		[markAsRead]
	);

	// Helper to determine icon based on notification type
	const getNotificationIcon = useCallback(
		(notificationType?: string): LucideIcon => {
			switch (notificationType) {
				case "conversation_new_message":
					return MessageSquareQuote;
				case "reservation_created":
				case "reservation_updated":
				case "reservation_reinstated":
					return ClipboardCheck;
				case "reservation_cancelled":
				case "vacation_period_updated":
					return AlertCircle;
				default:
					return FileText;
			}
		},
		[]
	);

	// Helper to determine action text based on notification type
	const getNotificationAction = useCallback(
		(notificationType?: string): string => {
			const actionMap: Record<string, { en: string; ar: string }> = {
				conversation_new_message: {
					en: "sent a message",
					ar: "أرسل رسالة",
				},
				reservation_created: {
					en: "created reservation",
					ar: "تم إنشاء حجز",
				},
				reservation_updated: {
					en: "updated reservation",
					ar: "عدّل الحجز",
				},
				reservation_reinstated: {
					en: "updated reservation",
					ar: "عدّل الحجز",
				},
				reservation_cancelled: {
					en: "cancelled reservation",
					ar: "ألغى الحجز",
				},
				vacation_period_updated: {
					en: "system update",
					ar: "تحديث النظام",
				},
			};

			const action = actionMap[notificationType || ""];
			if (!action) {
				return String(notificationType || "");
			}
			return isLocalized ? action.ar : action.en;
		},
		[isLocalized]
	);

	// Helper to determine target text based on notification type and data
	const getNotificationTarget = useCallback(
		(
			notificationType: string | undefined,
			data: Record<string, unknown>
		): string => {
			if (notificationType?.startsWith("reservation_")) {
				const d = data as ReservationData;
				return `${d.date ?? ""} ${d.time_slot ?? ""}`.trim();
			}
			return "";
		},
		[]
	);

	// Helper to handle group notification click
	const handleGroupClick = useCallback((groupEntry: GroupEntry) => {
		// Mark all items in this group as read
		setItems((prev) =>
			prev.map((it) => {
				if (
					it.type === "conversation_new_message" &&
					getWaId(it.data) === groupEntry.waId &&
					String((it.data as { date?: string } | undefined)?.date || "") ===
						String(groupEntry.date || "")
				) {
					return { ...it, unread: false };
				}
				return it;
			})
		);

		// Open the conversation
		try {
			if (groupEntry.waId) {
				useSidebarChatStore.getState().openConversation(groupEntry.waId);
			}
		} catch {
			// Silently ignore errors when opening group conversation
		}

		// Close popover
		setOpen(false);
	}, []);

	// Helper to create UI item entry from notification item
	const createItemEntry = useCallback(
		(n: NotificationItem) => {
			const d = (n.data || {}) as ReservationData;
			const customer =
				resolveCustomerName(d.wa_id, d.customer_name) || d.wa_id || "";
			const icon = getNotificationIcon(n.type);
			const action = getNotificationAction(n.type);
			const target = getNotificationTarget(n.type, d);

			return {
				kind: "item" as const,
				id: n.id,
				user: customer || (isLocalized ? "العميل" : "Customer"),
				action,
				target,
				timestamp: formatTimeAgo(isLocalized, n.timestamp),
				unread: n.unread,
				icon,
			};
		},
		[
			isLocalized,
			resolveCustomerName,
			getNotificationIcon,
			getNotificationAction,
			getNotificationTarget,
		]
	);

	// Helper to create UI group entry from group entry
	const createGroupUIEntry = useCallback(
		(g: GroupEntry) => ({
			kind: "group" as const,
			id: `group:${g.waId}|${g.date}`,
			user: g.customerName || (isLocalized ? "العميل" : "Customer"),
			action: isLocalized ? "رسائل" : "messages",
			target: `${g.totalCount}`,
			timestamp: formatTimeAgo(isLocalized, g.latest.timestamp),
			unread: g.unreadCount > 0,
			icon: MessageSquareQuote as LucideIcon,
			waId: g.waId,
			date: g.date,
		}),
		[isLocalized]
	);

	// Map to UI shape (groups + items)
	const uiEntries = useMemo(() => {
		return filteredEntries.map((entry) => {
			if (entry.kind === "item") {
				return createItemEntry(entry.item);
			}
			// group entry
			return createGroupUIEntry(entry as GroupEntry);
		});
	}, [filteredEntries, createItemEntry, createGroupUIEntry]);

	if (!isMounted) {
		return null;
	}

	const MAX_UNREAD_DISPLAY = 99;

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-label={isLocalized ? "الإشعارات" : "Open notifications"}
					className="relative"
					size="icon"
					variant="outline"
				>
					<Bell aria-hidden="true" size={16} strokeWidth={2} />
					{computedUnreadCount > 0 && (
						<Badge className="-top-2 -translate-x-1/2 absolute left-full min-w-5 px-1">
							{computedUnreadCount > MAX_UNREAD_DISPLAY
								? `${MAX_UNREAD_DISPLAY}+`
								: computedUnreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[380px] p-0">
				{/* Header with Tabs + Mark All */}
				<Tabs onValueChange={setTab} value={tab}>
					<div className="flex items-center justify-between border-b px-3 py-2">
						<TabsList className="bg-transparent">
							<TabsTrigger className="text-sm" value="all">
								{i18n.getMessage("all", isLocalized)}
							</TabsTrigger>
							<TabsTrigger className="text-sm" value="unread">
								{i18n.getMessage("unread", isLocalized)}{" "}
								{computedUnreadCount > 0 && (
									<Badge className="ml-1">{computedUnreadCount}</Badge>
								)}
							</TabsTrigger>
						</TabsList>
						{computedUnreadCount > 0 && (
							<button
								className="font-medium text-muted-foreground text-xs hover:underline"
								onClick={markAllAsRead}
								type="button"
							>
								{i18n.getMessage("mark_all_as_read", isLocalized)}
							</button>
						)}
					</div>

					{/* Notifications List */}
					<div className="max-h-80 overflow-y-auto">
						{uiEntries.length === 0 ? (
							<div className="px-3 py-6 text-center text-muted-foreground text-sm">
								{i18n.getMessage("no_notifications", isLocalized)}
							</div>
						) : (
							uiEntries.map((n) => {
								const Icon = n.icon;
								return (
									<button
										className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-accent"
										key={n.id}
										onClick={() => {
											if (n.kind === "group") {
												handleGroupClick(n as unknown as GroupEntry);
											} else {
												const raw = items.find((it) => it.id === n.id);
												if (raw) {
													onItemClick(raw);
												}
											}
										}}
										type="button"
									>
										<div className="mt-1 text-muted-foreground">
											<Icon size={18} />
										</div>
										<div className="flex-1 space-y-1">
											<p
												className={`text-sm ${n.unread ? "font-semibold text-foreground" : "text-foreground/80"}`}
											>
												{n.user} {n.action}{" "}
												{n.kind === "group" ? (
													<Badge className="ml-1" variant="secondary">
														{n.target}
													</Badge>
												) : (
													<span className="font-medium">{n.target}</span>
												)}
											</p>
											<p className="text-muted-foreground text-xs">
												{n.timestamp}
											</p>
										</div>
										{n.unread && (
											<span className="mt-1 inline-block size-2 rounded-full bg-primary" />
										)}
									</button>
								);
							})
						)}
					</div>
				</Tabs>

				{/* Footer */}
				<div className="px-3 py-2 text-center">
					<Button className="w-full" size="sm" variant="ghost">
						{i18n.getMessage("view_all_notifications", isLocalized)}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export { NotificationInboxPopover };
