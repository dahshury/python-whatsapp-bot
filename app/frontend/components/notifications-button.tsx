"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { callPythonBackend } from "@/lib/backend";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
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

type NotificationItem = {
	id: string;
	text: string;
	timestamp: number;
	unread: boolean;
	type?: string;
	data?: Record<string, unknown>;
};

type ReservationData = {
	id?: string;
	wa_id?: string;
	customer_name?: string;
	date?: string;
	time_slot?: string;
};

export function NotificationsButton({
	className,
	notificationCount: _notificationCount = 0,
}: NotificationsButtonProps) {
	const { isLocalized } = useLanguage();
	const [items, setItems] = React.useState<NotificationItem[]>([]);
	const [open, setOpen] = React.useState(false);

	// Load persisted notifications from backend on mount
	React.useEffect(() => {
		let isCancelled = false;
		(async () => {
			try {
				const resp = await callPythonBackend<{
					success?: boolean;
					data?: Array<{
						id: number;
						type: string;
						timestamp: string;
						data: Record<string, unknown>;
					}>;
					message?: string;
				}>("/notifications");
				const list = Array.isArray(resp?.data) ? resp.data : [];
				const loaded: NotificationItem[] = list
					.map((r) => {
						const tsIso = String(r.timestamp || "");
						const tsNum = Number(new Date(tsIso).getTime() || Date.now());
						const d = (r.data || {}) as ReservationData;
						const compositeKey = `${r.type}:${d?.id ?? d?.wa_id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`;
						return {
						id: `${tsNum}:${compositeKey}`,
						text: (() => {
							if (r.type === "reservation_created")
								return `${isLocalized ? "تم إنشاء حجز" : "Reservation created"}: ${
									d.customer_name || d.wa_id
								} ${d.date ?? ""} ${d.time_slot ?? ""}`;
							if (
								r.type === "reservation_updated" ||
								r.type === "reservation_reinstated"
							)
								return `${isLocalized ? "تم تعديل الحجز" : "Reservation modified"}: ${
									d.customer_name || d.wa_id
								} ${d.date ?? ""} ${d.time_slot ?? ""}`;
							if (r.type === "reservation_cancelled")
								return `${isLocalized ? "تم إلغاء الحجز" : "Reservation cancelled"}: ${d.wa_id}`;
							if (r.type === "conversation_new_message")
								return `${isLocalized ? "رسالة جديدة" : "New message"}: ${d.wa_id}`;
							if (r.type === "vacation_period_updated")
								return isLocalized
									? "تم تحديث فترات الإجازة"
									: "Vacation periods updated";
							return String(r.type);
						})(),
						timestamp: tsNum,
						unread: false,
						type: r.type,
						data: d,
					};
				})
				.filter((notification) => {
					// Filter out notifications that match recent local operations
					try {
						// Check if this notification matches any recently marked local operations
						const localOps = (globalThis as { __localOps?: Set<string> }).__localOps;
						if (!localOps || localOps.size === 0) return true;
						
						// Generate possible local operation keys for this notification
						const d = notification.data;
						const candidates = [
							`${notification.type}:${d?.id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`,
							`${notification.type}:${d?.wa_id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`,
						];
						
						// If any candidate matches a local operation, filter out this notification
						for (const candidate of candidates) {
							if (localOps.has(candidate)) {
								console.log("🔇 [NotificationsButton] Filtered out local operation:", {
									candidate,
									notification: notification.text
								});
								return false;
							}
						}
						return true;
					} catch {
						return true; // If error, show the notification
					}
				});
				loaded.sort((a, b) => b.timestamp - a.timestamp);
				if (!isCancelled) setItems(loaded.slice(0, 150));
			} catch {}
		})();
		return () => {
			isCancelled = true;
		};
	}, [isLocalized]);

	const unreadCount = React.useMemo(
		() => items.filter((n) => n.unread).length,
		[items],
	);

	const formatTimeAgo = React.useCallback(
		(ts: number) => {
			const now = Date.now();
			const diffSec = Math.max(1, Math.floor((now - ts) / 1000));
			if (diffSec < 60) return isLocalized ? "قبل ثوانٍ" : "just now";
			const diffMin = Math.floor(diffSec / 60);
			if (diffMin < 60)
				return isLocalized ? `${diffMin} دقيقة` : `${diffMin} min ago`;
			const diffHr = Math.floor(diffMin / 60);
			if (diffHr < 24)
				return isLocalized ? `${diffHr} ساعة` : `${diffHr} h ago`;
			const diffDay = Math.floor(diffHr / 24);
			return isLocalized ? `${diffDay} يوم` : `${diffDay} d ago`;
		},
		[isLocalized],
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
					// Clear local marker and suppress adding to notifications panel
					localOps?.delete(compositeKey);
					return;
				}
			} catch {}

			// Suppress assistant-authored chat messages in notifications panel only
			if (type === "conversation_new_message") {
				try {
					const role = String(
						(data as { role?: string; sender?: string })?.role ||
							(data as { role?: string; sender?: string })?.sender ||
							"",
					).toLowerCase();
					if (role && role !== "user" && role !== "customer") {
						return;
					}
				} catch {}
			}
			const text = (() => {
				if (type === "reservation_created")
					return `${
						isLocalized ? "تم إنشاء حجز" : "Reservation created"
					}: ${data.customer_name || data.wa_id} ${data.date ?? ""} ${
						data.time_slot ?? ""
					}`;
				if (type === "reservation_updated" || type === "reservation_reinstated")
					return `${
						isLocalized ? "تم تعديل الحجز" : "Reservation modified"
					}: ${data.customer_name || data.wa_id} ${data.date ?? ""} ${
						data.time_slot ?? ""
					}`;
				if (type === "reservation_cancelled")
					return `${
						isLocalized ? "تم إلغاء الحجز" : "Reservation cancelled"
					}: ${data.wa_id}`;
				if (type === "conversation_new_message")
					return `${isLocalized ? "رسالة جديدة" : "New message"}: ${data.wa_id}`;
				if (type === "vacation_period_updated")
					return isLocalized
						? "تم تحديث فترات الإجازة"
						: "Vacation periods updated";
				return String(type);
			})();
			const uniqueId = `${timestamp}:${compositeKey}`;
			setItems((prev) => {
				if (prev.some((i) => i.id === uniqueId)) return prev;
				const shouldMarkUnread = !open; // mirror previous behavior: don't increment when open
				return [
					{
						id: uniqueId,
						text,
						timestamp,
						unread: shouldMarkUnread,
						type: String(type),
						data: data as Record<string, unknown>,
					},
					...prev,
				].slice(0, 150);
			});
		};
		window.addEventListener("notification:add", handler as EventListener);
		return () =>
			window.removeEventListener("notification:add", handler as EventListener);
	}, [isLocalized, open]);

	const handleMarkAllAsRead = React.useCallback(() => {
		setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
	}, []);

	const handleNotificationClick = React.useCallback(
		(notification: NotificationItem) => {
			// Mark as read
			setItems((prev) =>
				prev.map((n) =>
					n.id === notification.id ? { ...n, unread: false } : n,
				),
			);

			// If this is a conversation message, open the chat and scroll to it
			try {
				if (
					notification.type === "conversation_new_message" &&
					notification.data
				) {
					const data = notification.data as {
						wa_id?: string;
						waId?: string;
						date?: string;
						time?: string;
						message?: string;
						role?: string;
					};
					const waId = String(data.wa_id || data.waId || "");
					if (waId) {
						// Request opening the conversation via the centralized store
						useSidebarChatStore.getState().openConversation(waId);
						// Stash target globally in case the event is fired before listeners attach
						try {
							(
								globalThis as unknown as { __chatScrollTarget?: unknown }
							).__chatScrollTarget = {
								waId,
								date: data.date,
								time: data.time,
								message: data.message,
							};
						} catch {}
						// Ask the chat to scroll to this message once ready
						try {
							const evt = new CustomEvent("chat:scrollToMessage", {
								detail: {
									wa_id: waId,
									date: data.date,
									time: data.time,
									message: data.message,
								},
							});
							window.dispatchEvent(evt);
						} catch {}
					}
				}
			} catch {}

			// Close popover
			setOpen(false);
		},
		[],
	);

	// Animation variants for list items: no position shift, just opacity/blur
	const listVariants = React.useMemo(
		() => ({
			hidden: {
				transition: { staggerChildren: 0.0 },
			},
			shown: {
				transition: { staggerChildren: 0.015 },
			},
		}),
		[],
	);

	const itemVariants = React.useMemo(
		() => ({
			hidden: { opacity: 0, filter: "blur(6px)" },
			shown: { opacity: 1, filter: "blur(0px)" },
		}),
		[],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					size="icon"
					variant="outline"
					className={cn("relative", className)}
					aria-label={isLocalized ? "الإشعارات" : "Notifications"}
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
				forceMount
			>
				<AnimatePresence mode="sync">
					{open && (
						<motion.div
							key="notifications-panel"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.18, ease: [0.45, 0, 0.55, 1] }}
							style={{ overflow: "hidden", willChange: "height, opacity" }}
						>
							{/* Clip-path reveal of contents from top to bottom with slight blur fade */}
							<motion.div
								initial={{
									clipPath: "inset(0% 0% 100% 0%)",
									filter: "blur(8px)",
									opacity: 0,
								}}
								animate={{
									clipPath: "inset(0% 0% 0% 0%)",
									filter: "blur(0px)",
									opacity: 1,
								}}
								exit={{
									clipPath: "inset(0% 0% 100% 0%)",
									filter: "blur(6px)",
									opacity: 0,
								}}
								transition={{ duration: 0.16, ease: [0.45, 0, 0.55, 1] }}
								style={{ willChange: "clip-path, filter, opacity" }}
							>
								<div className="flex items-baseline justify-between gap-4 px-3 py-2">
									<div className="text-sm font-semibold">
										{isLocalized ? "الإشعارات" : "Notifications"}
									</div>
									{unreadCount > 0 && (
										<button
											type="button"
											className="text-xs font-medium hover:underline"
											onClick={handleMarkAllAsRead}
										>
											{isLocalized ? "وضع الكل كمقروء" : "Mark all as read"}
										</button>
									)}
								</div>
								<hr className="bg-border -mx-1 my-1 h-px" />

								<motion.div
									variants={listVariants}
									initial="hidden"
									animate="shown"
								>
									{items.map((notification) => (
										<motion.div
											key={notification.id}
											variants={itemVariants}
											transition={{ duration: 0.14, ease: [0.45, 0, 0.55, 1] }}
											className="hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors"
										>
											<div className="relative flex items-start pe-3">
												<div className="flex-1 space-y-1">
													<button
														type="button"
														className="text-foreground/80 text-left after:absolute after:inset-0"
														onClick={() =>
															handleNotificationClick(notification)
														}
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
															{isLocalized ? "غير مقروء" : "Unread"}
														</span>
														<Dot />
													</div>
												)}
											</div>
										</motion.div>
									))}
								</motion.div>

								{items.length === 0 && (
									<motion.div
										initial={{ opacity: 0, filter: "blur(6px)" }}
										animate={{ opacity: 1, filter: "blur(0px)" }}
										transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
										className="px-3 py-6 text-center text-xs text-muted-foreground"
									>
										{isLocalized ? "لا توجد إشعارات" : "No notifications"}
									</motion.div>
								)}
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</PopoverContent>
		</Popover>
	);
}
