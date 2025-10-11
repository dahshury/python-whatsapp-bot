"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Dock, DockIcon } from "@/shared/ui/dock";
import { Spinner } from "@/shared/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

interface HoldHandlersProps {
	// Generic DOM handler bag used by long-press hooks
	[key: string]: unknown;
}

export interface SimpleDockBaseProps {
	className?: string;
	title?: string;
	isPrevDisabled?: boolean;
	isNextDisabled?: boolean;
	isTodayDisabled?: boolean;
	onPrev?: () => void;
	onNext?: () => void;
	onToday?: () => void;
	isLocalized?: boolean;
	prevHoldHandlers?: HoldHandlersProps;
	nextHoldHandlers?: HoldHandlersProps;
}

export function SimpleDockBase({
	className = "",
	title,
	isPrevDisabled = false,
	isNextDisabled = false,
	isTodayDisabled = false,
	onPrev,
	onNext,
	onToday,
	isLocalized = false,
	prevHoldHandlers,
	nextHoldHandlers,
}: SimpleDockBaseProps) {
	const [isHoveringDate, setIsHoveringDate] = React.useState(false);

	return (
		<TooltipProvider>
			<Dock direction="middle" className={cn("h-auto min-h-[2.75rem]", className)}>
				{/* Left: Previous */}
				<DockIcon {...(prevHoldHandlers || {})}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={onPrev}
								disabled={isPrevDisabled}
								className="size-9 rounded-full transition-all duration-200"
								{...(prevHoldHandlers || {})}
							>
								<ChevronLeft className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{i18n.getMessage("msg_previous", isLocalized)}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>

				{/* Center: Date button (Today) */}
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
								"h-9 w-[12.5rem] rounded-full relative group overflow-hidden",
								"hover:bg-accent hover:text-accent-foreground",
								"transition-all duration-200",
								!isTodayDisabled && "cursor-pointer"
							)}
						>
							<span
								className={cn(
									"absolute inset-0 flex items-center justify-center transition-all duration-200",
									isHoveringDate && !isTodayDisabled ? "opacity-0 scale-75" : "opacity-100 scale-100"
								)}
							>
								<span className="text-sm font-medium px-2">
									{title ? title : <Spinner className="h-4 w-4 mx-auto" />}
								</span>
							</span>
							<Calendar
								className={cn(
									"absolute inset-0 m-auto transition-all duration-200",
									"size-4",
									isHoveringDate && !isTodayDisabled ? "opacity-100 scale-100" : "opacity-0 scale-75"
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
										({i18n.getMessage("already_showing_today", isLocalized)})
									</span>
								</>
							) : (
								<>
									<CalendarDays className="h-3.5 w-3.5" />
									{i18n.getMessage("go_to_today", isLocalized)}
									<span className="text-muted-foreground text-xs">({title})</span>
								</>
							)}
						</p>
					</TooltipContent>
				</Tooltip>

				{/* Right: Next */}
				<DockIcon {...(nextHoldHandlers || {})}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={onNext}
								disabled={isNextDisabled}
								className="size-9 rounded-full transition-all duration-200"
								{...(nextHoldHandlers || {})}
							>
								<ChevronRight className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{i18n.getMessage("msg_next", isLocalized)}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>
			</Dock>
		</TooltipProvider>
	);
}
