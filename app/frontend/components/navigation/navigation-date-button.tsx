"use client";

import { CalendarDays, CalendarRange, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NavigationDateButtonProps } from "@/types/navigation";

export const NavigationDateButton = React.memo(function NavigationDateButton({
	title,
	isLocalized = false,
	isCalendarPage: _isCalendarPage = false,
	isTodayDisabled = false,
	onToday,
	navigationOnly = false,
	className = "",
	visibleEventCount,
}: NavigationDateButtonProps) {
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	const width = navigationOnly
		? "w-[12rem] sm:w-[16.25rem]"
		: "w-[14rem] sm:w-[22rem] md:w-[26rem]";
	const textSize = navigationOnly
		? "text-base sm:text-lg"
		: "text-lg sm:text-xl md:text-2xl";
	const loaderSize = navigationOnly
		? "h-5 w-5 sm:h-6 sm:w-6"
		: "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8";

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
						"h-9 rounded-full relative group overflow-hidden",
						"hover:bg-accent hover:text-accent-foreground",
						"transition-all duration-200",
						!isTodayDisabled && "cursor-pointer",
						width,
						className,
					)}
				>
					<span
						className={cn(
							"absolute inset-0 flex items-center justify-center transition-all duration-200",
							isHoveringDate && !isTodayDisabled
								? "opacity-0 scale-75"
								: "opacity-100 scale-100",
						)}
					>
						<span className={cn(textSize, "font-medium px-2 truncate")}>
							{title && title.trim().length > 0 ? (
								title
							) : (
								<Loader2 className={cn(loaderSize, "animate-spin mx-auto")} />
							)}
						</span>
					</span>

					<CalendarDays
						className={cn(
							"absolute inset-0 m-auto transition-all duration-200",
							"size-4",
							isHoveringDate && !isTodayDisabled
								? "opacity-100 scale-100"
								: "opacity-0 scale-75",
						)}
					/>
					{typeof visibleEventCount === "number" && visibleEventCount > 0 && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									className={cn(
										"absolute top-1 right-2",
										"inline-flex items-center gap-1 h-5 px-1.5",
										"rounded-theme bg-muted/60 text-foreground/80",
										"text-[0.625rem] leading-none font-mono tabular-nums",
										"border border-border/50 shadow-sm",
									)}
									onClickCapture={(e) => {
										e.stopPropagation();
										e.preventDefault();
									}}
								>
									<CalendarRange className="h-3 w-3 opacity-80" />
									<span>
										{visibleEventCount > 99 ? "99+" : visibleEventCount}
									</span>
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<p className="text-xs">
									{visibleEventCount > 99 ? "99+" : visibleEventCount}{" "}
									{i18n.getMessage("calendar_events", isLocalized)}
								</p>
							</TooltipContent>
						</Tooltip>
					)}
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
							<span className="text-muted-foreground text-xs">({title})</span>
						</>
					)}
				</p>
			</TooltipContent>
		</Tooltip>
	);
});
