"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFitTextScale } from "@/hooks/use-fit-text-scale";
import { cn } from "@/lib/utils";
import type { NavigationDateButtonProps } from "@/types/navigation";
import { EventCountBadgePortal } from "./event-count-badge-portal";

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
	const anchorRef = React.useRef<HTMLSpanElement | null>(null);
	const { containerRef, contentRef, fontSizePx } = useFitTextScale({
		minScale: 0.65,
		maxScale: 1,
		paddingPx: 0,
	});

	const width = navigationOnly
		? "w-[56vw] sm:w-[16.25rem]"
		: "w-[62vw] sm:w-[22rem] md:w-[26rem]";
	const textSize = navigationOnly
		? "text-[0.95rem] sm:text-lg"
		: "text-[1.05rem] sm:text-xl md:text-2xl";
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
						"h-9 rounded-full relative group overflow-visible",
						"hover:bg-accent hover:text-accent-foreground",
						"transition-all duration-200",
						!isTodayDisabled && "cursor-pointer",
						width,
						className,
					)}
				>
					<span
						ref={anchorRef}
						className="absolute top-0 right-0 w-0 h-0 pointer-events-none"
					/>
					<span
						className={cn(
							"absolute inset-0 flex items-center justify-center transition-all duration-200",
							isHoveringDate && !isTodayDisabled
								? "opacity-0 scale-75"
								: "opacity-100 scale-100",
						)}
					>
						<div
							ref={containerRef}
							className="max-w-full w-full px-6 text-center"
						>
							<span
								ref={contentRef}
								className={cn(
									textSize,
									"font-medium whitespace-nowrap inline-block",
								)}
								style={{ fontSize: fontSizePx ? `${fontSizePx}px` : undefined }}
							>
								{title && title.trim().length > 0 ? (
									title
								) : (
									<Loader2 className={cn(loaderSize, "animate-spin mx-auto")} />
								)}
							</span>
						</div>
					</span>

					<CalendarDays
						className={cn(
							"absolute inset-0 m-auto transition-all duration-200",
							"size-4 sm:size-5",
							isHoveringDate && !isTodayDisabled
								? "opacity-100 scale-100"
								: "opacity-0 scale-75",
						)}
					/>
					<EventCountBadgePortal
						anchorRef={anchorRef}
						count={visibleEventCount}
						isLocalized={isLocalized}
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
							<span className="text-muted-foreground text-xs">({title})</span>
						</>
					)}
				</p>
			</TooltipContent>
		</Tooltip>
	);
});
