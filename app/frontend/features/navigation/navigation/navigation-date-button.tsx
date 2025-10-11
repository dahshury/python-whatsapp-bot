"use client";

import type { NavigationDateButtonProps } from "@features/navigation/types";
import { useFitTextScale } from "@shared/libs/hooks/use-fit-text-scale";
import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { CalendarDays } from "lucide-react";
import * as React from "react";
// Spinner removed per design: no loading indicator behind settings/date
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { EventCountBadgePortal } from "./event-count-badge-portal";

export const NavigationDateButton = React.memo(function NavigationDateButton({
	title,
	isLocalized = false,
	isCalendarPage: _isCalendarPage = false,
	isTodayDisabled = false,
	onToday,
	navigationOnly = false,
	className = "",
	visibleEventCount,
	showBadge = true,
}: NavigationDateButtonProps) {
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);
	const anchorRef = React.useRef<HTMLSpanElement | null>(null);
	const { containerRef, contentRef, fontSizePx } = useFitTextScale({
		// Allow text to grow up to fill the reserved width in drawer, keep downscale reasonable
		minScale: navigationOnly ? 0.8 : 0.75,
		maxScale: navigationOnly ? 1.8 : 1.5,
		paddingPx: 0,
	});

	// Reserve space on the right side of the text so the floating event badge
	// never visually collides with the title text, even when the title scales up.
	const reservedBadgePaddingPx = React.useMemo(() => {
		if (!showBadge) return 0;
		const count = typeof visibleEventCount === "number" ? visibleEventCount : 0;
		if (count <= 0) return 0;
		// Room for icon + "99+" + margins inside the button
		return count > 99 ? 56 : 44;
	}, [showBadge, visibleEventCount]);

	// Dynamically compute a comfortable min-width for the title button based on
	// measured text width, current font, and container padding. This prevents the
	// title from over-squeezing when month range strings are long (especially in RTL locales).
	const [minWidthPx, setMinWidthPx] = React.useState<number | undefined>(undefined);

	const computeFallbackMin = React.useCallback(() => {
		// Conservative baseline to avoid flicker before first measurement
		try {
			const w = typeof window !== "undefined" ? window.innerWidth : 1280;
			if (w < 640) return 320; // <sm
			if (w < 768) return 420; // sm-md
			return 560; // >= md
		} catch {
			return 420;
		}
	}, []);

	const recomputeMinWidth = React.useCallback(() => {
		// In drawer (navigationOnly) we still want to reserve space like on calendar page
		const wantsMinWidth = _isCalendarPage || navigationOnly;
		if (!wantsMinWidth) {
			setMinWidthPx(undefined);
			return;
		}
		try {
			const text = (title || "").trim();
			if (!text) {
				setMinWidthPx(computeFallbackMin());
				return;
			}

			const contentEl = contentRef.current as HTMLElement | null;
			const containerEl = containerRef.current as HTMLElement | null;
			if (!contentEl || !containerEl) {
				setMinWidthPx(computeFallbackMin());
				return;
			}

			// Resolve effective font to measure accurately
			const cs = window.getComputedStyle(contentEl);
			const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				setMinWidthPx(computeFallbackMin());
				return;
			}
			ctx.font = font;
			const measured = ctx.measureText(text).width;

			const ccs = window.getComputedStyle(containerEl);
			const padL = Number.parseFloat(ccs.paddingLeft || "0") || 0;
			const padR = Number.parseFloat(ccs.paddingRight || "0") || 0;

			// Allowance for the event badge when visible (worst case 99+)
			const badgeAllowance = showBadge ? (visibleEventCount && visibleEventCount > 99 ? 42 : 32) : 0;
			// Small cushion to accommodate locale variations and hover transitions
			const cushion = 16;

			const computed = Math.ceil(measured + padL + padR + badgeAllowance + cushion);
			// Ensure we never dip below a sensible baseline
			const fallback = computeFallbackMin();
			setMinWidthPx(Math.max(computed, fallback));
		} catch {
			setMinWidthPx(computeFallbackMin());
		}
	}, [
		_isCalendarPage,
		navigationOnly,
		title,
		showBadge,
		visibleEventCount,
		contentRef,
		containerRef,
		computeFallbackMin,
	]);

	// Recompute when title or font scale changes, or on resize/orientation changes
	React.useLayoutEffect(() => {
		recomputeMinWidth();
		const onResize = () => recomputeMinWidth();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onResize);
		};
	}, [recomputeMinWidth]);

	const width = _isCalendarPage
		? "max-w-[min(95vw,120rem)]"
		: navigationOnly
			? "w-auto max-w-full"
			: "w-auto max-w-full";
	const textSize = navigationOnly ? "text-[0.95rem] sm:text-lg" : "text-[1.05rem] sm:text-xl md:text-2xl";
	// removed loader sizing; spinner is no longer used

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					onClick={onToday}
					disabled={isTodayDisabled}
					onMouseEnter={() => setIsHoveringDate(true)}
					onMouseLeave={() => setIsHoveringDate(false)}
					className={cn(
						"h-9 rounded-full relative group overflow-visible max-w-full",
						"hover:bg-accent hover:text-accent-foreground",
						"transition-all duration-200",
						!isTodayDisabled && "cursor-pointer",
						width,
						className,
						// Prevent collapse only in drawer context
						navigationOnly ? "shrink-0" : undefined
					)}
					style={{
						minWidth:
							_isCalendarPage && minWidthPx
								? `${minWidthPx}px`
								: navigationOnly && minWidthPx
									? `${minWidthPx}px`
									: undefined,
					}}
				>
					<span ref={anchorRef} className="absolute top-0 right-0 w-0 h-0 pointer-events-none" />
					<span
						className={cn(
							"absolute inset-0 flex items-center justify-center transition-all duration-200",
							isHoveringDate && !isTodayDisabled ? "opacity-0 scale-75" : "opacity-100 scale-100"
						)}
					>
						<div
							ref={containerRef}
							className="max-w-full w-full px-6 text-center"
							style={{
								// Override right padding to ensure badge overlay area is text-free
								paddingRight: reservedBadgePaddingPx > 0 ? `${24 + reservedBadgePaddingPx}px` : undefined,
							}}
						>
							<span
								ref={contentRef}
								className={cn(textSize, "font-medium whitespace-nowrap inline-block")}
								style={{
									fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
									// Only adjust line-height in drawer to help vertical centering
									lineHeight: navigationOnly ? 1.1 : undefined,
								}}
							>
								{title}
							</span>
						</div>
					</span>

					<CalendarDays
						className={cn(
							"absolute inset-0 m-auto transition-all duration-200",
							"size-4 sm:size-5",
							isHoveringDate && !isTodayDisabled ? "opacity-100 scale-100" : "opacity-0 scale-75"
						)}
					/>
					{showBadge && (
						<EventCountBadgePortal anchorRef={anchorRef} count={visibleEventCount} isLocalized={isLocalized} />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p className="flex items-center gap-1.5">
					{isTodayDisabled ? (
						<>
							{title}
							<span className="text-muted-foreground text-xs">
								({i18n.getMessage("already_showing_today", isLocalized)})
							</span>
						</>
					) : (
						<>
							<CalendarDays className="h-3.5 w-3.5" />
							{i18n.getMessage("go_to_today", isLocalized)}
							<span className="text-muted-foreground text-xs">({title})</span>
						</>
					)}
				</p>
			</TooltipContent>
		</Tooltip>
	);
});
