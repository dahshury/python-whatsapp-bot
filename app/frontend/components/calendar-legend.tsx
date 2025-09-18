/**
 * Calendar Legend Component
 *
 * Displays a minimized help icon that expands to show legend on hover.
 * Shows conversations and cancellations only in free roam mode.
 * Shows vacation periods when they exist.
 */

"use client";

import HeroVideoDialog from "@/components/magicui/hero-video-dialog";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { useVacation } from "@/lib/vacation-context";
import {
	ArrowLeftRight,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronUpIcon,
	CircleIcon,
	Info,
	Keyboard,
	MoveUpRight,
	PlayCircle,
} from "lucide-react";

interface CalendarLegendProps {
	freeRoam?: boolean;
	className?: string;
}

export function CalendarLegend({
	freeRoam = false,
	className = "",
}: CalendarLegendProps) {
	const { isLocalized } = useLanguage();
	const { vacationPeriods } = useVacation();

	const legendItems = [
		{
			key: "check-up",
			color: "var(--fc-reservation-type-0-bg)", // Green - Check-up
			label: isLocalized ? "كشف" : "Check-up",
			showAlways: true,
		},
		{
			key: "follow-up",
			color: "var(--fc-reservation-type-1-bg)", // Blue - Follow-up
			label: isLocalized ? "مراجعة" : "Follow-up",
			showAlways: true,
		},
		{
			key: "conversation",
			color: "var(--fc-conversation-bg)", // Orange/Yellow - Conversation
			label: isLocalized ? "محادثة" : "Conversation",
			showAlways: false, // Only show in free roam
		},
		{
			key: "vacation",
			color: "transparent", // Use transparent; actual swatch uses pattern via background-image
			label: isLocalized ? "إجازة" : "Vacation",
			showAlways: false, // Only show when vacation periods exist
			showWhenVacationExists: true,
		},
	];

	const filteredItems = legendItems.filter(
		(item) =>
			item.showAlways ||
			(freeRoam && item.key === "conversation") ||
			(item.showWhenVacationExists && vacationPeriods.length > 0),
	);

	return (
		<HoverCard openDelay={200} closeDelay={100}>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className={cn(
						"h-6 px-2 rounded-md border border-border/50 bg-muted/50 hover:bg-muted transition-colors",
						"flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground",
						"calendar-legend-trigger", // Add specific class for CSS targeting
						className,
					)}
					aria-label={isLocalized ? "إظهار دليل الألوان" : "Show color legend"}
				>
					<Info className="h-3 w-3 text-muted-foreground/80" />
					<div className="flex items-center gap-0.5">
						{filteredItems.slice(0, 4).map((item, _index) => (
							<div
								key={item.key}
								className={cn(
									"w-1.5 h-1.5 rounded-full shadow-sm",
									item.key === "vacation" && "ring-1 ring-border/50",
								)}
								style={
									item.key === "vacation"
										? {
												backgroundImage: "var(--vacation-pattern-legend)",
												backgroundColor: "transparent",
											}
										: { backgroundColor: item.color }
								}
							/>
						))}
					</div>
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				className="w-auto p-3 shadow-lg border-border/80 bg-popover/95 backdrop-blur-sm"
				side="bottom"
				align="start"
				sideOffset={8}
			>
				<div className="space-y-3">
					<div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
						<Info className="h-3 w-3" />
						{isLocalized ? "دليل الألوان" : "Legend"}
					</div>
					<div className="flex flex-col gap-1.5">
						{filteredItems.map((item) => (
							<div key={item.key} className="flex items-center gap-2">
								<div
									className={cn(
										"w-3 h-3 rounded-sm flex-shrink-0 shadow-sm",
										item.key === "vacation" && "ring-[0.5px] ring-border/60",
									)}
									style={
										item.key === "vacation"
											? {
													backgroundImage: "var(--vacation-pattern-legend)",
													backgroundColor: "transparent",
												}
											: { backgroundColor: item.color }
									}
								/>
								<span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
									{item.label}
								</span>
							</div>
						))}
					</div>

					{/* Keyboard Shortcuts */}
					<div className="border-t border-border/50 pt-3">
						<div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
							<Keyboard className="h-3 w-3" />
							{isLocalized ? "الاختصارات" : "Shortcuts"}
						</div>
						<TooltipProvider delayDuration={0}>
							<div className="inline-grid w-fit grid-cols-3 gap-1">
								{/* Up: Change view up (Ctrl + Up) */}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="col-start-2"
											variant="outline"
											size="icon"
											aria-label={
												isLocalized ? "تغيير العرض للأعلى" : "Change view up"
											}
										>
											<ChevronUpIcon size={16} aria-hidden="true" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top" className="px-2 py-1 text-xs">
										{isLocalized ? "تغيير العرض للأعلى" : "Change view up"}
										<kbd className="bg-background text-muted-foreground/70 ms-2 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
											{isLocalized ? "Ctrl + ↑" : "Ctrl + ↑"}
										</kbd>
									</TooltipContent>
								</Tooltip>

								{/* Left: Navigate date left */}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="col-start-1"
											variant="outline"
											size="icon"
											aria-label={
												isLocalized ? "التاريخ السابق" : "Previous date"
											}
										>
											<ChevronLeftIcon size={16} aria-hidden="true" />
										</Button>
									</TooltipTrigger>
									<TooltipContent
										side={isLocalized ? "right" : "left"}
										className="px-2 py-1 text-xs"
									>
										{isLocalized
											? "السهم اليسار: تنقل التاريخ"
											: "Arrow Left: Navigate date"}
										<kbd className="bg-background text-muted-foreground/70 ms-2 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
											{isLocalized ? "←" : "←"}
										</kbd>
									</TooltipContent>
								</Tooltip>

								{/* Center dot */}
								<div
									className="flex items-center justify-center"
									aria-hidden="true"
								>
									<CircleIcon className="opacity-60" size={16} />
								</div>

								{/* Right: Navigate date right */}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											aria-label={isLocalized ? "التاريخ التالي" : "Next date"}
										>
											<ChevronRightIcon size={16} aria-hidden="true" />
										</Button>
									</TooltipTrigger>
									<TooltipContent
										side={isLocalized ? "left" : "right"}
										className="px-2 py-1 text-xs"
									>
										{isLocalized
											? "السهم اليمين: تنقل التاريخ"
											: "Arrow Right: Navigate date"}
										<kbd className="bg-background text-muted-foreground/70 ms-2 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
											{isLocalized ? "→" : "→"}
										</kbd>
									</TooltipContent>
								</Tooltip>

								{/* Down: Change view down (Ctrl + Down) */}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="col-start-2"
											variant="outline"
											size="icon"
											aria-label={
												isLocalized ? "تغيير العرض للأسفل" : "Change view down"
											}
										>
											<ChevronDownIcon size={16} aria-hidden="true" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom" className="px-2 py-1 text-xs">
										{isLocalized ? "تغيير العرض للأسفل" : "Change view down"}
										<kbd className="bg-background text-muted-foreground/70 ms-2 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
											{isLocalized ? "Ctrl + ↓" : "Ctrl + ↓"}
										</kbd>
									</TooltipContent>
								</Tooltip>
							</div>
						</TooltipProvider>
						<div className="mt-2 flex flex-col gap-1.5">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<ArrowLeftRight className="h-3 w-3" />
								<span>
									{isLocalized
										? "السهمين يمين/يسار: تنقل التاريخ (اضغط واستمر للتكرار)"
										: "Arrow Left/Right: Navigate date (hold to repeat)"}
								</span>
							</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<MoveUpRight className="h-3 w-3 -rotate-45" />
								<span>
									{isLocalized
										? "Ctrl + سهم للأعلى/للأسفل: تغيير العرض"
										: "Ctrl + Arrow Up/Down: Change view"}
								</span>
							</div>
						</div>
					</div>

					{/* Video Tutorial Section */}
					<div className="border-t border-border/50 pt-3">
						<div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
							<PlayCircle className="h-3 w-3" />
							{isLocalized ? "شرح الموقع" : "Tutorial"}
						</div>
						<div className="w-48">
							<HeroVideoDialog
								animationStyle="from-center"
								videoSrc="https://www.youtube.com/embed/Tdd1Shg7XPI"
								thumbnailSrc="https://img.youtube.com/vi/Tdd1Shg7XPI/maxresdefault.jpg"
								thumbnailAlt={
									isLocalized
										? "شرح موقع حجز العيادة"
										: "Clinic Booking Tutorial"
								}
								className="rounded-md overflow-hidden border border-border/50"
							/>
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{isLocalized
								? "شاهد كيفية استخدام الموقع"
								: "Watch how to use the system"}
						</p>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
