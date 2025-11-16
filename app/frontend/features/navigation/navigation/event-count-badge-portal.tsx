"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { CalendarRange } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

// Maximum count to display before showing "99+"
const MAX_COUNT_DISPLAY = 99;
// Hidden position offset for portal when not positioned
const HIDDEN_POSITION_OFFSET = -9999;
// Viewport padding for badge positioning
const VIEWPORT_PADDING = 8;
// Badge offset from anchor corner
const BADGE_OFFSET = 6;

type EventCountBadgePortalProps = {
  anchorRef: { current: HTMLElement | null } | null;
  count: number | undefined;
  isLocalized?: boolean;
};

export function EventCountBadgePortal({
  anchorRef,
  count,
  isLocalized = false,
}: EventCountBadgePortalProps) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize based on actual window width if available
    if (typeof window !== "undefined") {
      return window.innerWidth < 1280;
    }
    return true; // Default to mobile for SSR
  });

  // Watch for dialog/modal backdrops to hide badge when they're open
  useEffect(() => {
    const checkDialog = () => {
      const hasDialog =
        document.querySelector("[data-radix-dialog-overlay]") !== null ||
        document.querySelector(".dialog-backdrop") !== null ||
        document.querySelector("[data-state='open'][role='dialog']") !== null;
      setIsDialogOpen(hasDialog);
    };

    checkDialog();
    const observer = new MutationObserver(checkDialog);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "class"],
    });

    return () => observer.disconnect();
  }, []);

  const updatePosition = useCallback(() => {
    try {
      const anchorEl = anchorRef?.current as HTMLElement | null;
      const badgeEl = badgeRef.current;
      if (!(anchorEl && badgeEl)) {
        return;
      }

      const anchorRect = anchorEl.getBoundingClientRect();
      const badgeRect = badgeEl.getBoundingClientRect();

      let top = anchorRect.top - badgeRect.height + BADGE_OFFSET;
      let left = anchorRect.right - badgeRect.width - BADGE_OFFSET;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Clamp within viewport
      top = Math.max(
        VIEWPORT_PADDING,
        Math.min(top, vh - badgeRect.height - VIEWPORT_PADDING)
      );
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, vw - badgeRect.width - VIEWPORT_PADDING)
      );

      setPosition({ top, left });
    } catch {
      // Silently ignore errors in position calculation (e.g., element not available)
    }
  }, [anchorRef]);

  // Check if mobile/low width device and observe anchor size/position changes
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1280); // xl breakpoint - need space for dock + sidebar trigger + notifications + legend
    };
    // Check immediately on mount
    checkMobile();

    // Listen to window resize
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);

    // Also listen to visualViewport resize for mobile devices
    try {
      const visualViewport = (
        window as unknown as { visualViewport?: VisualViewport }
      ).visualViewport;
      if (visualViewport) {
        visualViewport.addEventListener("resize", checkMobile as EventListener);
      }
    } catch {
      // Visual viewport not supported, continue without it
    }

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
      try {
        const visualViewport = (
          window as unknown as { visualViewport?: VisualViewport }
        ).visualViewport;
        if (visualViewport) {
          visualViewport.removeEventListener(
            "resize",
            checkMobile as EventListener
          );
        }
      } catch {
        // Visual viewport cleanup failed, continue cleanup
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const anchorEl = anchorRef?.current as HTMLElement | null;
    if (!anchorEl) {
      return;
    }

    // Defer to next frame to ensure badge is in the DOM for measurement
    const raf = requestAnimationFrame(() => updatePosition());

    let ro: ResizeObserver | null = null;
    try {
      if ("ResizeObserver" in window) {
        // Use requestAnimationFrame to prevent ResizeObserver loop errors
        ro = new ResizeObserver(() => {
          requestAnimationFrame(() => {
            updatePosition();
          });
        });
        ro.observe(anchorEl);
      }
    } catch {
      // Silently ignore errors when creating ResizeObserver (e.g., browser not supported)
    }

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    const onOrientation = () => updatePosition();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Let layout settle then recompute to avoid stale rects after alt-tab
        requestAnimationFrame(() => updatePosition());
      }
    };
    const onFocus = () => {
      requestAnimationFrame(() => updatePosition());
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelAnimationFrame(raf);
      try {
        ro?.disconnect();
      } catch {
        // Silently ignore errors when disconnecting ResizeObserver
      }
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [mounted, anchorRef, updatePosition]);

  // Reposition when count changes (size might change due to 99+)
  useEffect(() => {
    if (typeof count !== "undefined") {
      updatePosition();
    }
  }, [count, updatePosition]);

  // Hide badge when dialog/modal is open, when no count, or on mobile/low width devices
  if (!(mounted && count) || count <= 0 || isDialogOpen || isMobile) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        zIndex: "var(--z-event-count-badge)",
        top: position?.top ?? HIDDEN_POSITION_OFFSET,
        left: position?.left ?? HIDDEN_POSITION_OFFSET,
        pointerEvents: "auto",
        visibility: position ? "visible" : "hidden",
        // Keep it above dock content but below sidebar and dialogs
        contain: "layout style",
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex h-5 items-center gap-1 px-1.5",
              "rounded-theme bg-muted/60 text-foreground/80",
              "font-mono text-[0.625rem] tabular-nums leading-none",
              "border border-border/50 shadow-sm"
            )}
            onClickCapture={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            ref={badgeRef}
          >
            <CalendarRange className="h-3 w-3 opacity-80" />
            <span>
              {count > MAX_COUNT_DISPLAY ? `${MAX_COUNT_DISPLAY}+` : count}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {count > MAX_COUNT_DISPLAY ? `${MAX_COUNT_DISPLAY}+` : count}{" "}
            {i18n.getMessage("calendar_events", isLocalized)}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>,
    document.body
  );
}
