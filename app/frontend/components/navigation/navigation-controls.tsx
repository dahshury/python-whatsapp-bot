"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { DockIcon } from "@/components/ui/dock";
import { useSidebar } from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useKeyboardRepeatNavigation } from "@/hooks/use-keyboard-repeat-navigation";
import { useLongPressRepeat } from "@/hooks/use-long-press-repeat";
import type { NavigationControlsProps } from "@/types/navigation";

export const NavigationControls = React.memo(function NavigationControls({
	isLocalized = false,
	isCalendarPage = false,
	isPrevDisabled = false,
	isNextDisabled = false,
	onPrev = () => {},
	onNext = () => {},
	className = "",
}: NavigationControlsProps) {
	const { open, openMobile } = useSidebar();
	const prevHoldHandlers = useLongPressRepeat(onPrev, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isCalendarPage && isPrevDisabled,
	});
	const nextHoldHandlers = useLongPressRepeat(onNext, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isCalendarPage && isNextDisabled,
	});

	useKeyboardRepeatNavigation({
		onLeft: onPrev,
		onRight: onNext,
		disabledLeft: isCalendarPage && isPrevDisabled,
		disabledRight: isCalendarPage && isNextDisabled,
		startDelayMs: 2000,
		intervalMs: 333,
		isSidebarOpen: open || openMobile,
	});
	// Enlarge clickable area and add subtle theme-aware styling
	const isSmall = typeof window !== "undefined" && window.innerWidth < 640;

	const prevButton = (
		<DockIcon
			size={isSmall ? 28 : 38}
			widthScale={1.4}
			paddingPx={0}
			magnification={isSmall ? 36 : 48}
			className="transition-colors"
			{...prevHoldHandlers}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onPrev}
						disabled={isCalendarPage && isPrevDisabled}
						className="h-9 sm:h-10 w-full rounded-theme transition-all duration-200 flex items-center justify-center
						bg-background/40 hover:bg-accent/60 hover:text-accent-foreground
						border border-border/40 shadow-sm"
						data-slot="dock-prev"
						{...prevHoldHandlers}
					>
						<ChevronLeft className="size-4 sm:size-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "السابق" : "Previous"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	const nextButton = (
		<DockIcon
			size={isSmall ? 28 : 38}
			widthScale={1.4}
			paddingPx={0}
			magnification={isSmall ? 36 : 48}
			className="transition-colors"
			{...nextHoldHandlers}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onNext}
						disabled={isCalendarPage && isNextDisabled}
						className="h-9 sm:h-10 w-full rounded-theme transition-all duration-200 flex items-center justify-center
						bg-background/40 hover:bg-accent/60 hover:text-accent-foreground
						border border-border/40 shadow-sm"
						data-slot="dock-next"
						{...nextHoldHandlers}
					>
						<ChevronRight className="size-4 sm:size-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "التالي" : "Next"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	return (
		<div className={`flex items-center gap-0.5 ${className}`}>
			{prevButton}
			{nextButton}
		</div>
	);
});
