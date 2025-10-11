"use client";

import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { buttonVariants } from "@ui/button";
import { Label } from "@ui/label";
import { Separator } from "@ui/separator";
import { BarChart3, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { SettingsTabs } from "@/features/settings/settings";
import { i18n } from "@/shared/libs/i18n";
import { Dock, DockIcon } from "@/shared/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { StablePopoverButton } from "@/shared/ui/stable-popover-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";
import { getCalendarViewOptions } from "@/widgets/calendar/CalendarToolbar";

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
	settingsOpen?: boolean;
	onSettingsOpenChange?: (open: boolean) => void;
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
		<div className="grid grid-cols-2 gap-2">
			<div className="space-y-1.5">
				<Label className="text-[0.72rem] text-muted-foreground text-center block leading-none">
					{i18n.getMessage("left_calendar", isLocalized)}
				</Label>
				<RadioGroup
					value={leftCalendarView ?? null}
					onValueChange={onLeftCalendarViewChange ?? (() => {})}
					className="grid grid-cols-2 gap-2"
				>
					{viewOptions.map((option) => (
						<div
							key={`left-${option.value}`}
							className="border-input [&:has([data-state=checked])]:border-primary/60 relative flex flex-col gap-3 rounded-md border p-3 shadow-xs outline-none"
						>
							<div className="flex justify-between gap-2">
								<RadioGroupItem
									value={option.value}
									id={`left-calendar-view-${option.value}`}
									className="order-1 after:absolute after:inset-0"
								/>
								<option.icon className="opacity-70" size={16} aria-hidden="true" />
							</div>
							<Label htmlFor={`left-calendar-view-${option.value}`} className="text-[0.82rem] leading-none">
								{option.label}
							</Label>
						</div>
					))}
				</RadioGroup>
			</div>

			<div className="space-y-1.5">
				<Label className="text-[0.72rem] text-muted-foreground text-center block leading-none">
					{i18n.getMessage("right_calendar", isLocalized)}
				</Label>
				<RadioGroup
					value={rightCalendarView ?? null}
					onValueChange={onRightCalendarViewChange ?? (() => {})}
					className="grid grid-cols-2 gap-2"
				>
					{viewOptions.map((option) => (
						<div
							key={`right-${option.value}`}
							className="border-input [&:has([data-state=checked])]:border-primary/60 relative flex flex-col gap-3 rounded-md border p-3 shadow-xs outline-none"
						>
							<div className="flex justify-between gap-2">
								<RadioGroupItem
									value={option.value}
									id={`right-calendar-view-${option.value}`}
									className="order-1 after:absolute after:inset-0"
								/>
								<option.icon className="opacity-70" size={16} aria-hidden="true" />
							</div>
							<Label htmlFor={`right-calendar-view-${option.value}`} className="text-[0.82rem] leading-none">
								{option.label}
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
	const [mounted, setMounted] = React.useState(false);
	const [activeTab, setActiveTab] = React.useState("view");
	const [internalOpen, setInternalOpen] = React.useState(false);
	const isControlled = typeof controlledOpen === "boolean";
	const settingsOpen = isControlled ? (controlledOpen as boolean) : internalOpen;
	const [suppressTooltip, setSuppressTooltip] = React.useState(false);

	const isCalendarPage = pathname === "/";

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const handleSettingsOpenChange = (next: boolean) => {
		if (isControlled) {
			onSettingsOpenChange?.(next);
		} else {
			setInternalOpen(next);
		}
		if (!next) {
			setSuppressTooltip(true);
			window.setTimeout(() => setSuppressTooltip(false), 300);
		}
	};

	// Reset to view tab if vacation tab is selected but disabled
	const viewMode = freeRoam ? "freeRoam" : showDualCalendar ? "dual" : "default";
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
							api.setOption("validRange", freeRoam ? undefined : getValidRange(freeRoam));
							if (lower.includes("timegrid")) {
								api.setOption("eventConstraint", freeRoam ? undefined : "businessHours");
								api.setOption("selectConstraint", freeRoam ? undefined : "businessHours");
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
				if (!(api?.view && (api as unknown as { view: { type?: string } }).view?.type)) {
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
							api.setOption("validRange", freeRoam ? undefined : getValidRange(freeRoam));
							if (lower.includes("timegrid")) {
								api.setOption("eventConstraint", freeRoam ? undefined : "businessHours");
								api.setOption("selectConstraint", freeRoam ? undefined : "businessHours");
							}
						}
						requestAnimationFrame(() => {
							try {
								api.updateSize?.();
							} catch {}
						});
					} catch {}
				};

				if (!(api?.view && (api as unknown as { view: { type?: string } }).view?.type)) {
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
			<Dock direction="middle" className={cn("h-auto min-h-[2.25rem]", className)}>
				<DockIcon>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link
								href="/dashboard"
								aria-label={i18n.getMessage("dashboard_title", isLocalized)}
								className={cn(
									buttonVariants({
										variant: isActive("/dashboard") ? "default" : "ghost",
										size: "icon",
									}),
									"size-9 rounded-full transition-all duration-200",
									isActive("/dashboard") && "shadow-lg"
								)}
							>
								<BarChart3 className="size-4" />
							</Link>
						</TooltipTrigger>
						<TooltipContent>
							<p>{i18n.getMessage("dashboard_title", isLocalized)}</p>
						</TooltipContent>
					</Tooltip>
				</DockIcon>

				{/* Separator */}
				<Separator orientation="vertical" className="h-full py-2" />

				{/* Settings Popover */}
				<DockIcon>
					<Popover open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
						<Tooltip {...(settingsOpen || suppressTooltip ? { open: false } : {})}>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<StablePopoverButton
										className="size-9 rounded-full transition-colors duration-300 ease-out"
										aria-label={i18n.getMessage("settings", isLocalized)}
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
							</TooltipTrigger>
							<TooltipContent>
								<p>{i18n.getMessage("settings", isLocalized)}</p>
							</TooltipContent>
						</Tooltip>

						<PopoverContent
							align="center"
							className="w-auto max-w-[31.25rem] bg-background/70 backdrop-blur-md border-border/40"
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
