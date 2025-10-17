"use client";

import { useLanguage } from "@shared/libs/state/language-context";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import {
	Calendar,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Grid3X3,
	List,
} from "lucide-react";
import { useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";
import { useCalendarToolbar } from "@/widgets/calendar/hooks/use-calendar-toolbar";
import type { CalendarCoreRef } from "./types";

type CalendarToolbarProps = {
	calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	currentView: string;
	freeRoam?: boolean;
	className?: string;
};

// Helper component for Previous button
function PrevButton({
	isLocalized,
	disabled,
	onClick,
}: {
	isLocalized: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="h-16 w-16"
						disabled={disabled}
						onClick={onClick}
						size="icon"
						variant="ghost"
					>
						{isLocalized ? (
							<ChevronRight className="h-8 w-8" />
						) : (
							<ChevronLeft className="h-8 w-8" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "السابق" : "Previous"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Helper component for Next button
function NextButton({
	isLocalized,
	disabled,
	onClick,
}: {
	isLocalized: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="h-16 w-16"
						disabled={disabled}
						onClick={onClick}
						size="icon"
						variant="ghost"
					>
						{isLocalized ? (
							<ChevronLeft className="h-8 w-8" />
						) : (
							<ChevronRight className="h-8 w-8" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isLocalized ? "التالي" : "Next"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Helper component for Date button
function DateButton({
	isLocalized,
	isTodayDisabled,
	isHoveringDate,
	title,
	onClick,
	onMouseEnter,
	onMouseLeave,
}: {
	isLocalized: boolean;
	isTodayDisabled: boolean;
	isHoveringDate: boolean;
	title: string;
	onClick: () => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className={cn(
							"group relative mx-2 h-16 px-6 font-medium text-2xl",
							"hover:bg-accent hover:text-accent-foreground",
							"transition-all duration-200",
							!isTodayDisabled && "cursor-pointer"
						)}
						disabled={isTodayDisabled}
						onClick={onClick}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						size="sm"
						variant="ghost"
					>
						<CalendarDays
							className={cn(
								"absolute h-7 w-7 transition-all duration-200",
								isLocalized ? "right-2" : "left-2",
								isHoveringDate && !isTodayDisabled
									? "scale-100 opacity-100"
									: "scale-75 opacity-0"
							)}
						/>
						<span
							className={cn(
								"transition-all duration-200",
								isHoveringDate &&
									!isTodayDisabled &&
									(isLocalized ? "pr-10" : "pl-10")
							)}
						>
							{title}
						</span>
						<span
							className={cn(
								"absolute right-6 bottom-2 left-6 h-0.5 scale-x-0 bg-current opacity-0",
								"origin-center transition-all duration-200",
								!isTodayDisabled &&
									"group-hover:scale-x-100 group-hover:opacity-20"
							)}
						/>
						{!isTodayDisabled && (
							<span
								className={cn(
									"absolute top-1 h-3 w-3 rounded-full",
									"animate-pulse bg-primary",
									isLocalized ? "left-1" : "right-1"
								)}
							/>
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p className="flex items-center gap-1.5">
						{isTodayDisabled ? (
							isLocalized ? (
								"أنت بالفعل في اليوم الحالي"
							) : (
								"Already showing today"
							)
						) : (
							<>
								<CalendarDays className="h-3.5 w-3.5" />
								{isLocalized ? "الذهاب إلى اليوم" : "Go to today"}
							</>
						)}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Main simplified toolbar component
export function CalendarToolbar({
	calendarRef,
	currentView,
	className,
}: CalendarToolbarProps) {
	const { isLocalized } = useLanguage();
	const [isHoveringDate, setIsHoveringDate] = useState(false);

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
		calendarRef: calendarRef || null,
		currentView,
	});

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{/* Navigation controls with date in the middle */}
			<div className="flex items-center">
				{/* Left side navigation button (Previous in LTR, Next in RTL) */}
				{isLocalized ? (
					<NextButton
						disabled={isNextDisabled}
						isLocalized={isLocalized}
						onClick={handleNext}
					/>
				) : (
					<PrevButton
						disabled={isPrevDisabled}
						isLocalized={isLocalized}
						onClick={handlePrev}
					/>
				)}

				{/* Date text as clickable button to go to today */}
				<DateButton
					isHoveringDate={isHoveringDate}
					isLocalized={isLocalized}
					isTodayDisabled={isTodayDisabled}
					onClick={handleToday}
					onMouseEnter={() => setIsHoveringDate(true)}
					onMouseLeave={() => setIsHoveringDate(false)}
					title={title}
				/>

				{/* Right side navigation button (Next in LTR, Previous in RTL) */}
				{isLocalized ? (
					<PrevButton
						disabled={isPrevDisabled}
						isLocalized={isLocalized}
						onClick={handlePrev}
					/>
				) : (
					<NextButton
						disabled={isNextDisabled}
						isLocalized={isLocalized}
						onClick={handleNext}
					/>
				)}
			</div>
		</div>
	);
}

// Export view options for use in settings
export const getCalendarViewOptions = (isLocalized: boolean) => [
	{
		value: "multiMonthYear",
		label: isLocalized ? "السنة" : "Year",
		icon: Grid3X3,
	},
	{
		value: "dayGridMonth",
		label: isLocalized ? "الشهر" : "Month",
		icon: Calendar,
	},
	{
		value: "timeGridWeek",
		label: isLocalized ? "الأسبوع" : "Week",
		icon: Calendar,
	},
	{ value: "listMonth", label: isLocalized ? "قائمة" : "List", icon: List },
];
