"use client";

import type { NavigationDateButtonProps } from "@features/navigation/types";
import { useFitTextScale } from "@shared/libs/hooks/use-fit-text-scale";
import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { CalendarDays } from "lucide-react";
import {
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
// Spinner removed per design: no loading indicator behind settings/date
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { EventCountBadgePortal } from "./event-count-badge-portal";

// Constants for min-width calculation at different breakpoints
const MIN_WIDTH_MOBILE = 320; // <sm
const MIN_WIDTH_SM_MD = 420; // sm-md
const MIN_WIDTH_MD = 560; // >= md
const BREAKPOINT_SM = 640;
const BREAKPOINT_MD = 768;

// Badge display constants
const BADGE_WIDTH_SMALL = 32;
const BADGE_WIDTH_LARGE = 42;
const EVENT_COUNT_LARGE = 99;

// Layout constants
const WIDTH_CUSHION = 16;

// Text scale constants for responsive sizing
const TEXT_SCALE_MIN_NAVIGATION_ONLY = 0.8;
const TEXT_SCALE_MIN_DEFAULT = 0.75;
const TEXT_SCALE_MAX_NAVIGATION_ONLY = 1.8;
const TEXT_SCALE_MAX_DEFAULT = 1.5;

// Badge padding constants
const LARGE_BADGE_PADDING = 56;
const SMALL_BADGE_PADDING = 44;

// Default window width for fallback
const DEFAULT_WINDOW_WIDTH = 1280;

// Line height for drawer text centering
const DRAWER_LINE_HEIGHT = 1.1;

export const NavigationDateButton = memo(function NavigationDateButtonContent({
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
	const [isHoveringDate, setIsHoveringDate] = useState(false);
	const anchorRef = useRef<HTMLSpanElement | null>(null);
	const { containerRef, contentRef, fontSizePx } = useFitTextScale({
		// Allow text to grow up to fill the reserved width in drawer, keep downscale reasonable
		minScale: navigationOnly
			? TEXT_SCALE_MIN_NAVIGATION_ONLY
			: TEXT_SCALE_MIN_DEFAULT,
		maxScale: navigationOnly
			? TEXT_SCALE_MAX_NAVIGATION_ONLY
			: TEXT_SCALE_MAX_DEFAULT,
		paddingPx: 0,
	});

	// Reserve space on the right side of the text so the floating event badge
	// never visually collides with the title text, even when the title scales up.
	const reservedBadgePaddingPx = useMemo(() => {
		if (!showBadge) {
			return 0;
		}
		const count = typeof visibleEventCount === "number" ? visibleEventCount : 0;
		if (count <= 0) {
			return 0;
		}
		// Room for icon + "99+" + margins inside the button
		return count > EVENT_COUNT_LARGE
			? LARGE_BADGE_PADDING
			: SMALL_BADGE_PADDING;
	}, [showBadge, visibleEventCount]);

	// Dynamically compute a comfortable min-width for the title button based on
	// measured text width, current font, and container padding. This prevents the
	// title from over-squeezing when month range strings are long (especially in RTL locales).
	const [minWidthPx, setMinWidthPx] = useState<number | undefined>(undefined);

	const computeFallbackMin = useCallback(() => {
		// Conservative baseline to avoid flicker before first measurement
		try {
			const w =
				typeof window !== "undefined"
					? window.innerWidth
					: DEFAULT_WINDOW_WIDTH;
			if (w < BREAKPOINT_SM) {
				return MIN_WIDTH_MOBILE;
			}
			if (w < BREAKPOINT_MD) {
				return MIN_WIDTH_SM_MD;
			}
			return MIN_WIDTH_MD;
		} catch {
			return MIN_WIDTH_SM_MD;
		}
	}, []);

	// Helper to measure text width using canvas
	const measureTextWidth = useCallback((font: string, text: string): number => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return 0;
		}
		ctx.font = font;
		return ctx.measureText(text).width;
	}, []);

	// Helper to calculate badge allowance
	const getBadgeAllowance = useCallback(
		(showBadgeArg: boolean, eventCount?: number): number => {
			if (!showBadgeArg) {
				return 0;
			}
			return eventCount && eventCount > EVENT_COUNT_LARGE
				? BADGE_WIDTH_LARGE
				: BADGE_WIDTH_SMALL;
		},
		[]
	);

	const recomputeMinWidth = useCallback(() => {
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
			if (!(contentEl && containerEl)) {
				setMinWidthPx(computeFallbackMin());
				return;
			}

			// Resolve effective font to measure accurately
			const cs = window.getComputedStyle(contentEl);
			const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const measured = measureTextWidth(font, text);

			const ccs = window.getComputedStyle(containerEl);
			const padL = Number.parseFloat(ccs.paddingLeft || "0") || 0;
			const padR = Number.parseFloat(ccs.paddingRight || "0") || 0;

			// Allowance for the event badge when visible (worst case 99+)
			const badgeAllowance = getBadgeAllowance(showBadge, visibleEventCount);

			const computed = Math.ceil(
				measured + padL + padR + badgeAllowance + WIDTH_CUSHION
			);
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
		computeFallbackMin,
		containerRef.current,
		contentRef.current,
		getBadgeAllowance,
		measureTextWidth,
	]);

	// Recompute when title or font scale changes, or on resize/orientation changes
	useLayoutEffect(() => {
		recomputeMinWidth();
		const onResize = () => recomputeMinWidth();
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("orientationchange", onResize);
		};
	}, [recomputeMinWidth]);

	// Helper to get width class based on context
	function getWidthClass(): string {
		if (_isCalendarPage) {
			return "max-w-[min(95vw,120rem)]";
		}
		return "w-auto max-w-full";
	}

	// Helper to get min-width value based on context
	function getMinWidthValue(): string | undefined {
		if (_isCalendarPage && minWidthPx) {
			return `${minWidthPx}px`;
		}
		if (navigationOnly && minWidthPx) {
			return `${minWidthPx}px`;
		}
		return;
	}

	const width = getWidthClass();
	const textSize = navigationOnly
		? "text-[0.95rem] sm:text-lg"
		: "text-sm sm:text-base";
	// removed loader sizing; spinner is no longer used

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"group relative h-9 max-w-full overflow-visible rounded-full",
						"hover:bg-accent hover:text-accent-foreground",
						"transition-all duration-200",
						!isTodayDisabled && "cursor-pointer",
						width,
						className,
						// Prevent collapse only in drawer context
						navigationOnly ? "shrink-0" : undefined
					)}
					disabled={isTodayDisabled}
					onClick={onToday}
					onMouseEnter={() => setIsHoveringDate(true)}
					onMouseLeave={() => setIsHoveringDate(false)}
					size="sm"
					style={{
						minWidth: getMinWidthValue(),
					}}
					variant="ghost"
				>
					<span
						className="pointer-events-none absolute top-0 right-0 h-0 w-0"
						ref={anchorRef}
					/>
					<span
						className={cn(
							"absolute inset-0 flex items-center justify-center transition-all duration-200",
							isHoveringDate && !isTodayDisabled
								? "scale-75 opacity-0"
								: "scale-100 opacity-100"
						)}
					>
						<div
							className="w-full max-w-full px-6 text-center"
							ref={containerRef}
							style={{
								// Override right padding to ensure badge overlay area is text-free
								paddingRight:
									reservedBadgePaddingPx > 0
										? `${24 + reservedBadgePaddingPx}px`
										: undefined,
							}}
						>
							<span
								className={cn(
									textSize,
									"inline-block whitespace-nowrap font-medium"
								)}
								ref={contentRef}
								style={{
									fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
									// Only adjust line-height in drawer to help vertical centering
									lineHeight: navigationOnly ? DRAWER_LINE_HEIGHT : undefined,
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
							isHoveringDate && !isTodayDisabled
								? "scale-100 opacity-100"
								: "scale-75 opacity-0"
						)}
					/>
					{showBadge && (
						<EventCountBadgePortal
							anchorRef={anchorRef}
							count={visibleEventCount}
							isLocalized={isLocalized}
						/>
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
