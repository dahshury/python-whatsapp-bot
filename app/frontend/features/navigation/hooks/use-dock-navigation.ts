"use client";

import { getValidRange } from "@shared/libs/calendar/calendar-config";
import { count } from "@shared/libs/dev-profiler";
import { i18n } from "@shared/libs/i18n";
import { useVacation } from "@shared/libs/state/vacation-context";
import { toastService } from "@shared/libs/toast";
import { usePathname, useRouter } from "next/navigation";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  getCalendarViewOptions,
  useCalendarToolbar,
} from "@/features/calendar";
import {
  useLanguageStore,
  useSettingsStore,
} from "@/infrastructure/store/app-store";

// Toast notification display duration in milliseconds
const TOAST_DURATION_MS = 1500;

import type { ExtendedNavigationContextValue } from "@/features/navigation/types";

type UseDockNavigationProps = {
  calendarRef?: RefObject<CalendarCoreRef> | null;
  currentCalendarView?: string;
  onCalendarViewChange?: (view: string) => void;
};

export function useDockNavigation({
  calendarRef,
  currentCalendarView = "multiMonthYear",
  onCalendarViewChange,
}: UseDockNavigationProps): ExtendedNavigationContextValue {
  const pathname = usePathname();
  const router = useRouter();
  const { isLocalized } = useLanguageStore();
  const { freeRoam, showDualCalendar } = useSettingsStore();
  const { recordingState } = useVacation();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("view");
  const [isHoveringDate, setIsHoveringDate] = useState(false);

  // Use the provided calendarRef directly
  const isCalendarPage = pathname === "/";
  const isDocumentsPage = pathname?.startsWith("/documents") ?? false;

  // Auto-switch to general tab when not on calendar page
  useEffect(() => {
    if (!isCalendarPage && activeTab === "view") {
      setActiveTab("general");
    }
  }, [isCalendarPage, activeTab]);

  const {
    title,
    activeView,
    isPrevDisabled,
    isNextDisabled,
    isTodayDisabled,
    handlePrev: originalHandlePrev,
    handleNext: originalHandleNext,
    handleToday: originalHandleToday,
    visibleEventCount,
  } = useCalendarToolbar({
    calendarRef: calendarRef ? calendarRef : null,
    currentView: currentCalendarView,
  });

  const handlePrev = useCallback(() => {
    count("dockNav:handlePrev");
    if (calendarRef?.current?.getApi) {
      originalHandlePrev();
      return;
    }
    if (isCalendarPage) {
      originalHandlePrev();
    } else {
      router.push("/");
    }
  }, [isCalendarPage, router, originalHandlePrev, calendarRef]);

  const handleNext = useCallback(() => {
    count("dockNav:handleNext");
    if (calendarRef?.current?.getApi) {
      originalHandleNext();
      return;
    }
    if (isCalendarPage) {
      originalHandleNext();
    } else {
      router.push("/");
    }
  }, [isCalendarPage, router, originalHandleNext, calendarRef]);

  const handleToday = useCallback(() => {
    count("dockNav:handleToday");
    if (calendarRef?.current?.getApi) {
      originalHandleToday();
      return;
    }
    if (isCalendarPage) {
      originalHandleToday();
    } else {
      router.push("/");
    }
  }, [isCalendarPage, router, originalHandleToday, calendarRef]);

  const handleCalendarViewChange = useCallback(
    (view: string) => {
      count("dockNav:viewChange");
      if (isCalendarPage && calendarRef?.current) {
        const api = calendarRef.current.getApi?.();
        if (api) {
          // Temporarily adjust options around multimonth transitions to avoid plugin issues
          try {
            // Always clear constraints before changing view
            api.setOption("validRange", undefined);
            api.setOption("eventConstraint", undefined);
            api.setOption("selectConstraint", undefined);
            // Change view first
            api.changeView(view);
            // Reapply constraints only for non-multimonth views
            const lower = (view || "").toLowerCase();
            const isMultiMonth = lower === "multimonthyear";
            if (!isMultiMonth) {
              api.setOption(
                "validRange",
                freeRoam ? undefined : getValidRange(freeRoam)
              );
              // For timeGrid views only
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
          } catch {
            // Silently ignore errors when setting calendar options (calendar API may be unavailable)
          }
          try {
            const opts = getCalendarViewOptions(isLocalized);
            const label = (
              opts.find((o) => o.value === view)?.label ?? view
            ).toString();
            toastService.info(
              i18n.getMessage("view_changed", isLocalized),
              label,
              TOAST_DURATION_MS
            );
          } catch {
            // Silently ignore errors when showing toast notification (toast service may be unavailable)
          }
        }
      }
      onCalendarViewChange?.(view);
    },
    [isCalendarPage, calendarRef, onCalendarViewChange, isLocalized, freeRoam]
  );

  const isActive = useCallback(
    (href: string) => {
      if (href === "/" && pathname === "/") {
        return true;
      }
      if (href !== "/" && pathname.startsWith(href)) {
        return true;
      }
      return false;
    },
    [pathname]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine view mode: freeRoam takes precedence, then dual calendar, then default
  let viewMode: "freeRoam" | "dual" | "default";
  if (freeRoam) {
    viewMode = "freeRoam";
  } else if (showDualCalendar) {
    viewMode = "dual";
  } else {
    viewMode = "default";
  }

  // Log once when calendar API becomes available
  useEffect(() => {
    if (isCalendarPage && calendarRef?.current?.getApi) {
      try {
        const api = calendarRef.current.getApi();
        if (api) {
          count("dockNav:apiReady");
        }
      } catch {
        // Silently ignore errors when checking calendar API availability
      }
    }
  }, [isCalendarPage, calendarRef]);

  // Keep the user's chosen tab; do not auto-switch based on view mode

  return useMemo(
    () =>
      ({
        state: {
          mounted,
          isHoveringDate,
          activeTab,
        },
        handlers: {
          setIsHoveringDate,
          setActiveTab,
          handleLanguageToggle: () => {
            // These will be handled by individual components
          },
          handleThemeToggle: () => {
            // These will be handled by individual components
          },
          handleViewModeChange: () => {
            // These will be handled by individual components
          },
          handleCalendarViewChange,
        },
        computed: {
          viewMode,
          isRecording: recordingState.periodIndex !== null,
          isActive,
        },
        // Additional properties for easier access
        navigation: {
          title,
          activeView,
          isPrevDisabled,
          isNextDisabled,
          isTodayDisabled,
          handlePrev,
          handleNext,
          handleToday,
          isCalendarPage,
          isDocumentsPage,
          isLocalized,
          visibleEventCount,
        },
      }) as ExtendedNavigationContextValue,
    [
      mounted,
      isHoveringDate,
      activeTab,
      handleCalendarViewChange,
      viewMode,
      recordingState.periodIndex,
      isActive,
      title,
      activeView,
      isPrevDisabled,
      isNextDisabled,
      isTodayDisabled,
      handlePrev,
      handleNext,
      handleToday,
      isCalendarPage,
      isDocumentsPage,
      isLocalized,
      visibleEventCount,
    ]
  );
}
