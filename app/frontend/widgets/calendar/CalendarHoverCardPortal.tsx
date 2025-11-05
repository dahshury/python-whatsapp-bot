import { cn } from "@shared/libs/utils";
import { createPortal } from "react-dom";
import type { Conversations } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import { CustomerStatsCard } from "@/features/dashboard/customer-stats-card";

type CalendarHoverCardPortalProps = {
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
};

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
        "calendar-hover-card-portal pointer-events-none fixed w-[18.75rem]"
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
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Tooltip hover card uses mouse handlers to maintain visibility on hover - this is intentional UX behavior */}
      <div
        className={cn(
          "pointer-events-auto relative overflow-visible rounded-md border bg-popover text-popover-foreground shadow-md",
          exitClass,
          activeClass
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="tooltip"
        style={{
          zIndex: 1,
          // Ensure card doesn't interfere with calendar event interactions
          pointerEvents: isHoverCardMounted && !isDragging ? "auto" : "none",
        }}
        tabIndex={-1}
      >
        <div
          style={{
            pointerEvents: isHoverCardMounted && !isDragging ? "auto" : "none",
          }}
        >
          <CustomerStatsCard
            conversations={conversations}
            isHoverCard={true}
            isLocalized={isLocalized}
            reservations={reservations}
            selectedConversationId={hoveredEventId}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
