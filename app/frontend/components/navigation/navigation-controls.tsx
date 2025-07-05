"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DockIcon } from "@/components/ui/dock";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavigationControlsProps } from "@/types/navigation";

export function NavigationControls({
	isRTL = false,
	isCalendarPage = false,
	isPrevDisabled = false,
	isNextDisabled = false,
	onPrev,
	onNext,
	className = "",
}: NavigationControlsProps) {
	const prevButton = (
		<DockIcon>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onPrev}
						disabled={isCalendarPage && isPrevDisabled}
						className="size-9 rounded-full transition-all duration-200"
					>
						{isRTL ? (
							<ChevronRight className="size-4" />
						) : (
							<ChevronLeft className="size-4" />
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
		<DockIcon>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onNext}
						disabled={isCalendarPage && isNextDisabled}
						className="size-9 rounded-full transition-all duration-200"
					>
						{isRTL ? (
							<ChevronLeft className="size-4" />
						) : (
							<ChevronRight className="size-4" />
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
		<>
			{isRTL ? nextButton : prevButton}
			{isRTL ? prevButton : nextButton}
		</>
	);
}
