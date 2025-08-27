"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavigationDateButtonProps } from "@/types/navigation";

export const NavigationDateButton = React.memo(function NavigationDateButton({
	title,
	isRTL = false,
	isCalendarPage: _isCalendarPage = false,
	isTodayDisabled = false,
	onToday,
	navigationOnly = false,
	className = "",
}: NavigationDateButtonProps) {
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	const width = navigationOnly ? "w-[260px]" : "w-[416px]";
	const textSize = navigationOnly ? "text-lg" : "text-2xl";
	const loaderSize = navigationOnly ? "h-6 w-6" : "h-8 w-8";

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
						<span className={cn(textSize, "font-medium px-2")}>
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
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p className="flex items-center gap-1.5">
					{isTodayDisabled ? (
						<>
							{title}
							<span className="text-muted-foreground text-xs">
								(
								{isRTL ? "أنت بالفعل في اليوم الحالي" : "Already showing today"}
								)
							</span>
						</>
					) : (
						<>
							<CalendarDays className="h-3.5 w-3.5" />
							{isRTL ? "الذهاب إلى اليوم" : "Go to today"}
							<span className="text-muted-foreground text-xs">({title})</span>
						</>
					)}
				</p>
			</TooltipContent>
		</Tooltip>
	);
});
