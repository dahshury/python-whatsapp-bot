"use client";

import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { cn } from "@shared/libs/utils";
import { usePathname } from "next/navigation";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarCoreRef } from "@/features/calendar";
import { getCalendarViewOptions } from "@/features/calendar";
import {
  useCtrlViewSwitch,
  useDockNavigation,
  useNavigationView,
} from "@/features/navigation";
import {
  CalendarLink,
  NavigationControls,
  NavigationDateButton,
  NavigationLinks,
} from "@/features/navigation/navigation";
import type {
  DockNavProps,
  ExtendedNavigationContextValue,
} from "@/features/navigation/types";
import { SettingsPopover } from "@/features/settings/settings/settings-popover";
import {
  useLanguageStore,
  useSettingsStore,
} from "@/infrastructure/store/app-store";
import { Dock } from "@/shared/ui/dock";
import { FitWidthScale } from "@/shared/ui/fit-width-scale";
import { TooltipProvider } from "@/shared/ui/tooltip";
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
  // Create stable default handler
  const defaultCalendarViewChange = useCallback(() => {
    // Default no-op handler
  }, []);

  // Call ALL hooks unconditionally, BEFORE any conditional logic
  const nav = useDockNavigation({
    calendarRef: (calendarRef || null) as RefObject<CalendarCoreRef> | null,
    currentCalendarView,
    onCalendarViewChange: onCalendarViewChange || defaultCalendarViewChange,
  }) as ExtendedNavigationContextValue;
  const pathname = usePathname();
  const { isLocalized } = useLanguageStore();
  const { state: dockBridgeState } = useDockBridge();
  const { freeRoam } = useSettingsStore();
  const { setView } = useNavigationView();

  // All hooks must be called before any early returns
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledOpen === "boolean";
  const settingsOpen = isControlled
    ? (controlledOpen as boolean)
    : internalOpen;

  // Memoize settings open change handler to prevent infinite re-renders
  const handleSettingsOpenChange = useCallback(
    (open: boolean) => {
      if (isControlled) {
        onSettingsOpenChange?.(open);
      } else {
        setInternalOpen(open);
      }
    },
    [isControlled, onSettingsOpenChange]
  );

  // Right calendar view change handler must be defined before any early returns
  const handleRightCalendarViewChange = useCallback(
    (view: string) => {
      const api = dockBridgeState?.rightCalendarRef?.current?.getApi?.();
      if (api) {
        try {
          api.setOption("validRange", undefined);
          api.setOption("eventConstraint", undefined);
          api.setOption("selectConstraint", undefined);
        } catch {
          // Silently ignore errors when clearing calendar options (API may be unavailable)
        }
        try {
          api.changeView(view);
        } catch {
          // Silently ignore errors when changing calendar view (API may be unavailable)
        }
        try {
          const lower = (view || "").toLowerCase();
          const isMultiMonth = lower === "multimonthyear";
          if (!isMultiMonth) {
            api.setOption(
              "validRange",
              freeRoam ? undefined : getValidRange(freeRoam)
            );
            if (lower.includes("timegrid")) {
              api.setOption(
                "eventConstraint",
                freeRoam ? undefined : "businessHours"
              );
              api.setOption(
                "selectConstraint",
                freeRoam ? undefined : "businessHours"
              );
            }
          }
          requestAnimationFrame(() => {
            try {
              api.updateSize?.();
            } catch {
              // Silently ignore errors when updating calendar size (API may be unavailable)
            }
          });
        } catch {
          // Silently ignore errors when applying calendar constraints (API may be unavailable)
        }
      }
      try {
        dockBridgeState?.onRightCalendarViewChange?.(view);
      } catch {
        // Silently ignore errors when notifying calendar view change (handler may be unavailable)
      }
    },
    [
      dockBridgeState?.rightCalendarRef,
      dockBridgeState?.onRightCalendarViewChange,
      freeRoam,
    ]
  );

  // Bind Ctrl+ArrowUp/Down to change calendar view using existing handler
  // Compute next/prev view values from activeView
  const onCtrlUp = useCallback(() => {
    try {
      const opts = getCalendarViewOptions(isLocalized);
      const current = nav.navigation.activeView || currentCalendarView;
      const index = opts.findIndex((o) => o.value === current);
      const nextIndex = (index - 1 + opts.length) % opts.length;
      nav.handlers.handleCalendarViewChange(
        opts[nextIndex]?.value || "multiMonthYear"
      );
    } catch {
      // Silently ignore errors when navigating calendar views (handlers may be unavailable)
    }
  }, [
    isLocalized,
    nav.navigation.activeView,
    nav.handlers,
    currentCalendarView,
  ]);

  const onCtrlDown = useCallback(() => {
    try {
      const opts = getCalendarViewOptions(isLocalized);
      const current = nav.navigation.activeView || currentCalendarView;
      const index = opts.findIndex((o) => o.value === current);
      const nextIndex = (index + 1) % opts.length;
      nav.handlers.handleCalendarViewChange(
        opts[nextIndex]?.value || "multiMonthYear"
      );
    } catch {
      // Silently ignore errors when navigating calendar views (handlers may be unavailable)
    }
  }, [
    isLocalized,
    nav.navigation.activeView,
    nav.handlers,
    currentCalendarView,
  ]);

  useCtrlViewSwitch({ onUp: onCtrlUp, onDown: onCtrlDown });

  // Broadcast active view changes to feature navigation state
  useEffect(() => {
    try {
      if (nav.navigation?.activeView) {
        setView(nav.navigation.activeView);
      }
    } catch {
      // Silently ignore errors when broadcasting navigation view changes (state may be unavailable)
    }
  }, [nav.navigation?.activeView, setView]);

  // Extract handlers before early return to ensure hooks are called in consistent order
  const { navigation, handlers } = nav;

  // Use refs to store latest handlers to prevent re-renders while always calling latest version
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Create stable callbacks that always call the latest handler
  const stableHandleCalendarViewChange = useCallback((view: string) => {
    handlersRef.current.handleCalendarViewChange(view);
  }, []);

  const stableSetActiveTab = useCallback((value: string) => {
    handlersRef.current.setActiveTab(value);
  }, []);

  // Stabilize activeView to prevent infinite re-renders
  // Only update when it actually changes, not on every render
  const stableActiveView = useMemo(() => {
    return navigation.activeView || currentCalendarView;
  }, [navigation.activeView, currentCalendarView]);

  const stableCurrentCalendarView = useMemo(() => {
    return currentCalendarView || "timeGridWeek";
  }, [currentCalendarView]);

  // NOW we can do the early return after all hooks are called
  if (!nav.state.mounted) {
    return null;
  }

  const customViewSelector =
    navigationOnly && dockBridgeState?.rightCalendarRef ? (
      <DualCalendarViewSelector
        isLocalized={isLocalized}
        leftCalendarRef={
          (dockBridgeState.calendarRef ||
            null) as RefObject<CalendarCoreRef | null>
        }
        leftCalendarView={currentCalendarView}
        onLeftCalendarViewChange={stableHandleCalendarViewChange}
        onRightCalendarViewChange={handleRightCalendarViewChange}
        rightCalendarRef={
          (dockBridgeState.rightCalendarRef ||
            null) as RefObject<CalendarCoreRef | null>
        }
        rightCalendarView={dockBridgeState.rightCalendarView || "timeGridWeek"}
      />
    ) : undefined;

  const renderDockContent = () => {
    if (dualModeTopDock) {
      // Dual calendar mode top dock: only page links + settings, no navigation controls
      return (
        <>
          <NavigationLinks
            isActive={nav.computed.isActive}
            isLocalized={navigation.isLocalized}
          />
          <SettingsPopover
            activeTab={nav.state.activeTab}
            activeView={stableActiveView}
            currentCalendarView={stableCurrentCalendarView}
            isCalendarPage={navigation.isCalendarPage}
            isLocalized={navigation.isLocalized}
            onCalendarViewChange={stableHandleCalendarViewChange}
            onOpenChange={handleSettingsOpenChange}
            onTabChange={stableSetActiveTab}
            open={settingsOpen}
            {...(customViewSelector ? { customViewSelector } : {})}
            hideViewModeToolbar={false}
          />
        </>
      );
    }
    if (navigationOnly) {
      return (
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
            onCalendarViewChange={stableHandleCalendarViewChange}
            onOpenChange={handleSettingsOpenChange}
            onTabChange={stableSetActiveTab}
            open={settingsOpen}
            {...(customViewSelector ? { customViewSelector } : {})}
            hideViewModeToolbar={true}
          />
        </>
      );
    }
    if (navigation.isCalendarPage) {
      return (
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
            activeView={stableActiveView}
            currentCalendarView={stableCurrentCalendarView}
            isCalendarPage={navigation.isCalendarPage}
            isLocalized={navigation.isLocalized}
            onCalendarViewChange={stableHandleCalendarViewChange}
            onOpenChange={handleSettingsOpenChange}
            onTabChange={stableSetActiveTab}
            open={settingsOpen}
            {...(customViewSelector ? { customViewSelector } : {})}
          />
        </>
      );
    }
    if (navigation.isDocumentsPage) {
      // Documents page: show all page links + settings button with view and general tabs
      return (
        <>
          <CalendarLink isLocalized={navigation.isLocalized} />
          <NavigationLinks
            isActive={nav.computed.isActive}
            isLocalized={navigation.isLocalized}
          />
          <SettingsPopover
            activeTab={nav.state.activeTab}
            activeView={navigation.activeView}
            allowedTabs={["view", "general"] as const}
            currentCalendarView={currentCalendarView}
            hideViewModeToolbar={true}
            isCalendarPage={false}
            isDocumentsPage={true}
            isLocalized={navigation.isLocalized}
            onCalendarViewChange={stableHandleCalendarViewChange}
            onOpenChange={handleSettingsOpenChange}
            onTabChange={stableSetActiveTab}
            open={settingsOpen}
          />
        </>
      );
    }
    const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;
    if (isDashboardPage) {
      // Dashboard page: show all page links + settings button with general tab only
      return (
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
            onCalendarViewChange={stableHandleCalendarViewChange}
            onOpenChange={handleSettingsOpenChange}
            onTabChange={stableSetActiveTab}
            open={settingsOpen}
          />
        </>
      );
    }
    // Default: show all page links only
    return (
      <>
        <CalendarLink isLocalized={navigation.isLocalized} />
        <NavigationLinks
          isActive={nav.computed.isActive}
          isLocalized={navigation.isLocalized}
        />
      </>
    );
  };

  const renderCentered = () => (
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
        {renderDockContent()}
      </Dock>
    </TooltipProvider>
  );

  const renderLeft = () => (
    <TooltipProvider>
      <Dock className={cn("mt-0", className)}>{renderDockContent()}</Dock>
    </TooltipProvider>
  );

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
                onOpenChange={handleSettingsOpenChange}
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

  const renderHeaderThreeColumn = () => (
    <TooltipProvider>
      <FitWidthScale
        className={cn("w-full", className)}
        maxScale={1}
        minScale={0.2}
      >
        <Dock className={"mt-0 inline-block"} direction="middle">
          <div className="inline-flex items-center justify-between gap-2 overflow-visible">
            {dualModeTopDock ? (
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
                  onOpenChange={handleSettingsOpenChange}
                  onTabChange={nav.handlers.setActiveTab}
                  open={settingsOpen}
                  {...(customViewSelector ? { customViewSelector } : {})}
                  hideViewModeToolbar={false}
                />
              </div>
            ) : (
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
                    onOpenChange={handleSettingsOpenChange}
                    onTabChange={nav.handlers.setActiveTab}
                    open={settingsOpen}
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

  if (layout === "drawerThreeColumn") {
    return renderDrawerThreeColumn();
  }
  if (layout === "headerThreeColumn") {
    return renderHeaderThreeColumn();
  }
  if (layout === "left") {
    return renderLeft();
  }
  return renderCentered();
}
