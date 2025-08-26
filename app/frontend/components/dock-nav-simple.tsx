"use client";

import { BarChart3, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { getCalendarViewOptions } from "@/components/calendar-toolbar";
import { SettingsTabs } from "@/components/settings";
import { buttonVariants } from "@/components/ui/button";
import { Dock, DockIcon } from "@/components/ui/dock";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { StablePopoverButton } from "@/components/ui/stable-popover-button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { toastService } from "@/lib/toast-service";
import { cn } from "@/lib/utils";
import { useVacation } from "@/lib/vacation-context";

interface DockNavSimpleProps {
	className?: string;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
	leftCalendarView?: string;
	rightCalendarView?: string;
	onLeftCalendarViewChange?: (view: string) => void;
	onRightCalendarViewChange?: (view: string) => void;
	leftCalendarRef?: React.RefObject<CalendarCoreRef> | null;
	rightCalendarRef?: React.RefObject<CalendarCoreRef> | null;
	isDualMode?: boolean;
}

interface DualCalendarViewSelectorProps {
	isRTL?: boolean;
	leftCalendarView?: string;
	rightCalendarView?: string;
	onLeftCalendarViewChange?: (view: string) => void;
	onRightCalendarViewChange?: (view: string) => void;
	leftCalendarRef?: React.RefObject<CalendarCoreRef> | null;
	rightCalendarRef?: React.RefObject<CalendarCoreRef> | null;
	isDualMode?: boolean;
}

function DualCalendarViewSelector({
	isRTL = false,
	leftCalendarView,
	rightCalendarView,
	onLeftCalendarViewChange,
	onRightCalendarViewChange,
	leftCalendarRef: _leftCalendarRef,
	rightCalendarRef: _rightCalendarRef,
}: DualCalendarViewSelectorProps) {
	const viewOptions = getCalendarViewOptions(isRTL);

	return (
		<div className="grid grid-cols-2 gap-4">
			<div className="space-y-2">
				<Label className="text-xs text-muted-foreground text-center block">
					{isRTL ? "التقويم الأيسر" : "Left Calendar"}
				</Label>
				<RadioGroup
					value={leftCalendarView}
					onValueChange={onLeftCalendarViewChange}
					className="grid grid-cols-2 gap-1"
				>
					{viewOptions.map((option) => (
						<div key={`left-${option.value}`}>
							<RadioGroupItem
								value={option.value}
								id={`left-calendar-view-${option.value}`}
								className="peer sr-only"
							/>
							<Label
								htmlFor={`left-calendar-view-${option.value}`}
								className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
							>
								<option.icon className="mb-0.5 h-3 w-3" />
								<span className="text-[10px]">{option.label}</span>
							</Label>
						</div>
					))}
				</RadioGroup>
			</div>

			<div className="space-y-2">
				<Label className="text-xs text-muted-foreground text-center block">
					{isRTL ? "التقويم الأيمن" : "Right Calendar"}
				</Label>
				<RadioGroup
					value={rightCalendarView}
					onValueChange={onRightCalendarViewChange}
					className="grid grid-cols-2 gap-1"
				>
					{viewOptions.map((option) => (
						<div key={`right-${option.value}`}>
							<RadioGroupItem
								value={option.value}
								id={`right-calendar-view-${option.value}`}
								className="peer sr-only"
							/>
							<Label
								htmlFor={`right-calendar-view-${option.value}`}
								className="flex flex-col items-center justify-between rounded-md border border-muted bg-transparent p-1.5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
							>
								<option.icon className="mb-0.5 h-3 w-3" />
								<span className="text-[10px]">{option.label}</span>
							</Label>
						</div>
					))}
				</RadioGroup>
			</div>
		</div>
	);
}

export function DockNavSimple({
	className = "",
	currentCalendarView = "multiMonthYear",
	onCalendarViewChange,
	leftCalendarView = "multiMonthYear",
	rightCalendarView = "multiMonthYear",
	onLeftCalendarViewChange,
	onRightCalendarViewChange,
	leftCalendarRef,
	rightCalendarRef,
	isDualMode: _isDualMode = false,
}: DockNavSimpleProps) {
	const pathname = usePathname();
	const { isRTL, setUseArabicText } = useLanguage();
	const { freeRoam, setFreeRoam, showDualCalendar, setShowDualCalendar } =
		useSettings();
	const { recordingState } = useVacation();
	const { theme: _theme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("view");

	const isCalendarPage = pathname === "/";

	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Reset to view tab if vacation tab is selected but disabled
	const viewMode = freeRoam
		? "freeRoam"
		: showDualCalendar
			? "dual"
			: "default";
	React.useEffect(() => {
		if (activeTab === "vacation" && viewMode !== "default") {
			setActiveTab("view");
		}
	}, [viewMode, activeTab]);

	const _handleLanguageToggle = (checked: boolean) => {
		setUseArabicText(checked);
		toastService.success(
			checked ? "تم التبديل إلى العربية" : "Switched to English",
		);
	};

	const _handleThemeToggle = (checked: boolean) => {
		const newTheme = checked ? "dark" : "light";
		setTheme(newTheme);
		toastService.success(
			isRTL
				? `تم التبديل إلى الوضع ${newTheme === "dark" ? "الليلي" : "النهاري"}`
				: `Switched to ${newTheme} mode`,
		);
	};

	const _handleViewModeChange = (value: "default" | "freeRoam" | "dual") => {
		const isFreeRoam = value === "freeRoam";
		const isDual = value === "dual";

		setFreeRoam(isFreeRoam);
		setShowDualCalendar(isDual);

		toastService.success(
			isRTL
				? `تم تغيير وضع العرض إلى ${value}`
				: `View mode changed to ${value}`,
		);
	};

	const handleCalendarViewChange = (view: string) => {
		onCalendarViewChange?.(view);
	};

	const handleLeftCalendarViewChange = (view: string) => {
		if (leftCalendarRef?.current) {
			const api = leftCalendarRef.current.getApi?.();
			if (api) {
				api.changeView(view);
			}
		}
		onLeftCalendarViewChange?.(view);
	};

	const handleRightCalendarViewChange = (view: string) => {
		if (rightCalendarRef?.current) {
			const api = rightCalendarRef.current.getApi?.();
			if (api) {
				api.changeView(view);
			}
		}
		onRightCalendarViewChange?.(view);
	};

	const _viewOptions = getCalendarViewOptions(isRTL);

	const _isRecording = recordingState.periodIndex !== null;

	const isActive = (href: string) => {
		if (href === "/" && pathname === "/") return true;
		if (href !== "/" && pathname.startsWith(href)) return true;
		return false;
	};

	if (!mounted) {
		return null;
	}

	return (
		<TooltipProvider>
			<Dock direction="middle" className={cn("h-auto min-h-[44px]", className)}>
				<DockIcon>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link
								href="/dashboard"
								aria-label={isRTL ? "لوحة التحكم" : "Dashboard"}
								className={cn(
									buttonVariants({
										variant: isActive("/dashboard") ? "default" : "ghost",
										size: "icon",
									}),
									"size-9 rounded-full transition-all duration-200",
									isActive("/dashboard") && "shadow-lg",
								)}
							>
								<BarChart3 className="size-4" />
							</Link>
						</TooltipTrigger>
						<TooltipContent>
							<p>{isRTL ? "لوحة التحكم" : "Dashboard"}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>

				{/* Separator */}
				<Separator orientation="vertical" className="h-full py-2" />

				{/* Settings Popover */}
				<DockIcon>
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<StablePopoverButton
										variant="ghost"
										size="icon"
										className="size-9 rounded-full"
										aria-label={isRTL ? "الإعدادات" : "Settings"}
									>
										<Settings className="size-4" />
									</StablePopoverButton>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<p>{isRTL ? "الإعدادات" : "Settings"}</p>
							</TooltipContent>
						</Tooltip>

						<PopoverContent
							align="center"
							className="w-auto max-w-[500px] bg-background/70 backdrop-blur-md border-border/40"
						>
							<SettingsTabs
								isRTL={isRTL}
								activeTab={activeTab}
								onTabChange={setActiveTab}
								currentCalendarView={currentCalendarView}
								onCalendarViewChange={handleCalendarViewChange}
								isCalendarPage={isCalendarPage}
								customViewSelector={
									_isDualMode && viewMode === "dual" ? (
										<DualCalendarViewSelector
											isRTL={isRTL}
											leftCalendarView={leftCalendarView}
											rightCalendarView={rightCalendarView}
											onLeftCalendarViewChange={handleLeftCalendarViewChange}
											onRightCalendarViewChange={handleRightCalendarViewChange}
											leftCalendarRef={leftCalendarRef}
											rightCalendarRef={rightCalendarRef}
										/>
									) : (
										(undefined as React.ReactElement | undefined)
									)
								}
							/>
						</PopoverContent>
					</Popover>
				</DockIcon>
			</Dock>
		</TooltipProvider>
	);
}
