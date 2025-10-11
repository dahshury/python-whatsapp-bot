"use client";

import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { Calendar, CalendarX, Clock, FileText, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CalendarEvent } from "@/entities/event";

interface CalendarEventContextMenuProps {
	event: CalendarEvent | null;
	position: { x: number; y: number } | null;
	onClose: () => void;
	onCancelReservation?: (eventId: string) => void;
	onEditReservation?: (eventId: string) => void;
	onViewDetails?: (eventId: string) => void;
	onOpenConversation?: (eventId: string) => void;
	onOpenDocument?: (eventId: string) => void;
}

export function CalendarEventContextMenu({
	event,
	position,
	onClose,
	onCancelReservation,
	onOpenConversation,
	onOpenDocument,
}: CalendarEventContextMenuProps) {
	const { isLocalized } = useLanguage();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const handleClickOutside = () => {
			onClose();
		};

		const handleEscape = (e: Event) => {
			if ((e as KeyboardEvent).key === "Escape") {
				onClose();
			}
		};

		if (event && position) {
			document.addEventListener("click", handleClickOutside);
			document.addEventListener("keydown", handleEscape);

			return () => {
				document.removeEventListener("click", handleClickOutside);
				document.removeEventListener("keydown", handleEscape);
			};
		}

		return () => {
			// No cleanup needed when event/position are not available
		};
	}, [event, position, onClose]);

	if (!mounted) {
		return null;
	}

	// Precompute flags safely (guarded by optional chaining)
	const isConversation = (event?.extendedProps as { type?: number })?.type === 2;
	const isReservation = (event?.extendedProps as { type?: number })?.type !== 2;
	const isCancelled = Boolean((event?.extendedProps as { cancelled?: boolean })?.cancelled);
	// const isEditable = event?.editable !== false;
	const isPast = event ? new Date(event.start) < new Date() : false;

	const formatEventTime = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleTimeString(isLocalized ? "ar-SA" : "en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const formatEventDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString(isLocalized ? "ar-SA" : "en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	return createPortal(
		<AnimatePresence>
			{event && position && (
				<>
					{/* Outside click overlay */}
					<motion.div
						key="context-menu-overlay"
						className="fixed inset-0"
						style={{ zIndex: Z_INDEX.GRID_MENU - 1, background: "transparent" }}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.1 }}
						onClick={() => onClose()}
					/>

					{/* Animated context menu */}
					<motion.div
						key="context-menu"
						className="no-scrollbar w-[310px] rounded-2xl bg-gray-50 dark:bg-black/90 p-0"
						style={{
							position: "fixed",
							left: position.x,
							top: position.y,
							zIndex: Z_INDEX.GRID_MENU,
							transformOrigin: "top left",
						}}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Escape") e.stopPropagation();
						}}
						role="menu"
						initial={{ opacity: 0, scale: 0.96, y: 6 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.98, y: 2 }}
						transition={{ duration: 0.14, ease: "easeOut" }}
					>
						<section className="bg-white dark:bg-gray-100/10 backdrop-blur-lg rounded-2xl p-1 shadow border border-gray-200 dark:border-gray-700/20">
							<div className="flex items-center p-2">
								<div className="flex-1 flex items-center gap-2">
									{isConversation ? (
										<MessageCircle className="h-5 w-5 text-orange-500" />
									) : (
										<Calendar className="h-5 w-5 text-blue-500" />
									)}
									<div>
										<h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate max-w-[240px]">
											{String(event.title)}
										</h3>
										<div className="text-xs text-muted-foreground flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{formatEventDate(String(event.start))} • {formatEventTime(String(event.start))}
										</div>
									</div>
								</div>
							</div>

							<div className="-mx-1 my-1 h-px bg-border" />

							{isReservation && (
								<div className="p-1">
									<div
										className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
										onClick={() => {
											const waId = event?.extendedProps?.wa_id || event?.extendedProps?.waId || event?.id;
											onOpenDocument?.(String(waId));
											onClose();
										}}
										role="menuitem"
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												const waId = event?.extendedProps?.wa_id || event?.extendedProps?.waId || event?.id;
												onOpenDocument?.(String(waId));
												onClose();
											}
										}}
									>
										<FileText className="h-4 w-4" />
										{i18n.getMessage("open_document", isLocalized)}
									</div>
									{!isCancelled && !isPast && (
										<>
											<div className="-mx-1 my-1 h-px bg-border" />
											<div
												className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 text-red-600"
												onClick={() => {
													onCancelReservation?.(String(event.id));
													onClose();
												}}
												role="menuitem"
												tabIndex={0}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														onCancelReservation?.(String(event.id));
														onClose();
													}
												}}
											>
												<div className="flex items-center gap-1.5 font-medium">
													<CalendarX className="h-4 w-4" />
													{i18n.getMessage("cancel_reservation", isLocalized)}
												</div>
											</div>
										</>
									)}

									{isCancelled && (
										<>
											<div className="-mx-1 my-1 h-px bg-border" />
											<div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground">
												<CalendarX className="h-4 w-4" />
												{i18n.getMessage("cancelled_reservation", isLocalized)}
											</div>
										</>
									)}

									{isPast && !isCancelled && (
										<>
											<div className="-mx-1 my-1 h-px bg-border" />
											<div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground">
												<Clock className="h-4 w-4" />
												{i18n.getMessage("past_reservation", isLocalized)}
											</div>
										</>
									)}
								</div>
							)}

							{isConversation && (
								<div
									className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
									onClick={() => {
										onOpenConversation?.(String(event.id));
										onClose();
									}}
									role="menuitem"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onOpenConversation?.(String(event.id));
											onClose();
										}
									}}
								>
									<MessageCircle className="h-4 w-4" />
									{i18n.getMessage("open_conversation", isLocalized)}
								</div>
							)}
						</section>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body
	);
}
