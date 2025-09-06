"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dock, DockIcon } from "@/components/ui/dock";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalendarToolbar } from "@/hooks/useCalendarToolbar";
import { useLongPressRepeat } from "@/hooks/use-long-press-repeat";
import { cn } from "@/lib/utils";
import type { CalendarCoreRef } from "./calendar-core";

interface CalendarDockProps {
	className?: string;
	currentView?: string;
	calendarRef?: React.RefObject<CalendarCoreRef> | null;
	freeRoam?: boolean;
	isRTL?: boolean;
}

export function CalendarDock({
	className = "",
	currentView = "multiMonthYear",
	calendarRef,
	freeRoam = false,
	isRTL = false,
}: CalendarDockProps) {
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	// Create a stable ref if none provided
	const fallbackRef = React.useRef<CalendarCoreRef>(null);
	const effectiveCalendarRef = calendarRef || fallbackRef;

	// Use the custom hook for calendar navigation logic
	const {
		title,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,
		handlePrev,
		handleNext,
		handleToday,
	} = useCalendarToolbar({
		calendarRef: effectiveCalendarRef,
		currentView,
		freeRoam,
	});

	const prevHoldHandlers = useLongPressRepeat(handlePrev, {
		startDelayMs: 3000,
		intervalMs: 333,
		disabled: isPrevDisabled,
	});
	const nextHoldHandlers = useLongPressRepeat(handleNext, {
		startDelayMs: 3000,
		intervalMs: 333,
		disabled: isNextDisabled,
	});

	// Define navigation buttons with proper arrow directions for RTL
	const prevButton = (
		<DockIcon>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={handlePrev}
						disabled={isPrevDisabled}
						className="size-9 rounded-full transition-all duration-200"
						{...prevHoldHandlers}
					>
						{/* In RTL, use right arrow for previous (pointing outward) */}
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
						onClick={handleNext}
						disabled={isNextDisabled}
						className="size-9 rounded-full transition-all duration-200"
						{...nextHoldHandlers}
					>
						{/* In RTL, use left arrow for next (pointing outward) */}
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
		<TooltipProvider>
			<Dock direction="middle" className={cn("h-auto min-h-[44px]", className)}>
				{/* Calendar Navigation Controls */}
				{/* Left side navigation button (Previous in LTR, Next in RTL) */}
				{isRTL ? nextButton : prevButton}

				{/* Date text as clickable button to go to today */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleToday}
							disabled={isTodayDisabled}
							onMouseEnter={() => setIsHoveringDate(true)}
							onMouseLeave={() => setIsHoveringDate(false)}
							className={cn(
								"h-9 w-[200px] rounded-full relative group overflow-hidden",
								"hover:bg-accent hover:text-accent-foreground",
								"transition-all duration-200",
								!isTodayDisabled && "cursor-pointer",
							)}
						>
							{/* Show calendar icon when hovering or date text when not */}
							<span
								className={cn(
									"absolute inset-0 flex items-center justify-center transition-all duration-200",
									isHoveringDate && !isTodayDisabled
										? "opacity-0 scale-75"
										: "opacity-100 scale-100",
								)}
							>
								<span className="text-sm font-medium px-2">
									{/* Show full date text or loading state */}
									{title ? (
										title
									) : (
										<Loader2 className="h-4 w-4 animate-spin mx-auto" />
									)}
								</span>
							</span>

							{/* Calendar icon that appears on hover */}
							<CalendarDays
								className={cn(
									"absolute inset-0 m-auto transition-all duration-200",
									"size-4",
									isHoveringDate && !isTodayDisabled
										? "opacity-100 scale-100"
										: "opacity-0 scale-75",
								)}
							/>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p className="flex items-center gap-1.5">
							{isTodayDisabled ? (
								<>
									{title}
									<span className="text-muted-foreground text-xs">
										(
										{isRTL
											? "أنت بالفعل في اليوم الحالي"
											: "Already showing today"}
										)
									</span>
								</>
							) : (
								<>
									<CalendarDays className="h-3.5 w-3.5" />
									{isRTL ? "الذهاب إلى اليوم" : "Go to today"}
									<span className="text-muted-foreground text-xs">
										({title})
									</span>
								</>
							)}
						</p>
					</TooltipContent>
				</Tooltip>

				{/* Right side navigation button (Next in LTR, Previous in RTL) */}
				{isRTL ? prevButton : nextButton}
			</Dock>
		</TooltipProvider>
	);
}
