"use client";

import {
	Calendar,
	CalendarX,
	Clock,
	Edit,
	Eye,
	MessageCircle,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/language-context";
import { Z_INDEX } from "@/lib/z-index";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarEventContextMenuProps {
	event: CalendarEvent | null;
	position: { x: number; y: number } | null;
	onClose: () => void;
	onCancelReservation?: (eventId: string) => void;
	onEditReservation?: (eventId: string) => void;
	onViewDetails?: (eventId: string) => void;
	onOpenConversation?: (eventId: string) => void;
}

export function CalendarEventContextMenu({
	event,
	position,
	onClose,
	onCancelReservation,
	onEditReservation,
	onViewDetails,
	onOpenConversation,
}: CalendarEventContextMenuProps) {
	const { isRTL } = useLanguage();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const handleClickOutside = () => {
			onClose();
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
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
	}, [event, position, onClose]);

	if (!mounted || !event || !position) {
		return null;
	}

	const isCancelled = event.extendedProps?.cancelled;
	const isConversation = event.extendedProps?.type === 2;
	const isReservation = event.extendedProps?.type !== 2;
	const isEditable = event.editable !== false;
	const eventDate = new Date(event.start);
	const isPast = eventDate < new Date();

	const formatEventTime = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const formatEventDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	const menuContent = (
		<div
			className="z-50 min-w-[8rem] max-w-64 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
			style={{
				position: "fixed",
				left: position.x,
				top: position.y,
				zIndex: Z_INDEX.GRID_MENU,
			}}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Event Info Header */}
			<div className="flex items-center gap-2 py-2 px-2 font-semibold text-foreground">
				{isConversation ? (
					<MessageCircle className="h-4 w-4 text-orange-500" />
				) : (
					<Calendar className="h-4 w-4 text-blue-500" />
				)}
				<div className="flex-1 min-w-0">
					<div className="font-medium truncate">{event.title}</div>
					<div className="text-xs text-muted-foreground flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{formatEventDate(event.start)} • {formatEventTime(event.start)}
					</div>
				</div>
			</div>

			<div className="-mx-1 my-1 h-px bg-border" />

			{/* Actions for Reservations */}
			{isReservation && (
				<>
					{/* View Details */}
					<div
						className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
						onClick={() => {
							onViewDetails?.(event.id);
							onClose();
						}}
					>
						<Eye className="h-4 w-4" />
						{isRTL ? "عرض التفاصيل" : "View Details"}
					</div>

					{/* Edit Reservation - Only if editable and not past */}
					{isEditable && !isPast && !isCancelled && (
						<div
							className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
							onClick={() => {
								onEditReservation?.(event.id);
								onClose();
							}}
						>
							<Edit className="h-4 w-4" />
							{isRTL ? "تعديل الحجز" : "Edit Reservation"}
						</div>
					)}

					{/* Cancel Reservation - Only if not already cancelled and not past */}
					{!isCancelled && !isPast && (
						<>
							<div className="-mx-1 my-1 h-px bg-border" />
							<div
								className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 gap-2 text-red-600"
								onClick={() => {
									onCancelReservation?.(event.id);
									onClose();
								}}
							>
								<CalendarX className="h-4 w-4" />
								{isRTL ? "إلغاء الحجز" : "Cancel Reservation"}
							</div>
						</>
					)}

					{/* Show status if cancelled */}
					{isCancelled && (
						<>
							<div className="-mx-1 my-1 h-px bg-border" />
							<div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground">
								<CalendarX className="h-4 w-4" />
								{isRTL ? "محجوز ملغي" : "Cancelled Reservation"}
							</div>
						</>
					)}

					{/* Show past status */}
					{isPast && !isCancelled && (
						<>
							<div className="-mx-1 my-1 h-px bg-border" />
							<div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground">
								<Clock className="h-4 w-4" />
								{isRTL ? "حجز سابق" : "Past Reservation"}
							</div>
						</>
					)}
				</>
			)}

			{/* Actions for Conversations */}
			{isConversation && (
				<>
					<div
						className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
						onClick={() => {
							onOpenConversation?.(event.id);
							onClose();
						}}
					>
						<MessageCircle className="h-4 w-4" />
						{isRTL ? "فتح المحادثة" : "Open Conversation"}
					</div>

					<div
						className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
						onClick={() => {
							onViewDetails?.(event.id);
							onClose();
						}}
					>
						<User className="h-4 w-4" />
						{isRTL ? "عرض تفاصيل العميل" : "View Customer Details"}
					</div>
				</>
			)}
		</div>
	);

	return createPortal(menuContent, document.body);
}
