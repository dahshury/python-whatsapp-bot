"use client";

import { itemVariants, listVariants } from "@shared/libs/animation/variants";
import { i18n } from "@shared/libs/i18n";
import { deriveNotifications } from "@shared/libs/notifications/derive";
import { formatTimeAgo as formatTimeAgoUtil } from "@shared/libs/notifications/formatters";
import type { NotificationItem } from "@shared/libs/notifications/types";
import { useLanguage } from "@shared/libs/state/language-context";
import { cn } from "@shared/libs/utils";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import React from "react";
// hashToHue is now used inside NotificationGroupRow; no direct usage here
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { NotificationGroupRow } from "@/widgets/notifications/components/notification-group-row";
import { NotificationItemRow } from "@/widgets/notifications/components/notification-item-row";
import { useNotificationAddListener } from "@/widgets/notifications/hooks/use-notification-add-listener";
import { useNotificationHandlers } from "@/widgets/notifications/hooks/use-notification-handlers";
import { useNotificationsHistory } from "@/widgets/notifications/hooks/use-notifications-history";
// Dot is now used inside row components; no direct usage here
import { useResolveCustomerName } from "@/widgets/notifications/hooks/use-resolve-customer-name";

type NotificationsButtonProps = {
	className?: string;
	notificationCount?: number;
};

// Animation timing constants
const PANEL_ANIMATION_DURATION = 0.18;
const CONTENT_ANIMATION_DURATION = 0.16;
const NO_NOTIFICATIONS_ANIMATION_DURATION = 0.2;

// Animation easing curves
const EASE_CURVE_STANDARD_X1 = 0.45;
const EASE_CURVE_STANDARD_Y1 = 0;
const EASE_CURVE_STANDARD_X2 = 0.55;
const EASE_CURVE_STANDARD_Y2 = 1;
const EASE_CURVE_STANDARD = [
	EASE_CURVE_STANDARD_X1,
	EASE_CURVE_STANDARD_Y1,
	EASE_CURVE_STANDARD_X2,
	EASE_CURVE_STANDARD_Y2,
] as const;

const EASE_CURVE_EMPHASIS_X1 = 0.16;
const EASE_CURVE_EMPHASIS_Y1 = 1;
const EASE_CURVE_EMPHASIS_X2 = 0.3;
const EASE_CURVE_EMPHASIS_Y2 = 1;
const EASE_CURVE_EMPHASIS = [
	EASE_CURVE_EMPHASIS_X1,
	EASE_CURVE_EMPHASIS_Y1,
	EASE_CURVE_EMPHASIS_X2,
	EASE_CURVE_EMPHASIS_Y2,
] as const;

// Display constants
const MAX_UNREAD_DISPLAY = 99;

export function NotificationsButton({
	className,
	notificationCount: _notificationCount = 0,
}: NotificationsButtonProps) {
	const { isLocalized } = useLanguage();
	const [items, setItems] = React.useState<NotificationItem[]>([]);
	const [open, setOpen] = React.useState(false);

	const resolveCustomerName = useResolveCustomerName();
	useNotificationsHistory({ setItems, isLocalized, resolveCustomerName });

	// Compute grouped entries and unread count using shared derive util
	const { computedUnreadCount, renderEntries } = React.useMemo(
		() => deriveNotifications(items, resolveCustomerName),
		[items, resolveCustomerName]
	);

	const formatTimeAgo = React.useCallback(
		(ts: number) => formatTimeAgoUtil(ts),
		[]
	);

	useNotificationAddListener({
		open,
		isLocalized,
		resolveCustomerName,
		setItems,
	});

	const { handleMarkAllAsRead, handleNotificationClick, handleGroupClick } =
		useNotificationHandlers({
			setItems,
			setOpen,
		});

	// Animation variants moved to shared libs

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-label={i18n.getMessage("notifications", isLocalized)}
					className={cn("relative shadow-xs", className)}
					size="icon"
					variant="outline"
				>
					<Bell className="h-4 w-4" />
					{computedUnreadCount > 0 && (
						<Badge className="-top-2 -translate-x-1/2 absolute left-full min-w-5 px-1">
							{computedUnreadCount > MAX_UNREAD_DISPLAY
								? `${MAX_UNREAD_DISPLAY}+`
								: computedUnreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-80 p-1 shadow-lg"
				forceMount
				side="bottom"
				sideOffset={8}
			>
				<AnimatePresence mode="sync">
					{open && (
						<motion.div
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							initial={{ opacity: 0, height: 0 }}
							key="notifications-panel"
							style={{ overflow: "hidden", willChange: "height, opacity" }}
							transition={{
								duration: PANEL_ANIMATION_DURATION,
								ease: EASE_CURVE_STANDARD,
							}}
						>
							{/* Clip-path reveal of contents from top to bottom with slight blur fade */}
							<motion.div
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
								initial={{
									clipPath: "inset(0% 0% 100% 0%)",
									filter: "blur(8px)",
									opacity: 0,
								}}
								style={{ willChange: "clip-path, filter, opacity" }}
								transition={{
									duration: CONTENT_ANIMATION_DURATION,
									ease: EASE_CURVE_STANDARD,
								}}
							>
								<div className="flex items-baseline justify-between gap-4 px-3 py-2">
									<div className="font-semibold text-sm">
										{i18n.getMessage("notifications", isLocalized)}
									</div>
									{computedUnreadCount > 0 && (
										<button
											className="font-medium text-xs hover:underline"
											onClick={handleMarkAllAsRead}
											type="button"
										>
											{i18n.getMessage("mark_all_as_read", isLocalized)}
										</button>
									)}
								</div>
								<hr className="-mx-1 my-1 h-px bg-border" />

								{/* Scrollable list area with themed scrollbar; header remains static */}
								<ThemedScrollbar
									className="max-h-[min(60vh,420px)]"
									noScrollX={true}
									removeTracksWhenNotUsed={true}
									style={{ height: "min(60vh, 420px)" }}
								>
									<motion.div
										animate="shown"
										initial="hidden"
										variants={listVariants}
									>
										{renderEntries.map((entry) => {
											if (entry.kind === "item") {
												const notification = entry.item;
												return (
													<NotificationItemRow
														formatTimeAgo={formatTimeAgo}
														key={notification.id}
														notification={notification}
														onClick={handleNotificationClick}
														variants={itemVariants}
													/>
												);
											}

											// Grouped chat message entry
											const group = entry;
											return (
												<NotificationGroupRow
													formatTimeAgo={formatTimeAgo}
													group={group}
													key={`group:${group.waId}:${group.date}`}
													onClick={handleGroupClick}
													variants={itemVariants}
												/>
											);
										})}
									</motion.div>
								</ThemedScrollbar>

								{items.length === 0 && (
									<motion.div
										animate={{ opacity: 1, filter: "blur(0px)" }}
										className="px-3 py-6 text-center text-muted-foreground text-xs"
										initial={{ opacity: 0, filter: "blur(6px)" }}
										transition={{
											duration: NO_NOTIFICATIONS_ANIMATION_DURATION,
											ease: EASE_CURVE_EMPHASIS,
										}}
									>
										{i18n.getMessage("no_notifications", isLocalized)}
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
