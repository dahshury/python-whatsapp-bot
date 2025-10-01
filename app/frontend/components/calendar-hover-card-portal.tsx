import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/types/calendar";
import type { Conversations } from "@/types/conversation";
import { CustomerStatsCard } from "./customer-stats-card";

interface CalendarHoverCardPortalProps {
	hoveredEventId: string;
	hoverCardPosition: {
		x: number;
		y: number;
		preferBottom?: boolean;
		eventHeight?: number;
	};
	isHoverCardMounted: boolean;
	isHoverCardClosing: boolean;
	isDragging: boolean;
	conversations: Conversations;
	reservations: Record<string, Reservation[]>;
	isLocalized: boolean;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}

export function CalendarHoverCardPortal({
	hoveredEventId,
	hoverCardPosition,
	isHoverCardMounted,
	isHoverCardClosing,
	isDragging,
	conversations,
	reservations,
	isLocalized,
	onMouseEnter,
	onMouseLeave,
}: CalendarHoverCardPortalProps) {
	const activeClass =
		isHoverCardMounted && !isHoverCardClosing ? "hover-card-active" : "";
	const exitClass = isHoverCardClosing
		? "hover-card-fade-exit"
		: "hover-card-fade-enter";

	return createPortal(
		<div
			className={cn(
				"fixed pointer-events-none w-[18.75rem] calendar-hover-card-portal",
			)}
			style={{
				zIndex: "var(--z-hover-card)",
				left: `${hoverCardPosition.x}px`,
				top: hoverCardPosition.preferBottom
					? `${hoverCardPosition.y}px`
					: `${hoverCardPosition.y}px`,
				transform: hoverCardPosition.preferBottom
					? "translateX(-50%) translateY(20px)"
					: "translateX(-50%) translateY(calc(-100% - 20px))",
			}}
		>
			<div
				role="tooltip"
				className={cn(
					"relative pointer-events-auto rounded-md border bg-popover text-popover-foreground shadow-md overflow-visible",
					exitClass,
					activeClass,
				)}
				style={{
					zIndex: 1,
					// Ensure card doesn't interfere with calendar event interactions
					pointerEvents: isHoverCardMounted && !isDragging ? "auto" : "none",
				}}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
			>
				<div
					style={{
						pointerEvents: isHoverCardMounted && !isDragging ? "auto" : "none",
					}}
				>
					<CustomerStatsCard
						selectedConversationId={hoveredEventId}
						conversations={conversations}
						reservations={reservations}
						isLocalized={isLocalized}
						isHoverCard={true}
					/>
				</div>
			</div>
		</div>,
		document.body,
	);
}
