"use client";

import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { buttonVariants } from "@ui/button";
import { Label } from "@ui/label";
import { Separator } from "@ui/separator";
import { BarChart3, Eye, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SettingsTabs } from "@/features/settings/settings";
import { ViewModeToolbar } from "@/features/settings/settings/view-mode-toolbar";
import { i18n } from "@/shared/libs/i18n";
import { Dock, DockIcon } from "@/shared/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { StablePopoverButton } from "@/shared/ui/stable-popover-button";
import { getCalendarViewOptions } from "@/widgets/calendar/calendar-toolbar";
import type { CalendarCoreRef } from "@/widgets/calendar/types";

type DockNavSimpleProps = {
	className?: string;
	currentCalendarView?: string;
	onCalendarViewChange?: (view: string) => void;
	leftCalendarView?: string;
	rightCalendarView?: string;
	onLeftCalendarViewChange?: (view: string) => void;
	onRightCalendarViewChange?: (view: string) => void;
	leftCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	rightCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	isDualMode?: boolean;
	settingsOpen?: boolean;
	onSettingsOpenChange?: (open: boolean) => void;
};

type DualCalendarViewSelectorProps = {
	isLocalized?: boolean;
	leftCalendarView?: string;
	rightCalendarView?: string;
	onLeftCalendarViewChange?: (view: string) => void;
	onRightCalendarViewChange?: (view: string) => void;
	leftCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	rightCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	isDualMode?: boolean;
};

function noop(): void {
	// No-op handler
}

export function DualCalendarViewSelector({
	isLocalized = false,
	leftCalendarView,
	rightCalendarView,
	onLeftCalendarViewChange,
	onRightCalendarViewChange,
	leftCalendarRef: _leftCalendarRef,
	rightCalendarRef: _rightCalendarRef,
}: DualCalendarViewSelectorProps) {
	const viewOptions = getCalendarViewOptions(isLocalized);

	return (
		<div className="space-y-3">
			{/* View Mode Selector */}
			<div className="flex items-center justify-between gap-2 rounded-md border bg-background/40 p-2 backdrop-blur-sm">
				<div className="flex items-center gap-1.5">
					<Eye className="h-3.5 w-3.5" />
					<span className="font-medium text-[0.8rem] leading-none">
						{i18n.getMessage("settings_view", isLocalized)}
					</span>
				</div>
				<ViewModeToolbar />
			</div>

			{/* Calendar View Selectors */}
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1.5">
					<Label className="block text-center text-[0.72rem] text-muted-foreground leading-none">
						{i18n.getMessage("left_calendar", isLocalized)}
					</Label>
					<RadioGroup
						className="grid grid-cols-2 gap-2"
						onValueChange={onLeftCalendarViewChange ?? noop}
						value={leftCalendarView ?? null}
					>
						{viewOptions.map((option) => {
							const Icon = option.icon as React.ElementType;
							return (
								<div
									className="relative flex flex-col gap-3 rounded-md border border-input p-3 shadow-xs outline-none [&:has([data-state=checked])]:border-primary/60"
									key={`left-${option.value}`}
								>
									<div className="flex justify-between gap-2">
										<RadioGroupItem
											className="order-1 after:absolute after:inset-0"
											id={`left-calendar-view-${option.value}`}
											value={option.value}
										/>
										<Icon aria-hidden="true" className="opacity-70" size={16} />
									</div>
									<Label
										className="text-[0.82rem] leading-none"
										htmlFor={`left-calendar-view-${option.value}`}
									>
										{option.label}
									</Label>
								</div>
							);
						})}
					</RadioGroup>
				</div>

				<div className="space-y-1.5">
					<Label className="block text-center text-[0.72rem] text-muted-foreground leading-none">
						{i18n.getMessage("right_calendar", isLocalized)}
					</Label>
					<RadioGroup
						className="grid grid-cols-2 gap-2"
						onValueChange={onRightCalendarViewChange ?? noop}
						value={rightCalendarView ?? null}
					>
						{viewOptions.map((option) => {
							const Icon = option.icon as React.ElementType;
							return (
								<div
									className="relative flex flex-col gap-3 rounded-md border border-input p-3 shadow-xs outline-none [&:has([data-state=checked])]:border-primary/60"
									key={`right-${option.value}`}
								>
									<div className="flex justify-between gap-2">
										<RadioGroupItem
											className="order-1 after:absolute after:inset-0"
											id={`right-calendar-view-${option.value}`}
											value={option.value}
										/>
										<Icon aria-hidden="true" className="opacity-70" size={16} />
									</div>
									<Label
										className="text-[0.82rem] leading-none"
										htmlFor={`right-calendar-view-${option.value}`}
									>
										{option.label}
									</Label>
								</div>
							);
						})}
					</RadioGroup>
				</div>
			</div>
		</div>
	);
}

export function DockNavSimple({
	className = "",
	currentCalendarView = "timeGridWeek",
	onCalendarViewChange,
	leftCalendarView = "timeGridWeek",
	rightCalendarView = "timeGridWeek",
	onLeftCalendarViewChange,
	onRightCalendarViewChange,
	leftCalendarRef,
	rightCalendarRef,
	isDualMode: _isDualMode = false,
	settingsOpen: controlledOpen,
	onSettingsOpenChange,
}: DockNavSimpleProps) {
	const pathname = usePathname();
	const { isLocalized } = useLanguage();
	const { freeRoam, showDualCalendar } = useSettings();
	const { theme: _theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [activeTab, setActiveTab] = useState("view");
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = typeof controlledOpen === "boolean";
	const settingsOpen = isControlled
		? (controlledOpen as boolean)
		: internalOpen;

	const isCalendarPage = pathname === "/";

	useEffect(() => {
		setMounted(true);
	}, []);

	const handleSettingsOpenChange = (next: boolean) => {
		if (isControlled) {
			onSettingsOpenChange?.(next);
		} else {
			setInternalOpen(next);
		}
	};

	// Determine view mode
	let viewMode: "freeRoam" | "dual" | "default";
	if (freeRoam) {
		viewMode = "freeRoam";
	} else if (showDualCalendar) {
		viewMode = "dual";
	} else {
		viewMode = "default";
	}

	useEffect(() => {
		if (activeTab === "vacation" && viewMode !== "default") {
			setActiveTab("view");
		}
	}, [viewMode, activeTab]);

	const handleCalendarViewChange = (view: string) => {
		onCalendarViewChange?.(view);
	};

	// Helper to check if view is multimonth
	const isMultiMonthView = (view: string) =>
		view.toLowerCase() === "multimonthyear";

	// Helper to check if view is timegrid
	const isTimegridView = (view: string) =>
		view.toLowerCase().includes("timegrid");

	// Helper to set time-based constraints
	const setTimeGridConstraints = (apiObj: Record<string, unknown>) => {
		try {
			(
				apiObj.setOption as ((key: string, value: unknown) => void) | undefined
			)?.("eventConstraint", freeRoam ? undefined : "businessHours");
			(
				apiObj.setOption as ((key: string, value: unknown) => void) | undefined
			)?.("selectConstraint", freeRoam ? undefined : "businessHours");
		} catch {
			// Calendar API may fail in some contexts
		}
	};

	// Helper to clear calendar constraints before view change
	const clearViewConstraints = (apiObj: Record<string, unknown>) => {
		try {
			(
				apiObj.setOption as ((key: string, value: unknown) => void) | undefined
			)?.("validRange", undefined);
			(
				apiObj.setOption as ((key: string, value: unknown) => void) | undefined
			)?.("eventConstraint", undefined);
			(
				apiObj.setOption as ((key: string, value: unknown) => void) | undefined
			)?.("selectConstraint", undefined);
		} catch {
			// Calendar API may fail in some contexts
		}
	};

	// Helper to reapply constraints after view change
	const reapplyViewConstraints = (
		apiObj: Record<string, unknown>,
		view: string
	) => {
		try {
			if (isMultiMonthView(view)) {
				return; // Skip for multimonth views
			}
			(
				apiObj.setOption as ((key: string, value: unknown) => void) | undefined
			)?.("validRange", freeRoam ? undefined : getValidRange(freeRoam));
			if (isTimegridView(view)) {
				setTimeGridConstraints(apiObj);
			}
		} catch {
			// Calendar API may fail in some contexts
		}
	};

	// Helper to perform the actual view change
	const performViewChange = (apiObj: Record<string, unknown>, view: string) => {
		try {
			(apiObj.changeView as (v: string) => void)?.(view);
		} catch {
			// Calendar API may fail in some contexts
		}
	};

	// Helper to update layout after view change
	const updateCalendarLayout = (apiObj: Record<string, unknown>) => {
		try {
			requestAnimationFrame(() => {
				try {
					(apiObj.updateSize as () => void)?.();
				} catch {
					// Calendar API may fail in some contexts
				}
			});
		} catch {
			// Calendar API may fail in some contexts
		}
	};

	// Helper to change calendar view with proper constraints
	const createViewChangeHandler =
		(
			calendarRef: React.RefObject<CalendarCoreRef | null> | null | undefined,
			onViewChange?: (view: string) => void
		) =>
		(view: string) => {
			if (calendarRef?.current?.getApi) {
				const api = calendarRef.current.getApi();
				if (api) {
					const apiObj = api as unknown as Record<string, unknown>;
					clearViewConstraints(apiObj);
					performViewChange(apiObj, view);
					reapplyViewConstraints(apiObj, view);
					updateCalendarLayout(apiObj);
				}
			}
			onViewChange?.(view);
		};

	const handleLeftCalendarViewChange = createViewChangeHandler(
		leftCalendarRef,
		onLeftCalendarViewChange
	);
	const handleRightCalendarViewChange = createViewChangeHandler(
		rightCalendarRef,
		onRightCalendarViewChange
	);

	const isActive = (href: string) => {
		if (href === "/" && pathname === "/") {
			return true;
		}
		if (href !== "/" && pathname.startsWith(href)) {
			return true;
		}
		return false;
	};

	if (!mounted) {
		return null;
	}

	return (
		<Dock
			className={cn("h-auto min-h-[2.25rem]", className)}
			direction="middle"
		>
			<DockIcon>
				<Link
					aria-label={i18n.getMessage("dashboard_title", isLocalized)}
					className={cn(
						buttonVariants({
							variant: isActive("/dashboard") ? "default" : "ghost",
							size: "icon",
						}),
						"size-9 rounded-full transition-all duration-200",
						isActive("/dashboard") && "shadow-lg"
					)}
					href="/dashboard"
				>
					<BarChart3 className="size-4" />
				</Link>
			</DockIcon>

			{/* Separator */}
			<Separator className="h-full py-2" orientation="vertical" />

			{/* Settings Popover */}
			<DockIcon>
				<Popover onOpenChange={handleSettingsOpenChange} open={settingsOpen}>
					<PopoverTrigger asChild>
						<StablePopoverButton
							aria-label={i18n.getMessage("settings", isLocalized)}
							className="size-9 rounded-full transition-colors duration-300 ease-out"
							variant={settingsOpen ? "default" : "ghost"}
						>
							<Settings
								className={cn(
									"size-4 transform transition-transform duration-300 ease-out",
									settingsOpen ? "rotate-90" : "rotate-0"
								)}
							/>
						</StablePopoverButton>
					</PopoverTrigger>

					<PopoverContent
						align="center"
						className="w-auto max-w-[31.25rem] border-border/40 bg-background/70 backdrop-blur-md"
					>
						{_isDualMode && viewMode === "dual" ? (
							<SettingsTabs
								activeTab={activeTab}
								currentCalendarView={currentCalendarView}
								customViewSelector={
									<DualCalendarViewSelector
										isLocalized={isLocalized}
										leftCalendarRef={leftCalendarRef || null}
										leftCalendarView={leftCalendarView}
										onLeftCalendarViewChange={handleLeftCalendarViewChange}
										onRightCalendarViewChange={handleRightCalendarViewChange}
										rightCalendarRef={rightCalendarRef || null}
										rightCalendarView={rightCalendarView}
									/>
								}
								isCalendarPage={isCalendarPage}
								isLocalized={isLocalized}
								onCalendarViewChange={handleCalendarViewChange}
								onTabChange={setActiveTab}
							/>
						) : (
							<SettingsTabs
								activeTab={activeTab}
								currentCalendarView={currentCalendarView}
								isCalendarPage={isCalendarPage}
								isLocalized={isLocalized}
								onCalendarViewChange={handleCalendarViewChange}
								onTabChange={setActiveTab}
							/>
						)}
					</PopoverContent>
				</Popover>
			</DockIcon>
		</Dock>
	);
}
