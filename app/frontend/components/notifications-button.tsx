"use client";

import { Bell } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

interface NotificationsButtonProps {
	className?: string;
	notificationCount?: number;
}

function Dot({ className = "" }: { className?: string }) {
	return (
		<svg
			width="6"
			height="6"
			fill="currentColor"
			viewBox="0 0 6 6"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<circle cx="3" cy="3" r="3" />
		</svg>
	);
}

export function NotificationsButton({
	className,
	notificationCount: _notificationCount = 0,
}: NotificationsButtonProps) {
	const { isRTL } = useLanguage();
	const [items, setItems] = React.useState<
		Array<{ id: string; text: string; timestamp: number; unread: boolean }>
	>([]);
	const [open, setOpen] = React.useState(false);

	const unreadCount = React.useMemo(
		() => items.filter((n) => n.unread).length,
		[items],
	);

	const formatTimeAgo = React.useCallback(
		(ts: number) => {
			const now = Date.now();
			const diffSec = Math.max(1, Math.floor((now - ts) / 1000));
			if (diffSec < 60) return isRTL ? "قبل ثوانٍ" : "just now";
			const diffMin = Math.floor(diffSec / 60);
			if (diffMin < 60)
				return isRTL ? `${diffMin} دقيقة` : `${diffMin} min ago`;
			const diffHr = Math.floor(diffMin / 60);
			if (diffHr < 24) return isRTL ? `${diffHr} ساعة` : `${diffHr} h ago`;
			const diffDay = Math.floor(diffHr / 24);
			return isRTL ? `${diffDay} يوم` : `${diffDay} d ago`;
		},
		[isRTL],
	);

	React.useEffect(() => {
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
				}
			} catch {}
			const text = (() => {
				if (type === "reservation_created")
					return `${
						isRTL ? "تم إنشاء حجز" : "Reservation created"
					}: ${data.customer_name || data.wa_id} ${data.date ?? ""} ${
						data.time_slot ?? ""
					}`;
				if (type === "reservation_updated" || type === "reservation_reinstated")
					return `${
						isRTL ? "تم تعديل الحجز" : "Reservation modified"
					}: ${data.customer_name || data.wa_id} ${data.date ?? ""} ${
						data.time_slot ?? ""
					}`;
				if (type === "reservation_cancelled")
					return `${
						isRTL ? "تم إلغاء الحجز" : "Reservation cancelled"
					}: ${data.wa_id}`;
				if (type === "conversation_new_message")
					return `${isRTL ? "رسالة جديدة" : "New message"}: ${data.wa_id}`;
				if (type === "vacation_period_updated")
					return isRTL ? "تم تحديث فترات الإجازة" : "Vacation periods updated";
				return String(type);
			})();
			const uniqueId = `${timestamp}:${compositeKey}`;
			setItems((prev) => {
				if (prev.some((i) => i.id === uniqueId)) return prev;
				const shouldMarkUnread = !open; // mirror previous behavior: don't increment when open
				return [
					{ id: uniqueId, text, timestamp, unread: shouldMarkUnread },
					...prev,
				].slice(0, 100);
			});
		};
		window.addEventListener("notification:add", handler as EventListener);
		return () =>
			window.removeEventListener("notification:add", handler as EventListener);
	}, [isRTL, open]);

	const handleMarkAllAsRead = React.useCallback(() => {
		setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
	}, []);

	const handleNotificationClick = React.useCallback((id: string) => {
		setItems((prev) =>
			prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
		);
	}, []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					size="icon"
					variant="outline"
					className={cn("relative", className)}
					aria-label={isRTL ? "الإشعارات" : "Notifications"}
				>
					<Bell className="h-4 w-4" />
					{unreadCount > 0 && (
						<Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
							{unreadCount > 99 ? "99+" : unreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 p-1"
				side="bottom"
				align="end"
				sideOffset={8}
			>
				<div className="flex items-baseline justify-between gap-4 px-3 py-2">
					<div className="text-sm font-semibold">
						{isRTL ? "الإشعارات" : "Notifications"}
					</div>
					{unreadCount > 0 && (
						<button
							type="button"
							className="text-xs font-medium hover:underline"
							onClick={handleMarkAllAsRead}
						>
							{isRTL ? "وضع الكل كمقروء" : "Mark all as read"}
						</button>
					)}
				</div>
				<hr className="bg-border -mx-1 my-1 h-px" />
				{items.map((notification) => (
					<div
						key={notification.id}
						className="hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors"
					>
						<div className="relative flex items-start pe-3">
							<div className="flex-1 space-y-1">
								<button
									type="button"
									className="text-foreground/80 text-left after:absolute after:inset-0"
									onClick={() => handleNotificationClick(notification.id)}
								>
									<span className="text-foreground font-medium">
										{notification.text}
									</span>
								</button>
								<div className="text-muted-foreground text-xs">
									{formatTimeAgo(notification.timestamp)}
								</div>
							</div>
							{notification.unread && (
								<div className="absolute end-0 self-center">
									<span className="sr-only">
										{isRTL ? "غير مقروء" : "Unread"}
									</span>
									<Dot />
								</div>
							)}
						</div>
					</div>
				))}
				{items.length === 0 && (
					<div className="px-3 py-6 text-center text-xs text-muted-foreground">
						{isRTL ? "لا توجد إشعارات" : "No notifications"}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
