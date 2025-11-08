import { createCallbackHandlers } from "@shared/libs/calendar/calendar-callback-factory";
// Services and utilities
import { createCalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { getTimezone } from "@shared/libs/calendar/calendar-config";
import {
  calculateCalendarHeight,
  useCalendarResize,
} from "@shared/libs/calendar/calendar-view-utils";
import { useVacation } from "@shared/libs/state/vacation-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  alignAndSortEventsForCalendar,
  filterEventsForCalendar,
  processEventsForFreeRoam,
} from "@/features/calendar";
import { useCalendarDataTableEditor } from "@/features/data-table";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { useSidebar } from "@/shared/ui/sidebar";
import { useCalendarContextMenu } from "./useCalendarContextMenu";
import type { ViewType } from "./useCalendarDateRange";
import { useCalendarDragHandlers } from "./useCalendarDragHandlers";
import { useCalendarEventHandlers } from "./useCalendarEventHandlers";
import { useCalendarEvents } from "./useCalendarEvents";
import { useCalendarHoverCard } from "./useCalendarHoverCard";
import { useCalendarInitialization } from "./useCalendarInitialization";
import { useCalendarPeriodData } from "./useCalendarPeriodData";
// Custom hooks
import { useCalendarCacheInvalidation } from "./useCalendarSlidingWindow";
import { useCalendarState } from "./useCalendarState";
import { useVacationDateChecker } from "./useVacationDateChecker";

type UseCalendarCoreProps = {
  freeRoam: boolean;
  initialView: string;
  initialDate?: string;
  /** Optional prefix to separate persisted keys per context */
  storageKeyPrefix?: string;
  /** Optional explicit storage key for view */
  viewStorageKey?: string;
  /** Optional explicit storage key for date */
  dateStorageKey?: string;
  /** When true, conversations will not be fetched nor included in events */
  excludeConversations?: boolean;
  /** When false, calendar queries will not be executed (e.g., when drawer is closed) */
  enabled?: boolean;
};

export function useCalendarCore({
  freeRoam,
  initialView,
  initialDate,
  storageKeyPrefix,
  viewStorageKey,
  dateStorageKey,
  excludeConversations,
  enabled = true,
}: UseCalendarCoreProps) {
  const { isLocalized } = useLanguageStore();
  const {
    handleDateClick: handleVacationDateClick,
    recordingState,
    vacationPeriods,
  } = useVacation();
  const { state: _sidebarState, open: sidebarOpen } = useSidebar();
  const { openConversation } = useSidebarChatStore();

  // Ref for calendar component
  const calendarRef = useRef<CalendarCoreRef>(null);

  // Calendar state management
  const calendarState = useCalendarState({
    freeRoam,
    initialView,
    ...(initialDate && { initialDate }),
    ...(storageKeyPrefix ? { storageKeyPrefix } : {}),
    ...(viewStorageKey ? { viewStorageKey } : {}),
    ...(dateStorageKey ? { dateStorageKey } : {}),
  });

  // Get period-based data from TanStack Query cache (for hover cards and UI)
  // NOTE: Calendar events are loaded via useCalendarEvents hook below
  // Only read from cache when enabled to avoid unnecessary cache access
  const { getCurrentPeriodData } = useCalendarPeriodData({
    currentView: calendarState.currentView,
    currentDate: calendarState.currentDate,
    freeRoam,
  });
  const periodData = enabled
    ? getCurrentPeriodData()
    : {
        reservations: {},
        conversations: {},
        periodKey: "",
        fromDate: "",
        toDate: "",
      };

  // Calendar events management
  const eventsState = useCalendarEvents({
    freeRoam,
    isLocalized,
    currentView: calendarState.currentView,
    currentDate: calendarState.currentDate,
    autoRefresh: false,
    ...(excludeConversations ? { excludeConversations: true } : {}),
    enabled,
  });

  // Invalidate cache when view changes (only invalidate old view type queries)
  const { invalidateView } = useCalendarCacheInvalidation();
  const previousViewRef = useRef<string>(calendarState.currentView);
  useEffect(() => {
    if (
      calendarState.isHydrated &&
      previousViewRef.current !== calendarState.currentView
    ) {
      // Only invalidate if view actually changed
      if (previousViewRef.current) {
        invalidateView(previousViewRef.current as ViewType);
      }
      previousViewRef.current = calendarState.currentView;
    }
  }, [calendarState.currentView, calendarState.isHydrated, invalidateView]);

  // Filter cancelled, align and sort within slots, then adjust free roam editability
  const processedEvents = useMemo(() => {
    const filtered = filterEventsForCalendar(eventsState.events, freeRoam);
    const aligned = alignAndSortEventsForCalendar(
      filtered,
      freeRoam,
      calendarState.currentView
    );
    return processEventsForFreeRoam(aligned, freeRoam);
  }, [eventsState.events, freeRoam, calendarState.currentView]);

  // View/height calculation
  const { calculateHeight } = useCalendarResize(
    calendarState.currentView,
    () => {
      setCalendarHeight(calculateCalendarHeight(calendarState.currentView));
    }
  );

  // Calendar initialization and refresh
  const {
    calendarHeight,
    isRefreshing,
    handleRefreshWithBlur,
    handleUpdateSize: updateSize,
    setCalendarHeight,
  } = useCalendarInitialization({
    calculateHeight,
    sidebarOpen,
    refreshData: eventsState.refreshData,
    calendarRef,
  });

  // Vacation date checker (expects YYYY-MM-DD string)
  const vacationDateChecker = useVacationDateChecker(vacationPeriods);
  const isVacationDateString = useCallback(
    (date: string) => {
      // Ensure date-only string
      const dateOnly = date.includes("T") ? date.split("T")[0] || date : date;
      return vacationDateChecker(dateOnly);
    },
    [vacationDateChecker]
  );

  // Context menu management
  const contextMenu = useCalendarContextMenu();

  // Data table editor management
  const dataTableEditor = useCalendarDataTableEditor();

  // Create a ref for the hover card close function
  const closeHoverCardRef = useRef<(() => void) | null>(null);

  // Drag handlers
  const dragHandlers = useCalendarDragHandlers({
    closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
  });

  // Hover card management with proper drag state
  const hoverCard = useCalendarHoverCard({
    isDragging: dragHandlers.isDragging,
  });

  // Update the ref with the actual close function
  closeHoverCardRef.current = hoverCard.closeHoverCardImmediately;

  // Event handlers
  const eventHandlers = useCalendarEventHandlers({
    events: eventsState.events,
    conversations: periodData.conversations, // Use period-based conversation events
    isLocalized,
    currentView: calendarState.currentView,
    isVacationDate: vacationDateChecker,
    handleRefreshWithBlur,
    openConversation,
    addEvent: eventsState.addEvent,
    updateEvent: eventsState.updateEvent,
    removeEvent: eventsState.removeEvent,
    dataTableEditor,
    calendarRef, // Pass calendar ref for direct event manipulation
  });

  // Use hover card directly without wrapper (drag state already handled inside)
  const hoverCardWithDragging = hoverCard;

  // Calendar callback handlers
  const callbackHandlers = createCallbackHandlers({
    isLocalized,
    currentView: calendarState.currentView,
    isVacationDate: isVacationDateString,
    openEditor: (opts?: { start: string; end?: string }) => {
      if (opts?.start) {
        dataTableEditor.openEditor({
          start: opts.start,
          end: opts.end || opts.start,
        });
      }
    },
    handleOpenConversation: eventHandlers.handleOpenConversation,
    handleEventChange: eventHandlers.handleEventChange,
  });

  // Create calendar callbacks with vacation support
  const callbacks = useMemo(
    () =>
      createCalendarCallbacks({
        handlers: callbackHandlers,
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
      callbackHandlers,
      freeRoam,
      calendarState.currentDate,
      recordingState.periodIndex,
      recordingState.field,
      handleVacationDateClick,
      calendarState.setCurrentDate,
      calendarState.currentView,
    ]
  );

  // Handle update size with ref
  const handleUpdateSize = () => updateSize(calendarRef);

  return {
    // Refs
    calendarRef,

    // State
    calendarState,
    eventsState,
    processedEvents,
    calendarHeight,
    isRefreshing,
    isVacationDate: vacationDateChecker,

    // UI State
    contextMenu,
    dataTableEditor,
    hoverCardWithDragging,
    dragHandlers,

    // Handlers
    eventHandlers,
    callbacks,
    handleUpdateSize,
    handleRefreshWithBlur,
    setCalendarHeight,

    // External data
    conversations: periodData.conversations, // Use period-based conversation events
    reservations: periodData.reservations, // Use period-based reservations (for hover cards)
    isLocalized,
  };
}
