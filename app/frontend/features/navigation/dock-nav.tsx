"use client";

import { useCtrlViewSwitch } from "@features/navigation/hooks/use-ctrl-view-switch";
import { useDockNavigation } from "@features/navigation/hooks/use-dock-navigation";
import type { DockNavProps, ExtendedNavigationContextValue } from "@features/navigation/types";
import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import * as React from "react";
import {
	CalendarLink,
	NavigationControls,
	NavigationDateButton,
	NavigationLinks,
} from "@/features/navigation/navigation";
import { SettingsPopover } from "@/features/settings/settings/settings-popover";
import { Dock } from "@/shared/ui/dock";
import { FitWidthScale } from "@/shared/ui/fit-width-scale";
import { TooltipProvider } from "@/shared/ui/tooltip";
import type { CalendarCoreRef } from "@/widgets/calendar/CalendarCore";
import { getCalendarViewOptions } from "@/widgets/calendar/CalendarToolbar";
import { DualCalendarViewSelector } from "./dock-nav-simple";

export function DockNav({
	className = "",
	currentCalendarView = "timeGridWeek",
	calendarRef,
	onCalendarViewChange,
	navigationOnly = false,
	variant: _variant = "default",
	settingsOpen: controlledOpen,
	onSettingsOpenChange,
	layout = "centered",
	dualModeTopDock = false,
}: DockNavProps) {
	const nav = useDockNavigation({
		calendarRef: (calendarRef || null) as React.RefObject<CalendarCoreRef> | null,
		currentCalendarView,
		onCalendarViewChange: onCalendarViewChange || (() => {}),
	}) as ExtendedNavigationContextValue;
	const { isLocalized } = useLanguage();
	const { state: dockBridgeState } = useDockBridge();
	const { freeRoam } = useSettings();

	// All hooks must be called before any early returns
	const [internalOpen, setInternalOpen] = React.useState(false);
	const isControlled = typeof controlledOpen === "boolean";
	const settingsOpen = isControlled ? (controlledOpen as boolean) : internalOpen;

	// Right calendar view change handler must be defined before any early returns
	const handleRightCalendarViewChange = React.useCallback(
		(view: string) => {
			const api = dockBridgeState?.rightCalendarRef?.current?.getApi?.();
			if (api) {
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
			}
			try {
				dockBridgeState?.onRightCalendarViewChange?.(view);
			} catch {}
		},
		[dockBridgeState?.rightCalendarRef, dockBridgeState?.onRightCalendarViewChange, freeRoam]
	);

	// Bind Ctrl+ArrowUp/Down to change calendar view using existing handler
	// Compute next/prev view values from activeView
	const onCtrlUp = React.useCallback(() => {
		try {
			const opts = getCalendarViewOptions(isLocalized);
			const current = nav.navigation.activeView || currentCalendarView;
			const index = opts.findIndex((o) => o.value === current);
			const nextIndex = (index - 1 + opts.length) % opts.length;
			nav.handlers.handleCalendarViewChange(opts[nextIndex]?.value || "multiMonthYear");
		} catch {}
	}, [isLocalized, nav.navigation.activeView, nav.handlers, currentCalendarView]);

	const onCtrlDown = React.useCallback(() => {
		try {
			const opts = getCalendarViewOptions(isLocalized);
			const current = nav.navigation.activeView || currentCalendarView;
			const index = opts.findIndex((o) => o.value === current);
			const nextIndex = (index + 1) % opts.length;
			nav.handlers.handleCalendarViewChange(opts[nextIndex]?.value || "multiMonthYear");
		} catch {}
	}, [isLocalized, nav.navigation.activeView, nav.handlers, currentCalendarView]);

	useCtrlViewSwitch({ onUp: onCtrlUp, onDown: onCtrlDown });

	if (!nav.state.mounted) {
		return null;
	}

	const { navigation } = nav;

	// (duplicate declaration removed)

	const customViewSelector =
		navigationOnly && dockBridgeState?.rightCalendarRef ? (
			<DualCalendarViewSelector
				isLocalized={isLocalized}
				leftCalendarView={currentCalendarView}
				rightCalendarView={dockBridgeState.rightCalendarView || "timeGridWeek"}
				onLeftCalendarViewChange={nav.handlers.handleCalendarViewChange}
				onRightCalendarViewChange={handleRightCalendarViewChange}
				leftCalendarRef={(dockBridgeState.calendarRef || null) as React.RefObject<CalendarCoreRef | null>}
				rightCalendarRef={(dockBridgeState.rightCalendarRef || null) as React.RefObject<CalendarCoreRef | null>}
			/>
		) : undefined;

	const renderCentered = () => (
		<TooltipProvider>
			<Dock
				direction="middle"
				className={cn(
					"mt-0",
					// Make dock fit content width for non-calendar pages
					!navigation.isCalendarPage && !navigationOnly && !dualModeTopDock ? "w-auto inline-flex" : "",
					className
				)}
			>
				{dualModeTopDock ? (
					// Dual calendar mode top dock: only page links + settings, no navigation controls
					<>
						<NavigationLinks isLocalized={navigation.isLocalized} isActive={nav.computed.isActive} />
						<SettingsPopover
							isLocalized={navigation.isLocalized}
							activeTab={nav.state.activeTab}
							onTabChange={nav.handlers.setActiveTab}
							currentCalendarView={currentCalendarView}
							activeView={navigation.activeView}
							onCalendarViewChange={nav.handlers.handleCalendarViewChange}
							isCalendarPage={navigation.isCalendarPage}
							open={settingsOpen}
							onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
							{...(customViewSelector ? { customViewSelector } : {})}
							hideViewModeToolbar={false}
						/>
					</>
				) : navigationOnly ? (
					<>
						<NavigationControls
							isLocalized={navigation.isLocalized}
							isCalendarPage={false}
							isPrevDisabled={navigation.isPrevDisabled}
							isNextDisabled={navigation.isNextDisabled}
							onPrev={navigation.handlePrev}
							onNext={navigation.handleNext}
						/>
						<NavigationDateButton
							title={navigation.title}
							isLocalized={navigation.isLocalized}
							isCalendarPage={false}
							isTodayDisabled={navigation.isTodayDisabled}
							onToday={navigation.handleToday}
							navigationOnly={true}
							visibleEventCount={navigation.visibleEventCount}
						/>
						<SettingsPopover
							isLocalized={navigation.isLocalized}
							activeTab={nav.state.activeTab}
							onTabChange={nav.handlers.setActiveTab}
							currentCalendarView={currentCalendarView}
							activeView={navigation.activeView}
							onCalendarViewChange={nav.handlers.handleCalendarViewChange}
							isCalendarPage={navigation.isCalendarPage}
							allowedTabs={["view"] as const}
							open={settingsOpen}
							onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
							{...(customViewSelector ? { customViewSelector } : {})}
							hideViewModeToolbar={true}
						/>
					</>
				) : !navigation.isCalendarPage ? (
					navigation.isDocumentsPage ? (
						// Documents page: show all page links + settings button for theme
						<>
							<CalendarLink isLocalized={navigation.isLocalized} />
							<NavigationLinks isLocalized={navigation.isLocalized} isActive={nav.computed.isActive} />
							<SettingsPopover
								isLocalized={navigation.isLocalized}
								activeTab={nav.state.activeTab}
								onTabChange={nav.handlers.setActiveTab}
								currentCalendarView={currentCalendarView}
								activeView={navigation.activeView}
								onCalendarViewChange={nav.handlers.handleCalendarViewChange}
								isCalendarPage={false}
								open={settingsOpen}
								onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
								allowedTabs={["general"] as const}
								hideViewModeToolbar={true}
							/>
						</>
					) : (
						// Dashboard page: show all page links only
						<>
							<CalendarLink isLocalized={navigation.isLocalized} />
							<NavigationLinks isLocalized={navigation.isLocalized} isActive={nav.computed.isActive} />
						</>
					)
				) : (
					<>
						<NavigationControls
							isLocalized={navigation.isLocalized}
							isCalendarPage={navigation.isCalendarPage}
							isPrevDisabled={navigation.isPrevDisabled}
							isNextDisabled={navigation.isNextDisabled}
							onPrev={navigation.handlePrev}
							onNext={navigation.handleNext}
						/>
						<NavigationDateButton
							title={navigation.title}
							isLocalized={navigation.isLocalized}
							isCalendarPage={navigation.isCalendarPage}
							isTodayDisabled={navigation.isTodayDisabled}
							onToday={navigation.handleToday}
							navigationOnly={navigationOnly}
							visibleEventCount={navigation.visibleEventCount}
						/>
						<NavigationLinks isLocalized={navigation.isLocalized} isActive={nav.computed.isActive} />
						<SettingsPopover
							isLocalized={navigation.isLocalized}
							activeTab={nav.state.activeTab}
							onTabChange={nav.handlers.setActiveTab}
							currentCalendarView={currentCalendarView}
							activeView={navigation.activeView}
							onCalendarViewChange={nav.handlers.handleCalendarViewChange}
							isCalendarPage={navigation.isCalendarPage}
							open={settingsOpen}
							onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
							{...(customViewSelector ? { customViewSelector } : {})}
						/>
					</>
				)}
			</Dock>
		</TooltipProvider>
	);

	const renderDrawerThreeColumn = () => (
		<TooltipProvider>
			<FitWidthScale className={cn("w-full", className)} minScale={0.2} maxScale={1}>
				<Dock direction="middle" className={"mt-0 inline-block"}>
					<div className="inline-flex items-center justify-between gap-2 overflow-visible">
						<div className="flex items-center gap-1.5">
							<NavigationControls
								isLocalized={navigation.isLocalized}
								isCalendarPage={false}
								isPrevDisabled={navigation.isPrevDisabled}
								isNextDisabled={navigation.isNextDisabled}
								onPrev={navigation.handlePrev}
								onNext={navigation.handleNext}
								compact={true}
							/>
						</div>
						<div className="flex items-center justify-center min-w-0">
							<NavigationDateButton
								title={navigation.title}
								isLocalized={navigation.isLocalized}
								isCalendarPage={false}
								isTodayDisabled={navigation.isTodayDisabled}
								onToday={navigation.handleToday}
								navigationOnly={true}
								visibleEventCount={navigation.visibleEventCount}
								showBadge={false}
								className="shrink-0"
							/>
						</div>
						<div className="flex items-center gap-2 ml-auto shrink-0">
							<SettingsPopover
								isLocalized={navigation.isLocalized}
								activeTab={nav.state.activeTab}
								onTabChange={nav.handlers.setActiveTab}
								currentCalendarView={currentCalendarView}
								activeView={navigation.activeView}
								onCalendarViewChange={nav.handlers.handleCalendarViewChange}
								isCalendarPage={navigation.isCalendarPage}
								open={settingsOpen}
								onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
								// In drawer, force only "view" tab and hide view mode toolbar (always default)
								allowedTabs={["view"] as const}
								hideViewModeToolbar={true}
							/>
						</div>
					</div>
				</Dock>
			</FitWidthScale>
		</TooltipProvider>
	);

	const renderHeaderThreeColumn = () => (
		<TooltipProvider>
			<FitWidthScale className={cn("w-full", className)} minScale={0.2} maxScale={1}>
				<Dock direction="middle" className={"mt-0 inline-block"}>
					<div className="inline-flex items-center justify-between gap-2 overflow-visible">
						{dualModeTopDock ? (
							// Dual calendar mode: only nav links + settings in center
							<div className="flex items-center gap-2 shrink-0">
								<NavigationLinks isLocalized={navigation.isLocalized} isActive={nav.computed.isActive} />
								<SettingsPopover
									isLocalized={navigation.isLocalized}
									activeTab={nav.state.activeTab}
									onTabChange={nav.handlers.setActiveTab}
									currentCalendarView={currentCalendarView}
									activeView={navigation.activeView}
									onCalendarViewChange={nav.handlers.handleCalendarViewChange}
									isCalendarPage={navigation.isCalendarPage}
									open={settingsOpen}
									onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
									{...(customViewSelector ? { customViewSelector } : {})}
									hideViewModeToolbar={false}
								/>
							</div>
						) : (
							<>
								{/* Left group: arrows */}
								<div className="flex items-center gap-1.5 shrink-0">
									<NavigationControls
										isLocalized={navigation.isLocalized}
										isCalendarPage={navigation.isCalendarPage}
										isPrevDisabled={navigation.isPrevDisabled}
										isNextDisabled={navigation.isNextDisabled}
										onPrev={navigation.handlePrev}
										onNext={navigation.handleNext}
									/>
								</div>

								{/* Center: date button with event badge. Truncates and scales on small screens. */}
								<div className="min-w-0 flex items-center justify-center">
									<NavigationDateButton
										title={navigation.title}
										isLocalized={navigation.isLocalized}
										isCalendarPage={navigation.isCalendarPage}
										isTodayDisabled={navigation.isTodayDisabled}
										onToday={navigation.handleToday}
										navigationOnly={false}
										visibleEventCount={navigation.visibleEventCount}
										showBadge={true}
										className="max-w-full"
									/>
								</div>

								{/* Right group: nav links + settings */}
								<div className="flex items-center gap-2 shrink-0">
									<NavigationLinks isLocalized={navigation.isLocalized} isActive={nav.computed.isActive} />
									<SettingsPopover
										isLocalized={navigation.isLocalized}
										activeTab={nav.state.activeTab}
										onTabChange={nav.handlers.setActiveTab}
										currentCalendarView={currentCalendarView}
										activeView={navigation.activeView}
										onCalendarViewChange={nav.handlers.handleCalendarViewChange}
										isCalendarPage={navigation.isCalendarPage}
										open={settingsOpen}
										onOpenChange={isControlled ? onSettingsOpenChange || (() => {}) : setInternalOpen}
										{...(customViewSelector ? { customViewSelector } : {})}
										hideViewModeToolbar={false}
									/>
								</div>
							</>
						)}
					</div>
				</Dock>
			</FitWidthScale>
		</TooltipProvider>
	);

	return layout === "drawerThreeColumn"
		? renderDrawerThreeColumn()
		: layout === "headerThreeColumn"
			? renderHeaderThreeColumn()
			: renderCentered();
}
