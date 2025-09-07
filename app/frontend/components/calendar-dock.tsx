"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as React from "react";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import { Button } from "@/components/ui/button";
import { Dock, DockIcon } from "@/components/ui/dock";
import { useSidebar } from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useKeyboardRepeatNavigation } from "@/hooks/use-keyboard-repeat-navigation";
import { useLongPressRepeat } from "@/hooks/use-long-press-repeat";
import { useCalendarToolbar } from "@/hooks/useCalendarToolbar";
import { cn } from "@/lib/utils";
import type { CalendarCoreRef } from "./calendar-core";

interface CalendarDockProps {
	className?: string;
	currentView?: string;
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	freeRoam?: boolean;
	isLocalized?: boolean;
}

export function CalendarDock({
	className = "",
	currentView = "multiMonthYear",
	calendarRef,
	freeRoam: _freeRoam = false,
	isLocalized = false,
}: CalendarDockProps) {
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);
	const { open, openMobile } = useSidebar();

	// Create a stable ref if none provided
	const fallbackRef = React.useRef<CalendarCoreRef | null>(null);
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
	});

	const prevHoldHandlers = useLongPressRepeat(handlePrev, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isPrevDisabled,
	});
	const nextHoldHandlers = useLongPressRepeat(handleNext, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isNextDisabled,
	});

	useKeyboardRepeatNavigation({
		onLeft: handlePrev,
		onRight: handleNext,
		onCtrlUp: () => {
			try {
				const opts = getCalendarViewOptions(isLocalized);
				const currentIndex = opts.findIndex((o) => o.value === currentView);
				const nextIndex = (currentIndex - 1 + opts.length) % opts.length;
				const view = opts[nextIndex]?.value || "multiMonthYear";
				const api = effectiveCalendarRef.current?.getApi?.();
				api?.changeView?.(view);
			} catch {}
		},
		onCtrlDown: () => {
			try {
				const opts = getCalendarViewOptions(isLocalized);
				const currentIndex = opts.findIndex((o) => o.value === currentView);
				const nextIndex = (currentIndex + 1) % opts.length;
				const view = opts[nextIndex]?.value || "multiMonthYear";
				const api = effectiveCalendarRef.current?.getApi?.();
				api?.changeView?.(view);
			} catch {}
		},
		disabledLeft: isPrevDisabled,
		disabledRight: isNextDisabled,
		startDelayMs: 2000,
		intervalMs: 333,
		isSidebarOpen: open || openMobile,
	});

	// Define navigation buttons with proper arrow directions for RTL
	const prevButton = (
		<DockIcon {...prevHoldHandlers}>
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
						{isLocalized ? (
							<ChevronRight className="size-4" />
						) : (
							<ChevronLeft className="size-4" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "السابق" : "Previous"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	const nextButton = (
		<DockIcon {...nextHoldHandlers}>
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
						{isLocalized ? (
							<ChevronLeft className="size-4" />
						) : (
							<ChevronRight className="size-4" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "التالي" : "Next"}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	);

	return (
		<TooltipProvider>
			<Dock direction="middle" className={cn("h-auto min-h-[44px]", className)}>
				{/* Calendar Navigation Controls */}
				{/* Left side navigation button (Previous in LTR, Next in RTL) */}
				{isLocalized ? nextButton : prevButton}

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
										{isLocalized
											? "أنت بالفعل في اليوم الحالي"
											: "Already showing today"}
										)
									</span>
								</>
							) : (
								<>
									<CalendarDays className="h-3.5 w-3.5" />
									{isLocalized ? "الذهاب إلى اليوم" : "Go to today"}
									<span className="text-muted-foreground text-xs">
										({title})
									</span>
								</>
							)}
						</p>
					</TooltipContent>
				</Tooltip>

				{/* Right side navigation button (Next in LTR, Previous in RTL) */}
				{isLocalized ? prevButton : nextButton}
			</Dock>
		</TooltipProvider>
	);
}
