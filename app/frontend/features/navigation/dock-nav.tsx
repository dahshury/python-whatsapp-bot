"use client";

import { useCtrlViewSwitch } from "@features/navigation/hooks/use-ctrl-view-switch";
import { useDockNavigation } from "@features/navigation/hooks/use-dock-navigation";
import type {
	DockNavProps,
	ExtendedNavigationContextValue,
} from "@features/navigation/types";
import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { cn } from "@shared/libs/utils";
import { useCallback, useState } from "react";
import { NavigationControls } from "@/features/navigation/navigation/navigation-controls";
import { NavigationDateButton } from "@/features/navigation/navigation/navigation-date-button";
import {
	CalendarLink,
	NavigationLinks,
} from "@/features/navigation/navigation/navigation-links";
import { SettingsPopover } from "@/features/settings/settings/settings-popover";
import { Dock } from "@/shared/ui/dock";
import { FitWidthScale } from "@/shared/ui/fit-width-scale";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { getCalendarViewOptions } from "@/widgets/calendar/calendar-toolbar";
import type { CalendarCoreRef } from "@/widgets/calendar/types";
import { DualCalendarViewSelector } from "./dock-nav-simple";

// No-op function for empty handlers
function noop(): void {
	// No operation
}

// Helper to safely clear calendar constraints
function safeClearConstraints(
	api: Record<string, unknown> | null | undefined
): void {
	try {
		(api?.setOption as ((key: string, value: unknown) => void) | undefined)?.(
			"validRange" as string,
			undefined
		);
		(api?.setOption as ((key: string, value: unknown) => void) | undefined)?.(
			"eventConstraint" as string,
			undefined
		);
		(api?.setOption as ((key: string, value: unknown) => void) | undefined)?.(
			"selectConstraint" as string,
			undefined
		);
	} catch {
		// Calendar API may fail in some contexts
	}
}

// Helper to safely change calendar view
function safeChangeCalendarView(
	api: Record<string, unknown> | null | undefined,
	view: string
): void {
	try {
		(api as { changeView?: (v: string) => void } | null)?.changeView?.(view);
	} catch {
		// Calendar API may fail in some contexts
	}
}

// Helper to apply calendar constraints based on view
function applyCalendarConstraints(
	api: Record<string, unknown> | null | undefined,
	view: string,
	freeRoam: boolean
): void {
	try {
		const lower = (view || "").toLowerCase();
		const isMultiMonth = lower === "multimonthyear";
		if (!isMultiMonth) {
			(api as { setOption?: (key: string, val: unknown) => void })?.setOption?.(
				"validRange",
				freeRoam ? undefined : getValidRange(freeRoam)
			);
			if (lower.includes("timegrid")) {
				(
					api as { setOption?: (key: string, val: unknown) => void }
				)?.setOption?.(
					"eventConstraint",
					freeRoam ? undefined : "businessHours"
				);
				(
					api as { setOption?: (key: string, val: unknown) => void }
				)?.setOption?.(
					"selectConstraint",
					freeRoam ? undefined : "businessHours"
				);
			}
		}
	} catch {
		// Calendar API may fail in some contexts
	}
}

// Helper to safely update calendar size
function safeUpdateCalendarSize(
	api: Record<string, unknown> | null | undefined
): void {
	requestAnimationFrame(() => {
		try {
			(api as { updateSize?: () => void })?.updateSize?.();
		} catch {
			// Calendar API may fail in some contexts
		}
	});
}

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
		calendarRef: (calendarRef ||
			null) as React.RefObject<CalendarCoreRef> | null,
		currentCalendarView,
		onCalendarViewChange: onCalendarViewChange ?? noop,
	}) as ExtendedNavigationContextValue;
	const { isLocalized } = useLanguage();
	const { state: dockBridgeState } = useDockBridge();
	const { freeRoam } = useSettings();

	// All hooks must be called before any early returns
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = typeof controlledOpen === "boolean";
	const settingsOpen = isControlled
		? (controlledOpen as boolean)
		: internalOpen;

	// Right calendar view change handler
	const handleRightCalendarViewChange = useCallback(
		(view: string) => {
			const api = dockBridgeState?.rightCalendarRef?.current?.getApi?.();
			if (api) {
				const apiObj = api as unknown as Record<string, unknown>;
				safeClearConstraints(apiObj);
				safeChangeCalendarView(apiObj, view);
				applyCalendarConstraints(apiObj, view, freeRoam);
				safeUpdateCalendarSize(apiObj);
			}
			try {
				dockBridgeState?.onRightCalendarViewChange?.(view);
			} catch {
				// Handler callback may fail in some contexts
			}
		},
		[
			dockBridgeState?.rightCalendarRef,
			dockBridgeState?.onRightCalendarViewChange,
			freeRoam,
			dockBridgeState,
		]
	);

	// Helper to change calendar view by offset
	const changeCalendarViewByOffset = useCallback(
		(direction: "up" | "down"): void => {
			try {
				const opts = getCalendarViewOptions(isLocalized);
				const current = nav.navigation.activeView || currentCalendarView;
				const index = opts.findIndex((o) => o.value === current);
				const offset = direction === "up" ? -1 : 1;
				const nextIndex = (index + offset + opts.length) % opts.length;
				nav.handlers.handleCalendarViewChange(
					opts[nextIndex]?.value || "multiMonthYear"
				);
			} catch {
				// View change may fail in some contexts
			}
		},
		[isLocalized, nav.navigation.activeView, currentCalendarView, nav.handlers]
	);

	// Bind Ctrl+ArrowUp to change calendar view
	const onCtrlUp = useCallback(() => {
		changeCalendarViewByOffset("up");
	}, [changeCalendarViewByOffset]);

	const onCtrlDown = useCallback(() => {
		changeCalendarViewByOffset("down");
	}, [changeCalendarViewByOffset]);

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
				leftCalendarRef={
					(dockBridgeState.calendarRef ||
						null) as React.RefObject<CalendarCoreRef | null>
				}
				leftCalendarView={currentCalendarView}
				onLeftCalendarViewChange={nav.handlers.handleCalendarViewChange}
				onRightCalendarViewChange={handleRightCalendarViewChange}
				rightCalendarRef={
					(dockBridgeState.rightCalendarRef ||
						null) as React.RefObject<CalendarCoreRef | null>
				}
				rightCalendarView={dockBridgeState.rightCalendarView || "timeGridWeek"}
			/>
		) : undefined;

	const renderCentered = () => {
		// Helper to render dual mode content
		const renderDualModeContent = () => (
			<>
				<NavigationLinks
					isActive={nav.computed.isActive}
					isLocalized={navigation.isLocalized}
				/>
				<SettingsPopover
					activeTab={nav.state.activeTab}
					activeView={navigation.activeView}
					currentCalendarView={currentCalendarView}
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					onCalendarViewChange={nav.handlers.handleCalendarViewChange}
					onOpenChange={
						isControlled ? (onSettingsOpenChange ?? noop) : setInternalOpen
					}
					onTabChange={nav.handlers.setActiveTab}
					open={settingsOpen}
					{...(customViewSelector ? { customViewSelector } : {})}
					hideViewModeToolbar={false}
				/>
			</>
		);

		// Helper to render navigation-only content
		const renderNavigationOnlyContent = () => (
			<>
				<NavigationControls
					isCalendarPage={false}
					isLocalized={navigation.isLocalized}
					isNextDisabled={navigation.isNextDisabled}
					isPrevDisabled={navigation.isPrevDisabled}
					onNext={navigation.handleNext}
					onPrev={navigation.handlePrev}
				/>
				<NavigationDateButton
					isCalendarPage={false}
					isLocalized={navigation.isLocalized}
					isTodayDisabled={navigation.isTodayDisabled}
					navigationOnly={true}
					onToday={navigation.handleToday}
					title={navigation.title}
					visibleEventCount={navigation.visibleEventCount}
				/>
				<SettingsPopover
					activeTab={nav.state.activeTab}
					activeView={navigation.activeView}
					allowedTabs={["view"] as const}
					currentCalendarView={currentCalendarView}
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					onCalendarViewChange={nav.handlers.handleCalendarViewChange}
					onOpenChange={
						isControlled ? onSettingsOpenChange || noop : setInternalOpen
					}
					onTabChange={nav.handlers.setActiveTab}
					open={settingsOpen}
					{...(customViewSelector ? { customViewSelector } : {})}
					hideViewModeToolbar={true}
				/>
			</>
		);

		// Helper to render calendar page content
		const renderCalendarPageContent = () => (
			<>
				<NavigationControls
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					isNextDisabled={navigation.isNextDisabled}
					isPrevDisabled={navigation.isPrevDisabled}
					onNext={navigation.handleNext}
					onPrev={navigation.handlePrev}
				/>
				<NavigationDateButton
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					isTodayDisabled={navigation.isTodayDisabled}
					navigationOnly={navigationOnly}
					onToday={navigation.handleToday}
					title={navigation.title}
					visibleEventCount={navigation.visibleEventCount}
				/>
				<NavigationLinks
					isActive={nav.computed.isActive}
					isLocalized={navigation.isLocalized}
				/>
				<SettingsPopover
					activeTab={nav.state.activeTab}
					activeView={navigation.activeView}
					currentCalendarView={currentCalendarView}
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					onCalendarViewChange={nav.handlers.handleCalendarViewChange}
					onOpenChange={
						isControlled ? onSettingsOpenChange || noop : setInternalOpen
					}
					onTabChange={nav.handlers.setActiveTab}
					open={settingsOpen}
					{...(customViewSelector ? { customViewSelector } : {})}
				/>
			</>
		);

		// Helper to render documents page content
		const renderDocumentsPageContent = () => (
			<>
				<CalendarLink isLocalized={navigation.isLocalized} />
				<NavigationLinks
					isActive={nav.computed.isActive}
					isLocalized={navigation.isLocalized}
				/>
				<SettingsPopover
					activeTab={nav.state.activeTab}
					activeView={navigation.activeView}
					allowedTabs={["general"] as const}
					currentCalendarView={currentCalendarView}
					hideViewModeToolbar={true}
					isCalendarPage={false}
					isLocalized={navigation.isLocalized}
					onCalendarViewChange={nav.handlers.handleCalendarViewChange}
					onOpenChange={
						isControlled ? onSettingsOpenChange || noop : setInternalOpen
					}
					onTabChange={nav.handlers.setActiveTab}
					open={settingsOpen}
				/>
			</>
		);

		// Helper to render dashboard page content
		const renderDashboardPageContent = () => (
			<>
				<CalendarLink isLocalized={navigation.isLocalized} />
				<NavigationLinks
					isActive={nav.computed.isActive}
					isLocalized={navigation.isLocalized}
				/>
			</>
		);

		// Render content based on page type
		const renderPageContent = () => {
			if (dualModeTopDock) {
				return renderDualModeContent();
			}
			if (navigationOnly) {
				return renderNavigationOnlyContent();
			}
			if (navigation.isCalendarPage) {
				return renderCalendarPageContent();
			}
			if (navigation.isDocumentsPage) {
				return renderDocumentsPageContent();
			}
			return renderDashboardPageContent();
		};

		return (
			<TooltipProvider>
				<Dock
					className={cn(
						"mt-0",
						// Make dock fit content width for non-calendar pages
						navigation.isCalendarPage || navigationOnly || dualModeTopDock
							? ""
							: "inline-flex w-auto",
						className
					)}
					direction="middle"
				>
					{renderPageContent()}
				</Dock>
			</TooltipProvider>
		);
	};

	const renderDrawerThreeColumn = () => (
		<TooltipProvider>
			<FitWidthScale
				className={cn("w-full", className)}
				maxScale={1}
				minScale={0.2}
			>
				<Dock className={"mt-0 inline-block"} direction="middle">
					<div className="inline-flex items-center justify-between gap-2 overflow-visible">
						<div className="flex items-center gap-1.5">
							<NavigationControls
								compact={true}
								isCalendarPage={false}
								isLocalized={navigation.isLocalized}
								isNextDisabled={navigation.isNextDisabled}
								isPrevDisabled={navigation.isPrevDisabled}
								onNext={navigation.handleNext}
								onPrev={navigation.handlePrev}
							/>
						</div>
						<div className="flex min-w-0 items-center justify-center">
							<NavigationDateButton
								className="shrink-0"
								isCalendarPage={false}
								isLocalized={navigation.isLocalized}
								isTodayDisabled={navigation.isTodayDisabled}
								navigationOnly={true}
								onToday={navigation.handleToday}
								showBadge={false}
								title={navigation.title}
								visibleEventCount={navigation.visibleEventCount}
							/>
						</div>
						<div className="ml-auto flex shrink-0 items-center gap-2">
							<SettingsPopover
								activeTab={nav.state.activeTab}
								activeView={navigation.activeView}
								allowedTabs={["view"] as const}
								currentCalendarView={currentCalendarView}
								hideViewModeToolbar={true}
								isCalendarPage={navigation.isCalendarPage}
								isLocalized={navigation.isLocalized}
								onCalendarViewChange={nav.handlers.handleCalendarViewChange}
								onOpenChange={
									isControlled ? onSettingsOpenChange || noop : setInternalOpen
								}
								// In drawer, force only "view" tab and hide view mode toolbar (always default)
								onTabChange={nav.handlers.setActiveTab}
								open={settingsOpen}
							/>
						</div>
					</div>
				</Dock>
			</FitWidthScale>
		</TooltipProvider>
	);

	const renderDualModeDockContent = () => (
		// Dual calendar mode: only nav links + settings in center
		<div className="flex shrink-0 items-center gap-2">
			<NavigationLinks
				isActive={nav.computed.isActive}
				isLocalized={navigation.isLocalized}
			/>
			<SettingsPopover
				activeTab={nav.state.activeTab}
				activeView={navigation.activeView}
				currentCalendarView={currentCalendarView}
				isCalendarPage={navigation.isCalendarPage}
				isLocalized={navigation.isLocalized}
				onCalendarViewChange={nav.handlers.handleCalendarViewChange}
				onOpenChange={
					isControlled ? onSettingsOpenChange || noop : setInternalOpen
				}
				onTabChange={nav.handlers.setActiveTab}
				open={settingsOpen}
				{...(customViewSelector ? { customViewSelector } : {})}
				hideViewModeToolbar={false}
			/>
		</div>
	);

	const renderRegularModeDockContent = () => (
		<>
			{/* Left group: arrows */}
			<div className="flex shrink-0 items-center gap-1.5">
				<NavigationControls
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					isNextDisabled={navigation.isNextDisabled}
					isPrevDisabled={navigation.isPrevDisabled}
					onNext={navigation.handleNext}
					onPrev={navigation.handlePrev}
				/>
			</div>

			{/* Center: date button with event badge. Truncates and scales on small screens. */}
			<div className="flex min-w-0 items-center justify-center">
				<NavigationDateButton
					className="max-w-full"
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					isTodayDisabled={navigation.isTodayDisabled}
					navigationOnly={false}
					onToday={navigation.handleToday}
					showBadge={true}
					title={navigation.title}
					visibleEventCount={navigation.visibleEventCount}
				/>
			</div>

			{/* Right group: nav links + settings */}
			<div className="flex shrink-0 items-center gap-2">
				<NavigationLinks
					isActive={nav.computed.isActive}
					isLocalized={navigation.isLocalized}
				/>
				<SettingsPopover
					activeTab={nav.state.activeTab}
					activeView={navigation.activeView}
					currentCalendarView={currentCalendarView}
					isCalendarPage={navigation.isCalendarPage}
					isLocalized={navigation.isLocalized}
					onCalendarViewChange={nav.handlers.handleCalendarViewChange}
					onOpenChange={
						isControlled ? onSettingsOpenChange || noop : setInternalOpen
					}
					onTabChange={nav.handlers.setActiveTab}
					open={settingsOpen}
					{...(customViewSelector ? { customViewSelector } : {})}
					hideViewModeToolbar={false}
				/>
			</div>
		</>
	);

	const renderHeaderThreeColumn = () => (
		<TooltipProvider>
			<FitWidthScale
				className={cn("w-full", className)}
				maxScale={1}
				minScale={0.2}
			>
				<Dock className={"mt-0 inline-block"} direction="middle">
					<div className="inline-flex items-center justify-between gap-2 overflow-visible">
						{dualModeTopDock
							? renderDualModeDockContent()
							: renderRegularModeDockContent()}
					</div>
				</Dock>
			</FitWidthScale>
		</TooltipProvider>
	);

	// Determine which render function to use based on layout
	if (layout === "drawerThreeColumn") {
		return renderDrawerThreeColumn();
	}
	if (layout === "headerThreeColumn") {
		return renderHeaderThreeColumn();
	}
	return renderCentered();
}
