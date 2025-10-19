/**
 * Calendar Legend Component
 *
 * Displays a minimized help icon that expands to show legend on hover.
 * Shows conversations and cancellations only in free roam mode.
 * Shows vacation periods when they exist.
 */

"use client";

import { useLanguage } from "@shared/libs/state/language-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
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
import React, { useCallback, useState } from "react";
import { HeroPill } from "@/shared/ui/hero-pill";
import HeroVideoDialog from "@/shared/ui/magicui/hero-video-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

// Constants
const MAX_LEGEND_ITEMS_PREVIEW = 4;
const HOVER_ENTER_DELAY_MS = 200;
const HOVER_LEAVE_DELAY_MS = 100;

type CalendarLegendProps = {
	freeRoam?: boolean;
	className?: string;
};

// Legend Items Configuration Helper
const createLegendItems = (isLocalized: boolean) => [
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

// Legend Item Swatch Component
const LegendItemSwatch = ({
	item,
}: {
	item: ReturnType<typeof createLegendItems>[number];
}) => (
	<span
		className={cn(
			"h-2 w-2 rounded-full shadow-sm",
			item.key === "vacation" && "ring-1 ring-border/60"
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
);

// Legend Trigger Button Component
// biome-ignore lint: Required for Radix UI asChild pattern
const LegendTriggerButton = React.forwardRef<
	HTMLButtonElement,
	{
		filteredItems: ReturnType<typeof createLegendItems>;
		className: string;
	}
>(({ filteredItems, className }, ref) => (
	<Button
		aria-label="Show color legend"
		className={cn(
			"h-6 rounded-md border border-border/50 bg-muted/50 px-2 transition-colors hover:bg-muted",
			"flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground",
			"calendar-legend-trigger",
			className
		)}
		ref={ref}
		type="button"
		variant="ghost"
	>
		<Info className="h-3 w-3 text-muted-foreground/80" />
		<div className="flex items-center gap-0.5">
			{filteredItems.slice(0, MAX_LEGEND_ITEMS_PREVIEW).map((item) => (
				<div
					className={cn(
						"h-1.5 w-1.5 rounded-full shadow-sm",
						item.key === "vacation" && "ring-1 ring-border/50"
					)}
					key={item.key}
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
	</Button>
));
LegendTriggerButton.displayName = "LegendTriggerButton";

// Keyboard shortcuts grid component
const ShortcutsGrid = ({ isLocalized }: { isLocalized: boolean }) => (
	<TooltipProvider delayDuration={0}>
		<div className="inline-grid w-fit grid-cols-3 gap-1">
			{/* Up */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={isLocalized ? "تغيير العرض للأعلى" : "Change view up"}
						className="col-start-2"
						size="icon"
						variant="outline"
					>
						<ChevronUpIcon aria-hidden="true" size={16} />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs" side="top">
					{isLocalized ? "تغيير العرض للأعلى" : "Change view up"}
					<kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
						{isLocalized ? "Ctrl + ↑" : "Ctrl + ↑"}
					</kbd>
				</TooltipContent>
			</Tooltip>

			{/* Left */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={isLocalized ? "التاريخ السابق" : "Previous date"}
						className="col-start-1"
						size="icon"
						variant="outline"
					>
						<ChevronLeftIcon aria-hidden="true" size={16} />
					</Button>
				</TooltipTrigger>
				<TooltipContent
					className="px-2 py-1 text-xs"
					side={isLocalized ? "right" : "left"}
				>
					{isLocalized
						? "السهم اليسار: تنقل التاريخ"
						: "Arrow Left: Navigate date"}
					<kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
						{isLocalized ? "←" : "←"}
					</kbd>
				</TooltipContent>
			</Tooltip>

			{/* Center dot */}
			<div aria-hidden="true" className="flex items-center justify-center">
				<CircleIcon className="opacity-60" size={16} />
			</div>

			{/* Right */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={isLocalized ? "التاريخ التالي" : "Next date"}
						size="icon"
						variant="outline"
					>
						<ChevronRightIcon aria-hidden="true" size={16} />
					</Button>
				</TooltipTrigger>
				<TooltipContent
					className="px-2 py-1 text-xs"
					side={isLocalized ? "left" : "right"}
				>
					{isLocalized
						? "السهم اليمين: تنقل التاريخ"
						: "Arrow Right: Navigate date"}
					<kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
						{isLocalized ? "→" : "→"}
					</kbd>
				</TooltipContent>
			</Tooltip>

			{/* Down */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={isLocalized ? "تغيير العرض للأسفل" : "Change view down"}
						className="col-start-2"
						size="icon"
						variant="outline"
					>
						<ChevronDownIcon aria-hidden="true" size={16} />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs" side="bottom">
					{isLocalized ? "تغيير العرض للأسفل" : "Change view down"}
					<kbd className="-me-1 ms-2 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
						{isLocalized ? "Ctrl + ↓" : "Ctrl + ↓"}
					</kbd>
				</TooltipContent>
			</Tooltip>
		</div>
	</TooltipProvider>
);

// Keyboard Shortcuts Component
const KeyboardShortcuts = ({ isLocalized }: { isLocalized: boolean }) => (
	<div className="border-border/50 border-t pt-3">
		<div className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs">
			<Keyboard className="h-3 w-3" />
			{isLocalized ? "الاختصارات" : "Shortcuts"}
		</div>
		<ShortcutsGrid isLocalized={isLocalized} />
		<div className="mt-2 flex flex-col gap-1.5">
			<HeroPill
				icon={<ArrowLeftRight className="h-3 w-3" />}
				text={
					isLocalized
						? "السهمين يمين/يسار: تنقل التاريخ (اضغط واستمر للتكرار)"
						: "Arrow Left/Right: Navigate date (hold to repeat)"
				}
			/>
			<HeroPill
				icon={<MoveUpRight className="-rotate-45 h-3 w-3" />}
				text={
					isLocalized
						? "Ctrl + سهم للأعلى/للأسفل: تغيير العرض"
						: "Ctrl + Arrow Up/Down: Change view"
				}
			/>
		</div>
	</div>
);

// Video Tutorial Component
const VideoTutorial = ({ isLocalized }: { isLocalized: boolean }) => (
	<div className="border-border/50 border-t pt-3">
		<div className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs">
			<PlayCircle className="h-3 w-3" />
			{isLocalized ? "شرح الموقع" : "Tutorial"}
		</div>
		<div className="w-48">
			<HeroVideoDialog
				animationStyle="from-center"
				className="overflow-hidden rounded-md border border-border/50"
				thumbnailAlt={
					isLocalized ? "شرح موقع حجز العيادة" : "Clinic Booking Tutorial"
				}
				thumbnailSrc="https://img.youtube.com/vi/Tdd1Shg7XPI/maxresdefault.jpg"
				videoSrc="https://www.youtube.com/embed/Tdd1Shg7XPI"
			/>
		</div>
		<p className="mt-1 text-muted-foreground text-xs">
			{isLocalized
				? "شاهد كيفية استخدام الموقع"
				: "Watch how to use the system"}
		</p>
	</div>
);

export function CalendarLegend({
	freeRoam = false,
	className = "",
}: CalendarLegendProps) {
	const { isLocalized } = useLanguage();
	const { vacationPeriods } = useVacation();
	const [open, setOpen] = useState(false);
	const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	// Only consider upcoming vacations (start strictly after today)
	const hasUpcomingVacations = (() => {
		try {
			const normalize = (d: Date) =>
				new Date(d.getFullYear(), d.getMonth(), d.getDate());
			const today = normalize(new Date());
			return (vacationPeriods || []).some(
				(p) => normalize(p.start).getTime() > today.getTime()
			);
		} catch {
			return false;
		}
	})();

	const legendItems = createLegendItems(isLocalized);

	const filteredItems = legendItems.filter(
		(item) =>
			item.showAlways ||
			(freeRoam && item.key === "conversation") ||
			(item.showWhenVacationExists && hasUpcomingVacations)
	);

	const handleMouseEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setOpen(true);
		}, HOVER_ENTER_DELAY_MS);
	}, []);

	const handleMouseLeave = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setOpen(false);
		}, HOVER_LEAVE_DELAY_MS);
	}, []);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<LegendTriggerButton
					className={className}
					filteredItems={filteredItems}
				/>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-auto border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-sm"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				side="bottom"
				sideOffset={8}
				style={{ zIndex: Z_INDEX.HOVER_CARD }}
			>
				<div className="space-y-3">
					<div className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-xs">
						<Info className="h-3 w-3" />
						{isLocalized ? "دليل الألوان" : "Legend"}
					</div>
					<div className="flex flex-col gap-1.5">
						{filteredItems.map((item) => (
							<HeroPill
								animate
								className="mb-1"
								icon={<LegendItemSwatch item={item} />}
								key={item.key}
								text={item.label}
							/>
						))}
					</div>

					<KeyboardShortcuts isLocalized={isLocalized} />
					<VideoTutorial isLocalized={isLocalized} />
				</div>
			</PopoverContent>
		</Popover>
	);
}
