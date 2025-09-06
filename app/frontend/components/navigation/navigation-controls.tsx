"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { DockIcon } from "@/components/ui/dock";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLongPressRepeat } from "@/hooks/use-long-press-repeat";
import type { NavigationControlsProps } from "@/types/navigation";

export const NavigationControls = React.memo(function NavigationControls({
	isLocalized = false,
	isCalendarPage = false,
	isPrevDisabled = false,
	isNextDisabled = false,
	onPrev,
	onNext,
	className = "",
}: NavigationControlsProps) {
	const prevHoldHandlers = useLongPressRepeat(onPrev, {
		startDelayMs: 3000,
		intervalMs: 333,
		disabled: isCalendarPage && isPrevDisabled,
	});
	const nextHoldHandlers = useLongPressRepeat(onNext, {
		startDelayMs: 3000,
		intervalMs: 333,
		disabled: isCalendarPage && isNextDisabled,
	});
	// Enlarge clickable area and add subtle theme-aware styling
	const prevButton = (
		<DockIcon size={38} magnification={48} className="transition-colors">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onPrev}
						disabled={isCalendarPage && isPrevDisabled}
						className="size-10 rounded-full transition-all duration-200
						bg-background/40 hover:bg-accent/60 hover:text-accent-foreground
						border border-border/40 shadow-sm"
						{...prevHoldHandlers}
					>
						<ChevronLeft className="size-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "السابق" : "Previous"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	const nextButton = (
		<DockIcon size={38} magnification={48} className="transition-colors">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onNext}
						disabled={isCalendarPage && isNextDisabled}
						className="size-10 rounded-full transition-all duration-200
						bg-background/40 hover:bg-accent/60 hover:text-accent-foreground
						border border-border/40 shadow-sm"
						{...nextHoldHandlers}
					>
						<ChevronRight className="size-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "التالي" : "Next"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			{prevButton}
			{nextButton}
		</div>
	);
});
