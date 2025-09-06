"use client";

import {
	Calendar,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Grid3X3,
	List,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalendarToolbar } from "@/hooks/useCalendarToolbar";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { CalendarCoreRef } from "./calendar-core";

interface CalendarToolbarProps {
	calendarRef: React.RefObject<CalendarCoreRef>;
	currentView: string;
	freeRoam?: boolean;
	className?: string;
	onViewChange?: (view: string) => void;
}

export function CalendarToolbar({
	calendarRef,
	currentView,
	freeRoam = false,
	className,
	onViewChange,
}: CalendarToolbarProps) {
	const { isRTL } = useLanguage();
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	// Use the custom hook for all calendar logic
	const {
		title,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,
		handlePrev,
		handleNext,
		handleToday,
	} = useCalendarToolbar({
		calendarRef,
		currentView,
		freeRoam,
		...(onViewChange && { onViewChange }),
	});

	// Define navigation buttons with proper arrow directions for RTL
	const prevButton = (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={handlePrev}
						disabled={isPrevDisabled}
						className="h-16 w-16"
					>
						{/* In RTL, use right arrow for previous (pointing outward) */}
						{isRTL ? (
							<ChevronRight className="h-8 w-8" />
						) : (
							<ChevronLeft className="h-8 w-8" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isRTL ? "السابق" : "Previous"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);

	const nextButton = (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleNext}
						disabled={isNextDisabled}
						className="h-16 w-16"
					>
						{/* In RTL, use left arrow for next (pointing outward) */}
						{isRTL ? (
							<ChevronLeft className="h-8 w-8" />
						) : (
							<ChevronRight className="h-8 w-8" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isRTL ? "التالي" : "Next"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{/* Navigation controls with date in the middle */}
			<div className="flex items-center">
				{/* Left side navigation button (Previous in LTR, Next in RTL) */}
				{isRTL ? nextButton : prevButton}

				{/* Date text as clickable button to go to today */}
				<TooltipProvider>
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
									"h-16 px-6 mx-2 text-2xl font-medium relative group",
									"hover:bg-accent hover:text-accent-foreground",
									"transition-all duration-200",
									!isTodayDisabled && "cursor-pointer",
								)}
							>
								{/* Calendar icon that appears on hover */}
								<CalendarDays
									className={cn(
										"h-7 w-7 absolute transition-all duration-200",
										isRTL ? "right-2" : "left-2",
										isHoveringDate && !isTodayDisabled
											? "opacity-100 scale-100"
											: "opacity-0 scale-75",
									)}
								/>

								{/* Date text with padding adjustment for icon */}
								<span
									className={cn(
										"transition-all duration-200",
										isHoveringDate &&
											!isTodayDisabled &&
											(isRTL ? "pr-10" : "pl-10"),
									)}
								>
									{title}
								</span>

								{/* Subtle underline indicator */}
								<span
									className={cn(
										"absolute bottom-2 left-6 right-6 h-0.5 bg-current opacity-0 scale-x-0",
										"transition-all duration-200 origin-center",
										!isTodayDisabled &&
											"group-hover:opacity-20 group-hover:scale-x-100",
									)}
								/>

								{/* Today indicator dot when not showing today */}
								{!isTodayDisabled && (
									<span
										className={cn(
											"absolute top-1 h-3 w-3 rounded-full",
											"bg-primary animate-pulse",
											isRTL ? "left-1" : "right-1",
										)}
									/>
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p className="flex items-center gap-1.5">
								{isTodayDisabled ? (
									isRTL ? (
										"أنت بالفعل في اليوم الحالي"
									) : (
										"Already showing today"
									)
								) : (
									<>
										<CalendarDays className="h-3.5 w-3.5" />
										{isRTL ? "الذهاب إلى اليوم" : "Go to today"}
									</>
								)}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				{/* Right side navigation button (Next in LTR, Previous in RTL) */}
				{isRTL ? prevButton : nextButton}
			</div>
		</div>
	);
}

// Export view options for use in settings
export const getCalendarViewOptions = (isRTL: boolean) => [
	{ value: "multiMonthYear", label: isRTL ? "السنة" : "Year", icon: Grid3X3 },
	{ value: "dayGridMonth", label: isRTL ? "الشهر" : "Month", icon: Calendar },
	{ value: "timeGridWeek", label: isRTL ? "الأسبوع" : "Week", icon: Calendar },
	{ value: "listMonth", label: isRTL ? "قائمة" : "List", icon: List },
];
