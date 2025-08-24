"use client";

import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import React from "react";

interface NotificationsButtonProps {
	className?: string;
	notificationCount?: number;
}

export function NotificationsButton({
	className,
	notificationCount = 0,
}: NotificationsButtonProps) {
	const { isRTL } = useLanguage();
	const [items, setItems] = React.useState<Array<{ id: number; text: string }>>([]);
	const [unreadCount, setUnreadCount] = React.useState<number>(0);
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		const handler = (ev: Event) => {
			const { type, data, ts } = (ev as CustomEvent).detail || {};
			if (!type) return;
			const id = ts || Date.now();
			// Suppress increments for locally-initiated operations
			try {
				const key = `${type}:${data?.id ?? ""}:${data?.date ?? ""}:${data?.time_slot ?? ""}`;
				const localOps: Set<string> | undefined = (globalThis as any).__localOps;
				if (localOps?.has(key)) {
					localOps.delete(key);
				} else {
					setUnreadCount((c) => c + 1);
				}
			} catch {}
			const text = (() => {
				if (type === "reservation_created") return `${isRTL ? "تم إنشاء حجز" : "Reservation created"}: ${data.customer_name || data.wa_id} ${data.date ?? ""} ${data.time_slot ?? ""}`;
				if (type === "reservation_updated" || type === "reservation_reinstated") return `${isRTL ? "تم تعديل الحجز" : "Reservation updated"}: ${data.customer_name || data.wa_id} ${data.date ?? ""} ${data.time_slot ?? ""}`;
				if (type === "reservation_cancelled") return `${isRTL ? "تم إلغاء الحجز" : "Reservation cancelled"}: ${data.wa_id}`;
				if (type === "conversation_new_message") return `${isRTL ? "رسالة جديدة" : "New message"}: ${data.wa_id}`;
				if (type === "vacation_period_updated") return isRTL ? "تم تحديث فترات الإجازة" : "Vacation periods updated";
				return String(type);
			})();
			setItems((prev) => [{ id, text }, ...prev].slice(0, 100));
		};
		window.addEventListener("notification:add", handler as EventListener);
		return () => window.removeEventListener("notification:add", handler as EventListener);
	}, [isRTL]);

	return (
		<Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setUnreadCount(0); }}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"relative h-10 w-10 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors duration-200",
						className,
					)}
					aria-label={isRTL ? "الإشعارات" : "Notifications"}
					onPointerDown={(e) => {
						if (open) {
							e.preventDefault();
							e.stopPropagation();
						}
					}}
					onClick={(e) => {
						if (open) {
							e.preventDefault();
							e.stopPropagation();
						}
					}}
				>
					<Bell className="h-4 w-4" />
					{(notificationCount || unreadCount || items.length) > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
						>
							{(notificationCount || unreadCount || items.length) > 99 ? "99+" : (notificationCount || unreadCount || items.length)}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 p-0"
				side="bottom"
				align="end"
				sideOffset={8}
			>
				<div className="p-4 border-b">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold">
							{isRTL ? "الإشعارات" : "Notifications"}
						</h3>
						{(notificationCount || unreadCount || items.length) > 0 && (
							<Badge variant="secondary" className="text-xs">
								{notificationCount || unreadCount || items.length}
							</Badge>
						)}
					</div>
				</div>

				<ScrollArea className="h-[300px] w-full">
					<div className="p-4 space-y-2">
						{items.length === 0 ? (
							<div className="text-center py-8">
								<Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
								<p className="text-sm text-muted-foreground">
									{isRTL ? "لا توجد إشعارات جديدة" : "No new notifications"}
								</p>
							</div>
						) : (
							items.map((it) => (
								<div key={it.id} className="text-sm border-b last:border-b-0 pb-2">
									{it.text}
								</div>
							))
						)}
					</div>
				</ScrollArea>
			</PopoverContent>
		</Popover>
	);
}
