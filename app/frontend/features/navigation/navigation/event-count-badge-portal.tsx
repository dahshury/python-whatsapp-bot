"use client";

import { i18n } from "@shared/libs/i18n";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import { CalendarRange } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const VIEWPORT_PADDING_PX = 8;
const CORNER_OFFSET_PX = 6;
const OFF_SCREEN_POSITION = -9999;

// Constants for event count display
const MAX_DISPLAYABLE_COUNT = 99;

type EventCountBadgePortalProps = {
	anchorRef: React.RefObject<HTMLElement | null>;
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

			let top = anchorRect.top - badgeRect.height + CORNER_OFFSET_PX;
			let left = anchorRect.right - badgeRect.width - CORNER_OFFSET_PX;

			const vw = window.innerWidth;
			const vh = window.innerHeight;
			// Clamp within viewport
			top = Math.max(
				VIEWPORT_PADDING_PX,
				Math.min(top, vh - badgeRect.height - VIEWPORT_PADDING_PX)
			);
			left = Math.max(
				VIEWPORT_PADDING_PX,
				Math.min(left, vw - badgeRect.width - VIEWPORT_PADDING_PX)
			);

			setPosition({ top, left });
		} catch {
			// Position calculation may fail in some browser contexts
		}
	}, [anchorRef]);

	// Observe anchor size/position changes
	useEffect(() => {
		setMounted(true);
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
				ro = new ResizeObserver(() => updatePosition());
				ro.observe(anchorEl);
			}
		} catch {
			// ResizeObserver may not be available in all browsers
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
				// ResizeObserver cleanup may fail in some contexts
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

	// Hide badge when dialog/modal is open or when no count
	if (!(mounted && count) || count <= 0 || isDialogOpen) {
		return null;
	}

	return createPortal(
		<div
			style={{
				position: "fixed",
				zIndex: Z_INDEX.EVENT_COUNT_BADGE,
				top: position?.top ?? OFF_SCREEN_POSITION,
				left: position?.left ?? OFF_SCREEN_POSITION,
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
						<span>{count > MAX_DISPLAYABLE_COUNT ? "99+" : count}</span>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					<p className="text-xs">
						{count > MAX_DISPLAYABLE_COUNT ? "99+" : count}{" "}
						{i18n.getMessage("calendar_events", isLocalized)}
					</p>
				</TooltipContent>
			</Tooltip>
		</div>,
		document.body
	);
}
