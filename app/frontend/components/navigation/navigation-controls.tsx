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
import type { NavigationControlsProps } from "@/types/navigation";

export const NavigationControls = React.memo(function NavigationControls({
	isRTL = false,
	isCalendarPage = false,
	isPrevDisabled = false,
	isNextDisabled = false,
	onPrev,
	onNext,
	className = "",
}: NavigationControlsProps) {
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
					>
						{isRTL ? (
							<ChevronRight className="size-5" />
						) : (
							<ChevronLeft className="size-5" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isRTL ? "السابق" : "Previous"}</p>
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
					>
						{isRTL ? (
							<ChevronLeft className="size-5" />
						) : (
							<ChevronRight className="size-5" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isRTL ? "التالي" : "Next"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			{isRTL ? nextButton : prevButton}
			{isRTL ? prevButton : nextButton}
		</div>
	);
});
