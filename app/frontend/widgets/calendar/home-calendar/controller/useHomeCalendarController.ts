"use client";

import { createCalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import {
  getTimezone,
  SLOT_DURATION_HOURS,
} from "@shared/libs/calendar/calendar-config";
import { mark } from "@shared/libs/dev-profiler";
import { useDockBridge } from "@shared/libs/dock-bridge-context";
import { useVacation } from "@shared/libs/state/vacation-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  alignAndSortEventsForCalendar,
  filterEventsForCalendar,
  useCalendarContextMenu,
  useCalendarDragHandlers,
  useCalendarEventHandlers,
  useCalendarEvents,
  useCalendarHoverCard,
  useCalendarState,
  useVacationDateChecker,
} from "@/features/calendar";
import { useCalendarDataTableEditor } from "@/features/data-table";
import {
  useLanguageStore,
  useSettingsStore,
} from "@/infrastructure/store/app-store";
import type { CalendarMainContentProps } from "@/widgets/calendar/CalendarMainContent";
import type { DualCalendarComponentProps } from "@/widgets/calendar/DualCalendar";
import type { CalendarDataTableEditorWrapperProps } from "@/widgets/data-table-editor/calendar-data-table-editor-wrapper";
import {
  calculateAvailableCalendarHeight,
  updateCalendarViewportHeightVar,
} from "../lib/layout";

export type DualCalendarControllerRef = {
  leftCalendarRef: RefObject<CalendarCoreRef | null>;
  rightCalendarRef: RefObject<CalendarCoreRef | null>;
  leftView: string;
  rightView: string;
};

export type HomeCalendarControllerResult = {
  wrapperRef: RefObject<HTMLDivElement | null>;
  calendarContainerProps: {
    isHydrated: boolean;
    isRefreshing: boolean;
    loading: boolean;
  };
  shouldRenderContent: boolean;
  showDualCalendar: boolean;
  dualCalendarConfig: {
    ref: (instance: DualCalendarControllerRef | null) => void;
    props: DualCalendarComponentProps;
  };
  singleCalendarProps: CalendarMainContentProps;
  dataTableEditorProps: CalendarDataTableEditorWrapperProps;
  layout: {
    contentWrapperClassName: string;
    contentInnerClassName: string;
  };
};

export function useHomeCalendarController(): HomeCalendarControllerResult {
  const { freeRoam, showDualCalendar } = useSettingsStore();
  const {
    vacationPeriods,
    handleDateClick: handleVacationDateClick,
    recordingState,
  } = useVacation();
  const isVacationDate = useVacationDateChecker(vacationPeriods);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    mark("HomeCalendar:mounted");
  }, []);

  useEffect(() => {
    const handler = () => updateCalendarViewportHeightVar();
    handler();
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("resize", handler);
    try {
      window.visualViewport?.addEventListener?.("resize", handler);
    } catch {
      // Visual viewport listener setup might fail silently
    }
    return () => {
      window.removeEventListener("resize", handler);
      try {
        window.visualViewport?.removeEventListener?.("resize", handler);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const calendarRef = useRef<CalendarCoreRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { isLocalized } = useLanguageStore();

  const calendarState = useCalendarState({
    freeRoam,
    initialView: "timeGridWeek",
    storageKeyPrefix: "calendar:page",
  });

  const eventsState = useCalendarEvents({
    freeRoam,
    isLocalized,
    currentView: calendarState.currentView,
    currentDate: calendarState.currentDate,
    autoRefresh: false,
  });

  const { vacationEvents } = useVacation();

  const filteredEvents = useMemo(
    () => filterEventsForCalendar(eventsState.events, freeRoam),
    [eventsState.events, freeRoam]
  );

  const alignedEvents = useMemo(
    () =>
      alignAndSortEventsForCalendar(
        filteredEvents,
        freeRoam,
        calendarState.currentView
      ),
    [filteredEvents, freeRoam, calendarState.currentView]
  );

  const allEvents = useMemo(
    () => [...alignedEvents, ...vacationEvents],
    [alignedEvents, vacationEvents]
  );

  const [calendarHeight, setCalendarHeight] = useState<number | "auto">("auto");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const computeAvailableHeight = useCallback(
    () => calculateAvailableCalendarHeight(wrapperRef.current),
    []
  );

  const handleRefreshWithBlur = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await eventsState.refreshData();
    } finally {
      const REFRESH_BLUR_DELAY_MS = 300;
      setTimeout(() => setIsRefreshing(false), REFRESH_BLUR_DELAY_MS);
    }
  }, [eventsState]);

  const handleCalendarUpdateSize = useCallback(() => {
    setCalendarHeight((prev) =>
      prev === "auto" ? prev : computeAvailableHeight()
    );
    try {
      const api = calendarRef.current?.getApi?.();
      if (api && (api as { view?: unknown }).view) {
        calendarRef.current?.updateSize?.();
      }
    } catch {
      // Ignore resize errors
    }
  }, [computeAvailableHeight]);

  const handleCalendarHeightChange = useCallback(
    (value: number | "auto") => {
      if (value === "auto") {
        setCalendarHeight("auto");
        return;
      }
      setCalendarHeight(computeAvailableHeight());
    },
    [computeAvailableHeight]
  );

  const closeHoverCardRef = useRef<(() => void) | null>(null);
  const dragHandlers = useCalendarDragHandlers({
    closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
  });
  const hoverCard = useCalendarHoverCard({
    isDragging: dragHandlers.isDragging,
  });
  closeHoverCardRef.current = hoverCard.closeHoverCardImmediately;

  const contextMenu = useCalendarContextMenu();

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (
      calendarState.currentView === "multiMonthYear" ||
      calendarState.currentView === "listMonth"
    ) {
      setCalendarHeight("auto");
      return;
    }
    setCalendarHeight(computeAvailableHeight());
  }, [mounted, calendarState.currentView, computeAvailableHeight]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const handleResize = () => {
      if (
        calendarState.currentView === "multiMonthYear" ||
        calendarState.currentView === "listMonth"
      ) {
        return;
      }
      setCalendarHeight(computeAvailableHeight());
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    try {
      window.visualViewport?.addEventListener?.("resize", handleResize);
    } catch {
      // visualViewport may not be available
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        window.visualViewport?.removeEventListener?.("resize", handleResize);
      } catch {
        // ignore cleanup failure
      }
    };
  }, [mounted, calendarState.currentView, computeAvailableHeight]);

  const dataTableEditor = useCalendarDataTableEditor();
  const { openConversation: openConversationFromStore } = useSidebarChatStore();
  const router = useRouter();

  const handleOpenDocument = useCallback(
    (waId: string) => {
      router.push(`/documents?waId=${encodeURIComponent(waId)}`);
    },
    [router]
  );

  const eventHandlers = useCalendarEventHandlers({
    events: allEvents,
    conversations: {},
    isLocalized,
    currentView: calendarState.currentView,
    isVacationDate,
    handleRefreshWithBlur: async () => {
      // No-op: refresh handled elsewhere
    },
    openConversation: openConversationFromStore,
    addEvent: eventsState.addEvent,
    updateEvent: eventsState.updateEvent,
    removeEvent: eventsState.removeEvent,
    dataTableEditor: {
      handleEditReservation: () => {
        // No-op: handled by dataTableEditor state
      },
    },
    calendarRef,
  });

  const callbacks = useMemo(
    () =>
      createCalendarCallbacks({
        handlers: {
          isLocalized,
          currentView: calendarState.currentView,
          isVacationDate,
          openEditor: (opts: { start: string; end?: string }) => {
            const startStr = String(opts.start);
            const endStr = typeof opts.end === "string" ? opts.end : startStr;
            dataTableEditor.openEditor({ start: startStr, end: endStr });
          },
          handleOpenConversation: eventHandlers.handleOpenConversation,
          handleEventChange: eventHandlers.handleEventChange,
        },
        freeRoam,
        timezone: getTimezone(),
        currentDate: calendarState.currentDate,
        ...(recordingState.periodIndex !== null &&
          recordingState.field !== null && {
            handleVacationDateClick,
          }),
        setCurrentDate: calendarState.setCurrentDate,
        currentView: calendarState.currentView,
      }),
    [
      isLocalized,
      calendarState.currentView,
      isVacationDate,
      dataTableEditor.openEditor,
      eventHandlers.handleOpenConversation,
      eventHandlers.handleEventChange,
      freeRoam,
      calendarState.currentDate,
      recordingState.periodIndex,
      recordingState.field,
      handleVacationDateClick,
      calendarState.setCurrentDate,
    ]
  );

  const [rightCalendarView, setRightCalendarView] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dual-right-calendar-view") || "timeGridWeek";
    }
    return "timeGridWeek";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "dual-left-calendar-view",
        calendarState.currentView
      );
    }
  }, [calendarState.currentView]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dual-right-calendar-view", rightCalendarView);
    }
  }, [rightCalendarView]);

  const [leftCalendarRef, setLeftCalendarRef] =
    useState<RefObject<CalendarCoreRef | null> | null>(null);
  const [rightCalendarRefState, setRightCalendarRefState] =
    useState<RefObject<CalendarCoreRef | null> | null>(null);

  const dualCalendarRefObject = useRef<DualCalendarControllerRef | null>(null);

  const dualCalendarCallbackRef = useCallback(
    (instance: DualCalendarControllerRef | null) => {
      mark("HomeCalendar:dualCalendarCallbackRef");
      dualCalendarRefObject.current = instance;
      if (instance) {
        setLeftCalendarRef((prev) =>
          prev !== instance.leftCalendarRef ? instance.leftCalendarRef : prev
        );
        setRightCalendarRefState((prev) =>
          prev !== instance.rightCalendarRef ? instance.rightCalendarRef : prev
        );
      }
    },
    []
  );

  const { setState: setDockBridgeState } = useDockBridge();
  useEffect(() => {
    setDockBridgeState({
      calendarRef: (showDualCalendar
        ? leftCalendarRef || null
        : calendarRef) as RefObject<CalendarCoreRef | null>,
      currentCalendarView: calendarState.currentView,
      onCalendarViewChange: calendarState.setCurrentView,
      ...(showDualCalendar
        ? {
            rightCalendarRef: rightCalendarRefState || null,
            rightCalendarView,
            onRightCalendarViewChange: setRightCalendarView,
          }
        : {}),
    });
  }, [
    showDualCalendar,
    leftCalendarRef,
    rightCalendarRefState,
    rightCalendarView,
    calendarState.currentView,
    calendarState.setCurrentView,
    setDockBridgeState,
  ]);

  const dualCalendarProps: DualCalendarComponentProps = {
    events: allEvents,
    freeRoam,
    initialLeftView: calendarState.currentView,
    initialRightView: rightCalendarView,
    loading: eventsState.loading,
    onLeftViewChange: calendarState.setCurrentView,
    onRefreshData: handleRefreshWithBlur,
    onRightViewChange: setRightCalendarView,
  };

  const singleCalendarProps: CalendarMainContentProps = {
    calendarHeight,
    calendarRef,
    callbacks,
    contextMenu,
    currentDate: calendarState.currentDate,
    currentView: calendarState.currentView,
    dataTableEditor: {
      handleEditReservation: (_event) => {
        // handled via dataTableEditor state mutations further down
      },
    },
    dragHandlers,
    events: allEvents,
    freeRoam,
    handleCancelReservation: eventHandlers.handleCancelReservation,
    handleEventChange: eventHandlers.handleEventChange,
    handleOpenConversation: (id: string) => openConversationFromStore(id),
    handleOpenDocument,
    handleUpdateSize: handleCalendarUpdateSize,
    handleViewDetails: (_eventId: string) => {
      // Managed elsewhere
    },
    hoverCard,
    isHydrated: true,
    isLocalized,
    isVacationDate,
    onViewChange: calendarState.setCurrentView,
    processedEvents: allEvents,
    setCalendarHeight: handleCalendarHeightChange,
    setCurrentDate: calendarState.setCurrentDate,
    setCurrentView: calendarState.setCurrentView,
    slotTimes: calendarState.slotTimes,
    slotTimesKey: calendarState.slotTimesKey,
  };

  const dataTableEditorProps: CalendarDataTableEditorWrapperProps = {
    calendarRef,
    closeEditor: dataTableEditor.closeEditor,
    editorOpen: dataTableEditor.editorOpen,
    events: allEvents,
    freeRoam,
    isLocalized,
    onEventAdded:
      eventHandlers.handleEventAdded ??
      ((_event) => {
        // No-op fallback
      }),
    onEventCancelled:
      eventHandlers.handleEventCancelled ??
      ((_eventId) => {
        // No-op fallback
      }),
    onEventModified:
      eventHandlers.handleEventModified ??
      ((_eventId, _event) => {
        // No-op fallback
      }),
    onOpenChange: dataTableEditor.setEditorOpen,
    onSave: handleRefreshWithBlur,
    selectedDateRange: dataTableEditor.selectedDateRange,
    setShouldLoadEditor: dataTableEditor.setShouldLoadEditor,
    shouldLoadEditor: dataTableEditor.shouldLoadEditor,
    slotDurationHours: SLOT_DURATION_HOURS,
  };

  return {
    wrapperRef,
    calendarContainerProps: {
      isHydrated: mounted,
      isRefreshing: mounted ? isRefreshing : false,
      loading: !mounted,
    },
    shouldRenderContent: mounted,
    showDualCalendar,
    dualCalendarConfig: {
      ref: dualCalendarCallbackRef,
      props: dualCalendarProps,
    },
    singleCalendarProps,
    dataTableEditorProps,
    layout: {
      contentWrapperClassName: "flex h-full flex-1 flex-col px-4 pt-1",
      contentInnerClassName:
        "flex h-full flex-1 flex-col rounded-lg border border-border/50 bg-card/50 p-2",
    },
  };
}
