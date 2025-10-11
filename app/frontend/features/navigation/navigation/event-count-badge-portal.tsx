"use client";

import { i18n } from "@shared/libs/i18n";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import { CalendarRange } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

interface EventCountBadgePortalProps {
	anchorRef: React.RefObject<HTMLElement | null>;
	count: number | undefined;
	isLocalized?: boolean;
}

export function EventCountBadgePortal({ anchorRef, count, isLocalized = false }: EventCountBadgePortalProps) {
	const badgeRef = React.useRef<HTMLSpanElement>(null);
	const [position, setPosition] = React.useState<{
		top: number;
		left: number;
	} | null>(null);
	const [mounted, setMounted] = React.useState(false);
	const [isDialogOpen, setIsDialogOpen] = React.useState(false);

	// Watch for dialog/modal backdrops to hide badge when they're open
	React.useEffect(() => {
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

	const updatePosition = React.useCallback(() => {
		try {
			const anchorEl = anchorRef?.current as HTMLElement | null;
			const badgeEl = badgeRef.current;
			if (!anchorEl || !badgeEl) return;

			const anchorRect = anchorEl.getBoundingClientRect();
			const badgeRect = badgeEl.getBoundingClientRect();

			const padding = 8; // viewport padding
			const offset = 6; // slight inward offset from the corner
			let top = anchorRect.top - badgeRect.height + offset;
			let left = anchorRect.right - badgeRect.width - offset;

			const vw = window.innerWidth;
			const vh = window.innerHeight;
			// Clamp within viewport
			top = Math.max(padding, Math.min(top, vh - badgeRect.height - padding));
			left = Math.max(padding, Math.min(left, vw - badgeRect.width - padding));

			setPosition({ top, left });
		} catch {}
	}, [anchorRef]);

	// Observe anchor size/position changes
	React.useEffect(() => {
		setMounted(true);
	}, []);

	React.useEffect(() => {
		if (!mounted) return;
		const anchorEl = anchorRef?.current as HTMLElement | null;
		if (!anchorEl) return;

		// Defer to next frame to ensure badge is in the DOM for measurement
		const raf = requestAnimationFrame(() => updatePosition());

		let ro: ResizeObserver | null = null;
		try {
			if ("ResizeObserver" in window) {
				ro = new ResizeObserver(() => updatePosition());
				ro.observe(anchorEl);
			}
		} catch {}

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
			} catch {}
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onOrientation);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("focus", onFocus);
		};
	}, [mounted, anchorRef, updatePosition]);

	// Reposition when count changes (size might change due to 99+)
	React.useEffect(() => {
		if (typeof count !== "undefined") {
			updatePosition();
		}
	}, [count, updatePosition]);

	// Hide badge when dialog/modal is open or when no count
	if (!mounted || !count || count <= 0 || isDialogOpen) return null;

	return createPortal(
		<div
			style={{
				position: "fixed",
				zIndex: Z_INDEX.EVENT_COUNT_BADGE,
				top: position?.top ?? -9999,
				left: position?.left ?? -9999,
				pointerEvents: "auto",
				visibility: position ? "visible" : "hidden",
				// Keep it above dock content but below sidebar and dialogs
				contain: "layout style",
			}}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						ref={badgeRef}
						className={cn(
							"inline-flex items-center gap-1 h-5 px-1.5",
							"rounded-theme bg-muted/60 text-foreground/80",
							"text-[0.625rem] leading-none font-mono tabular-nums",
							"border border-border/50 shadow-sm"
						)}
						onClickCapture={(e) => {
							e.stopPropagation();
							e.preventDefault();
						}}
					>
						<CalendarRange className="h-3 w-3 opacity-80" />
						<span>{count > 99 ? "99+" : count}</span>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					<p className="text-xs">
						{count > 99 ? "99+" : count} {i18n.getMessage("calendar_events", isLocalized)}
					</p>
				</TooltipContent>
			</Tooltip>
		</div>,
		document.body
	);
}
