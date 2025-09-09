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
import { getValidRange } from "@/lib/calendar-config";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { cn } from "@/lib/utils";

interface DockNavSimpleProps {
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
}

interface DualCalendarViewSelectorProps {
	isLocalized?: boolean;
	leftCalendarView?: string;
	rightCalendarView?: string;
	onLeftCalendarViewChange?: (view: string) => void;
	onRightCalendarViewChange?: (view: string) => void;
	leftCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	rightCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
	isDualMode?: boolean;
}

function DualCalendarViewSelector({
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
		<div className="grid grid-cols-2 gap-4">
			<div className="space-y-2">
				<Label className="text-xs text-muted-foreground text-center block">
					{isLocalized ? "التقويم الأيسر" : "Left Calendar"}
				</Label>
				<RadioGroup
					value={leftCalendarView ?? null}
					onValueChange={onLeftCalendarViewChange ?? (() => {})}
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
					{isLocalized ? "التقويم الأيمن" : "Right Calendar"}
				</Label>
				<RadioGroup
					value={rightCalendarView ?? null}
					onValueChange={onRightCalendarViewChange ?? (() => {})}
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
	const { isLocalized } = useLanguage();
	const { freeRoam, showDualCalendar } = useSettings();
	const { theme: _theme } = useTheme();
	const [mounted, setMounted] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("view");
	const [settingsOpen, setSettingsOpen] = React.useState(false);
	const [suppressTooltip, setSuppressTooltip] = React.useState(false);

	const isCalendarPage = pathname === "/";

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const handleSettingsOpenChange = (next: boolean) => {
		setSettingsOpen(next);
		if (!next) {
			setSuppressTooltip(true);
			window.setTimeout(() => setSuppressTooltip(false), 300);
		}
	};

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

	const handleCalendarViewChange = (view: string) => {
		onCalendarViewChange?.(view);
	};

	const handleLeftCalendarViewChange = (view: string) => {
		if (leftCalendarRef?.current) {
			const api = leftCalendarRef.current.getApi?.();
			if (api) {
				const doChange = () => {
					try {
						// Clear constraints before changing view to avoid plugin issues
						api.setOption("validRange", undefined);
						api.setOption("eventConstraint", undefined);
						api.setOption("selectConstraint", undefined);
					} catch {}

					try {
						api.changeView(view);
					} catch {}

					// Reapply constraints only for non-multimonth views
					try {
						const lower = (view || "").toLowerCase();
						const isMultiMonth = lower === "multimonthyear";
						if (!isMultiMonth) {
							api.setOption(
								"validRange",
								freeRoam ? undefined : getValidRange(freeRoam),
							);
							if (lower.includes("timegrid")) {
								api.setOption(
									"eventConstraint",
									freeRoam ? undefined : "businessHours",
								);
								api.setOption(
									"selectConstraint",
									freeRoam ? undefined : "businessHours",
								);
							}
						}
						// let the layout settle
						requestAnimationFrame(() => {
							try {
								api.updateSize?.();
							} catch {}
						});
					} catch {}
				};

				// If view is not ready yet, delay the change slightly
				if (
					!(
						api?.view &&
						(api as unknown as { view: { type?: string } }).view?.type
					)
				) {
					setTimeout(doChange, 50);
				} else {
					doChange();
				}
			}
		}
		onLeftCalendarViewChange?.(view);
	};

	const handleRightCalendarViewChange = (view: string) => {
		if (rightCalendarRef?.current) {
			const api = rightCalendarRef.current.getApi?.();
			if (api) {
				const doChange = () => {
					try {
						api.setOption("validRange", undefined);
						api.setOption("eventConstraint", undefined);
						api.setOption("selectConstraint", undefined);
					} catch {}

					try {
						api.changeView(view);
					} catch {}

					try {
						const lower = (view || "").toLowerCase();
						const isMultiMonth = lower === "multimonthyear";
						if (!isMultiMonth) {
							api.setOption(
								"validRange",
								freeRoam ? undefined : getValidRange(freeRoam),
							);
							if (lower.includes("timegrid")) {
								api.setOption(
									"eventConstraint",
									freeRoam ? undefined : "businessHours",
								);
								api.setOption(
									"selectConstraint",
									freeRoam ? undefined : "businessHours",
								);
							}
						}
						requestAnimationFrame(() => {
							try {
								api.updateSize?.();
							} catch {}
						});
					} catch {}
				};

				if (
					!(
						api?.view &&
						(api as unknown as { view: { type?: string } }).view?.type
					)
				) {
					setTimeout(doChange, 50);
				} else {
					doChange();
				}
			}
		}
		onRightCalendarViewChange?.(view);
	};

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
								aria-label={isLocalized ? "لوحة التحكم" : "Dashboard"}
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
							<p>{isLocalized ? "لوحة التحكم" : "Dashboard"}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>

				{/* Separator */}
				<Separator orientation="vertical" className="h-full py-2" />

				{/* Settings Popover */}
				<DockIcon>
					<Popover open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
						<Tooltip open={settingsOpen || suppressTooltip ? false : undefined}>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<StablePopoverButton
										className="size-9 rounded-full transition-colors duration-300 ease-out"
										aria-label={isLocalized ? "الإعدادات" : "Settings"}
										variant={settingsOpen ? "default" : "ghost"}
									>
										<Settings className={cn("size-4 transform transition-transform duration-300 ease-out", settingsOpen ? "rotate-90" : "rotate-0")} />
									</StablePopoverButton>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<p>{isLocalized ? "الإعدادات" : "Settings"}</p>
							</TooltipContent>
						</Tooltip>

						<PopoverContent
							align="center"
							className="w-auto max-w-[500px] bg-background/70 backdrop-blur-md border-border/40"
						>
							{_isDualMode && viewMode === "dual" ? (
								<SettingsTabs
									isLocalized={isLocalized}
									activeTab={activeTab}
									onTabChange={setActiveTab}
									currentCalendarView={currentCalendarView}
									onCalendarViewChange={handleCalendarViewChange}
									isCalendarPage={isCalendarPage}
									customViewSelector={
										<DualCalendarViewSelector
											isLocalized={isLocalized}
											leftCalendarView={leftCalendarView}
											rightCalendarView={rightCalendarView}
											onLeftCalendarViewChange={handleLeftCalendarViewChange}
											onRightCalendarViewChange={handleRightCalendarViewChange}
											leftCalendarRef={leftCalendarRef || null}
											rightCalendarRef={rightCalendarRef || null}
										/>
									}
								/>
							) : (
								<SettingsTabs
									isLocalized={isLocalized}
									activeTab={activeTab}
									onTabChange={setActiveTab}
									currentCalendarView={currentCalendarView}
									onCalendarViewChange={handleCalendarViewChange}
									isCalendarPage={isCalendarPage}
								/>
							)}
						</PopoverContent>
					</Popover>
				</DockIcon>
			</Dock>
		</TooltipProvider>
	);
}
