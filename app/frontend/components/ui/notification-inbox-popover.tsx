"use client";

import type { LucideIcon } from "lucide-react";
import {
	AlertCircle,
	Bell,
	ClipboardCheck,
	FileText,
	MessageSquareQuote,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { useReservationsData } from "@/lib/websocket-data-provider";

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
	const diffSec = Math.max(1, Math.floor((now - ts) / 1000));
	if (diffSec < 60) return isLocalized ? "قبل ثوانٍ" : "just now";
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60)
		return isLocalized ? `${diffMin} دقيقة` : `${diffMin} min ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return isLocalized ? `${diffHr} ساعة` : `${diffHr} h ago`;
	const diffDay = Math.floor(diffHr / 24);
	return isLocalized ? `${diffDay} يوم` : `${diffDay} d ago`;
}

function NotificationInboxPopover() {
	const { isLocalized } = useLanguage();
	const { reservations } = useReservationsData();
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<NotificationItem[]>([]);
	const [tab, setTab] = useState("all");

	const resolveCustomerName = useCallback(
		(waId?: string, fallbackName?: string): string | undefined => {
			try {
				if (fallbackName && String(fallbackName).trim())
					return String(fallbackName);
				const id = String(waId || "");
				if (!id) return undefined;
				const list =
					(
						reservations as
							| Record<string, Array<{ customer_name?: string }>>
							| undefined
					)?.[id] || [];
				for (const r of list) {
					if (r?.customer_name) return String(r.customer_name);
				}
			} catch {}
			return undefined;
		},
		[reservations],
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
							if (typeof t === "number") return t;
							const tsIso = String(t || "");
							return Number(new Date(tsIso).getTime() || Date.now());
						})();
						const d = (r.data || {}) as ReservationData;
						const compositeKey = `${r.type}:${d?.id ?? d?.wa_id ?? ""}:${
							d?.date ?? ""
						}:${d?.time_slot ?? ""}`;
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
					.slice(0, 2000);
				if (!isCancelled) setItems(loaded);
			} catch {}
		};
		window.addEventListener("notifications:history", fromWs as EventListener);
		// Request history once if WS is open
		try {
			(
				window as unknown as { __notif_history_requested__?: boolean }
			).__notif_history_requested__ =
				(window as unknown as { __notif_history_requested__?: boolean })
					.__notif_history_requested__ || false;
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
							data: { limit: 2000 },
						}),
					);
				}
				(
					window as unknown as { __notif_history_requested__?: boolean }
				).__notif_history_requested__ = true;
			}
		} catch {}
		return () => {
			isCancelled = true;
			window.removeEventListener(
				"notifications:history",
				fromWs as EventListener,
			);
		};
	}, []);

	// Live notifications
	useEffect(() => {
		const handler = (ev: Event) => {
			const { type, data, ts, __local } = (ev as CustomEvent).detail || {};
			if (!type) return;
			const timestamp = Number(ts) || Date.now();
			const compositeKey = `${type}:${data?.id ?? data?.wa_id ?? ""}:${
				data?.date ?? ""
			}:${data?.time_slot ?? ""}`;
			try {
				const localOps: Set<string> | undefined = (
					globalThis as { __localOps?: Set<string> }
				).__localOps;
				const isLocal = __local === true || !!localOps?.has(compositeKey);
				if (isLocal) {
					localOps?.delete(compositeKey);
					return;
				}
			} catch {}
			const uniqueId = `${timestamp}:${compositeKey}`;
			setItems((prev) => {
				if (prev.some((i) => i.id === uniqueId)) return prev;
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
				].slice(0, 2000);
			});
		};
		window.addEventListener("notification:add", handler as EventListener);
		return () =>
			window.removeEventListener("notification:add", handler as EventListener);
	}, [open]);

	const { computedUnreadCount, renderEntries } = useMemo(() => {
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
				if (!waId) continue;
				const dateStr = String(
					(it.data as { date?: string } | undefined)?.date || "",
				);
				const key = `${waId}|${dateStr}`;
				const existing = groups.get(key);
				if (!existing) {
					groups.set(key, {
						items: [it],
						latest: it,
						customerName:
							resolveCustomerName(
								(it.data as ReservationData | undefined)?.wa_id,
								(it.data as ReservationData | undefined)?.customer_name,
							) || waId,
						date: dateStr,
					});
				} else {
					existing.items.push(it);
					if (it.timestamp > existing.latest.timestamp) existing.latest = it;
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
					0,
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
			},
		);

		const nonMsgUnread = nonMessages.reduce(
			(acc, n) => acc + (n.unread ? 1 : 0),
			0,
		);
		const groupUnread = groupEntries.reduce(
			(acc, g) => acc + (g.unreadCount > 0 ? 1 : 0),
			0,
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

		return { computedUnreadCount, renderEntries } as const;
	}, [items, resolveCustomerName]);

	const filteredEntries = useMemo(
		() =>
			tab === "unread"
				? renderEntries.filter((e) =>
						e.kind === "item" ? e.item.unread : e.unreadCount > 0,
					)
				: renderEntries,
		[renderEntries, tab],
	);

	const markAsRead = useCallback((id: string) => {
		setItems((prev) =>
			prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
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
					if (waId) useSidebarChatStore.getState().openConversation(waId);
					setOpen(false);
				}
			} catch {}
		},
		[markAsRead],
	);

	// Map to UI shape (groups + items)
	const uiEntries = useMemo(() => {
		return filteredEntries.map((entry) => {
			if (entry.kind === "item") {
				const n = entry.item;
				const d = (n.data || {}) as ReservationData;
				const customer =
					resolveCustomerName(d.wa_id, d.customer_name) || d.wa_id || "";
				const icon: LucideIcon = (() => {
					if (n.type === "conversation_new_message") return MessageSquareQuote;
					if (
						n.type === "reservation_created" ||
						n.type === "reservation_updated" ||
						n.type === "reservation_reinstated"
					)
						return ClipboardCheck;
					if (n.type === "reservation_cancelled") return AlertCircle;
					if (n.type === "vacation_period_updated") return AlertCircle;
					return FileText;
				})();
				const action = (() => {
					if (n.type === "conversation_new_message")
						return isLocalized ? "أرسل رسالة" : "sent a message";
					if (n.type === "reservation_created")
						return isLocalized ? "تم إنشاء حجز" : "created reservation";
					if (
						n.type === "reservation_updated" ||
						n.type === "reservation_reinstated"
					)
						return isLocalized ? "عدّل الحجز" : "updated reservation";
					if (n.type === "reservation_cancelled")
						return isLocalized ? "ألغى الحجز" : "cancelled reservation";
					if (n.type === "vacation_period_updated")
						return isLocalized ? "تحديث النظام" : "system update";
					return String(n.type || "");
				})();
				const target = (() => {
					if (n.type?.startsWith("reservation_") && (d.date || d.time_slot))
						return `${d.date ?? ""} ${d.time_slot ?? ""}`.trim();
					return "";
				})();
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
			}
			// group entry
			const g = entry as GroupEntry;
			return {
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
			};
		});
	}, [filteredEntries, isLocalized, resolveCustomerName]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					size="icon"
					variant="outline"
					className="relative"
					aria-label={isLocalized ? "الإشعارات" : "Open notifications"}
				>
					<Bell size={16} strokeWidth={2} aria-hidden="true" />
					{computedUnreadCount > 0 && (
						<Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
							{computedUnreadCount > 99 ? "99+" : computedUnreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[380px] p-0">
				{/* Header with Tabs + Mark All */}
				<Tabs value={tab} onValueChange={setTab}>
					<div className="flex items-center justify-between border-b px-3 py-2">
						<TabsList className="bg-transparent">
							<TabsTrigger value="all" className="text-sm">
								All
							</TabsTrigger>
							<TabsTrigger value="unread" className="text-sm">
								Unread{" "}
								{computedUnreadCount > 0 && (
									<Badge className="ml-1">{computedUnreadCount}</Badge>
								)}
							</TabsTrigger>
						</TabsList>
						{computedUnreadCount > 0 && (
							<button
								type="button"
								onClick={markAllAsRead}
								className="text-xs font-medium text-muted-foreground hover:underline"
							>
								Mark all as read
							</button>
						)}
					</div>

					{/* Notifications List */}
					<div className="max-h-80 overflow-y-auto">
						{uiEntries.length === 0 ? (
							<div className="px-3 py-6 text-center text-sm text-muted-foreground">
								No notifications
							</div>
						) : (
							uiEntries.map((n) => {
								const Icon = n.icon;
								return (
									<button
										type="button"
										key={n.id}
										onClick={() => {
											if (n.kind === "group") {
												// mark all in group as read and open chat
												setItems((prev) =>
													prev.map((it) => {
														if (
															it.type === "conversation_new_message" &&
															getWaId(it.data) === n.waId &&
															String(
																(it.data as { date?: string } | undefined)
																	?.date || "",
															) === String(n.date || "")
														)
															return { ...it, unread: false };
														return it;
													}),
												);
												try {
													if (n.waId)
														useSidebarChatStore
															.getState()
															.openConversation(n.waId);
												} catch {}
												setOpen(false);
												return;
											}
											const raw = items.find((it) => it.id === n.id);
											if (raw) onItemClick(raw);
										}}
										className="flex w-full items-start gap-3 border-b px-3 py-3 text-left hover:bg-accent"
									>
										<div className="mt-1 text-muted-foreground">
											<Icon size={18} />
										</div>
										<div className="flex-1 space-y-1">
											<p
												className={`text-sm ${
													n.unread
														? "font-semibold text-foreground"
														: "text-foreground/80"
												}`}
											>
												{n.user} {n.action}{" "}
												{n.kind === "group" ? (
													<Badge variant="secondary" className="ml-1">
														{n.target}
													</Badge>
												) : (
													<span className="font-medium">{n.target}</span>
												)}
											</p>
											<p className="text-xs text-muted-foreground">
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
					<Button variant="ghost" size="sm" className="w-full">
						View all notifications
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export { NotificationInboxPopover };
