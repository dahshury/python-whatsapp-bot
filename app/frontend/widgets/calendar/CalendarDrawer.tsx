"use client";

import { createCalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { getTimezone } from "@shared/libs/calendar/calendar-config";
import { useVacation } from "@shared/libs/state/vacation-context";
import { cn } from "@shared/libs/utils";
import { useRouter } from "next/navigation";
import React from "react";
import type { CalendarCoreRef } from "@/features/calendar";
import {
  alignAndSortEventsForCalendar,
  filterEventsForCalendar,
  useCalendarContextMenu,
  useCalendarCore,
  useCalendarDragHandlers,
  useCalendarEventHandlers,
  useCalendarHoverCard,
  useVacationDateChecker,
} from "@/features/calendar";
import { useCalendarPeriodData } from "@/features/calendar/hooks/useCalendarPeriodData";
import {
  useLanguageStore,
  useSettingsStore,
} from "@/infrastructure/store/app-store";
import { PREFETCH } from "@/shared/config";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { CalendarContainer } from "./CalendarContainer";
import { CalendarDock } from "./CalendarDock";
import { CalendarMainContent } from "./CalendarMainContent";

type CalendarDrawerProps = {
  className?: string;
  trigger?: React.ReactNode;
  title?: string;
  side?: "left" | "right" | "top" | "bottom";
  initialView?: string;
  disableDateClick?: boolean;
  lockView?: string;
  onOpenChange?: (open: boolean) => void;
};

/**
 * CalendarDrawer component that displays a calendar in a sheet drawer.
 * Prefetches calendar data when the trigger is hovered or when the drawer
 * is about to open, so the calendar is ready when the drawer opens.
 */
export function CalendarDrawer({
  className,
  trigger,
  title = "Calendar",
  side = "right",
  initialView = "listMonth",
  disableDateClick = false,
  lockView,
  onOpenChange,
}: CalendarDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [shouldPrefetch, setShouldPrefetch] = React.useState(false);
  const [isPrefetched, setIsPrefetched] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();
  const { freeRoam } = useSettingsStore();
  const { isLocalized } = useLanguageStore();
  const {
    handleDateClick: handleVacationDateClick,
    recordingState,
    vacationPeriods,
  } = useVacation();

  // Ensure component only renders after hydration
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prefetch when trigger is hovered or drawer is about to open
  const handleTriggerHover = React.useCallback(() => {
    setShouldPrefetch(true);
  }, []);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      // Start prefetching when drawer starts opening
      if (newOpen) {
        setShouldPrefetch(true);
      }
      // Call external callback if provided
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  // Mark as prefetched after a short delay to allow data to start loading
  React.useEffect(() => {
    if (shouldPrefetch && !isPrefetched) {
      const timer = setTimeout(() => {
        setIsPrefetched(true);
      }, PREFETCH.PREFETCH_COMPLETE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    return;
  }, [shouldPrefetch, isPrefetched]);

  // Calendar ref
  const calendarRef = React.useRef<CalendarCoreRef>(null);

  // Use locked view if provided, otherwise use initialView
  const effectiveInitialView = lockView || initialView;

  // Calendar core hook - enabled when prefetching or drawer is open
  const calendarCore = useCalendarCore({
    freeRoam,
    initialView: effectiveInitialView,
    excludeConversations: false,
    enabled: shouldPrefetch || open || isPrefetched,
  });

  // Lock view: override setCurrentView to always reset to locked view
  const lockedSetCurrentView = React.useCallback(
    (view: string) => {
      if (lockView && view !== lockView) {
        // Reset to locked view via calendar API
        const api = calendarRef.current?.getApi?.();
        if (api) {
          try {
            api.changeView(lockView);
          } catch {
            // Silently ignore if calendar API is not available
          }
        }
        // Still update state to locked view
        calendarCore.calendarState.setCurrentView(lockView);
      } else {
        calendarCore.calendarState.setCurrentView(view);
      }
    },
    [lockView, calendarCore.calendarState]
  );

  // Reset view to locked view if it changes
  React.useEffect(() => {
    if (
      lockView &&
      open &&
      calendarCore.calendarState.isHydrated &&
      calendarCore.calendarState.currentView !== lockView
    ) {
      const api = calendarRef.current?.getApi?.();
      if (api) {
        try {
          api.changeView(lockView);
        } catch {
          // Silently ignore if calendar API is not available
        }
      }
      calendarCore.calendarState.setCurrentView(lockView);
    }
  }, [
    lockView,
    open,
    calendarCore.calendarState.currentView,
    calendarCore.calendarState.isHydrated,
    calendarCore.calendarState.setCurrentView,
  ]);

  // Get period-based data
  const { getCurrentPeriodData } = useCalendarPeriodData({
    currentView: calendarCore.calendarState.currentView,
    currentDate: calendarCore.calendarState.currentDate,
    freeRoam,
  });
  const periodData = getCurrentPeriodData();

  // Vacation date checker
  const isVacationDate = useVacationDateChecker(vacationPeriods);

  // Map conversations from period data
  const mappedConversations = React.useMemo(
    () => periodData.conversations || {},
    [periodData.conversations]
  );

  // Process events for calendar
  const allEvents = React.useMemo(() => {
    const filtered = filterEventsForCalendar(
      calendarCore.eventsState.events,
      freeRoam
    );
    return alignAndSortEventsForCalendar(
      filtered,
      freeRoam,
      calendarCore.calendarState.currentView
    );
  }, [
    calendarCore.eventsState.events,
    calendarCore.calendarState.currentView,
    freeRoam,
  ]);

  // Calendar height
  const calendarHeight = React.useMemo((): number | "auto" => {
    // Use auto height for drawer to fill available space
    return "auto";
  }, []);

  // Event handlers
  const eventHandlers = useCalendarEventHandlers({
    events: allEvents,
    conversations: mappedConversations,
    isLocalized,
    currentView: calendarCore.calendarState.currentView,
    isVacationDate,
    handleRefreshWithBlur: async () => {
      // No-op: refresh handled elsewhere
    },
    openConversation: () => {
      // No-op: conversations not opened from drawer
    },
    addEvent: calendarCore.eventsState.addEvent,
    updateEvent: calendarCore.eventsState.updateEvent,
    removeEvent: calendarCore.eventsState.removeEvent,
    dataTableEditor: {
      handleEditReservation: () => {
        // No-op: handled by dataTableEditor state
      },
    },
    calendarRef,
  });

  // Handle opening document from event click
  const handleOpenDocument = React.useCallback(
    (waId: string) => {
      // Navigate to documents page with waId as query parameter
      router.push(`/documents?waId=${encodeURIComponent(waId)}`);
      // Close the drawer after navigation
      setOpen(false);
    },
    [router]
  );

  // Build calendar callbacks
  const callbacks = React.useMemo(
    () =>
      createCalendarCallbacks({
        handlers: {
          isLocalized,
          currentView: calendarCore.calendarState.currentView,
          isVacationDate,
          openEditor: () => {
            // No-op: editor not shown in drawer
          },
          handleOpenConversation: eventHandlers.handleOpenConversation,
          handleEventChange: eventHandlers.handleEventChange,
        },
        freeRoam,
        timezone: getTimezone(),
        currentDate: calendarCore.calendarState.currentDate,
        ...(recordingState.periodIndex !== null && recordingState.field !== null
          ? {
              handleVacationDateClick,
            }
          : {}),
        setCurrentDate: calendarCore.calendarState.setCurrentDate,
        currentView: calendarCore.calendarState.currentView,
      }),
    [
      isLocalized,
      calendarCore.calendarState.currentView,
      isVacationDate,
      eventHandlers.handleOpenConversation,
      eventHandlers.handleEventChange,
      freeRoam,
      calendarCore.calendarState.currentDate,
      recordingState.periodIndex,
      recordingState.field,
      handleVacationDateClick,
      calendarCore.calendarState.setCurrentDate,
    ]
  );

  // Context menu
  const contextMenu = useCalendarContextMenu();

  // Create a ref for the hover card close function
  const closeHoverCardRef = React.useRef<(() => void) | null>(null);

  // Drag handlers (must be created before hover card)
  const dragHandlers = useCalendarDragHandlers({
    closeHoverCardImmediately: () => closeHoverCardRef.current?.(),
  });

  // Hover card management with proper drag state
  const hoverCard = useCalendarHoverCard({
    isDragging: dragHandlers.isDragging,
  });

  // Update the ref with the actual close function
  React.useEffect(() => {
    closeHoverCardRef.current = hoverCard.closeHoverCardImmediately;
  }, [hoverCard.closeHoverCardImmediately]);

  // Handle calendar size updates
  const handleCalendarUpdateSize = React.useCallback(() => {
    // No-op: height is auto in drawer
  }, []);

  const handleCalendarHeightChange = React.useCallback(() => {
    // No-op: height is auto in drawer
  }, []);

  // Wrap trigger to handle hover for prefetching
  const wrappedTrigger = React.useMemo(() => {
    if (!trigger) {
      return null;
    }
    const element = trigger as React.ReactElement<
      React.HTMLAttributes<HTMLElement>
    >;
    if (!element || typeof element !== "object" || !("props" in element)) {
      return element;
    }
    const props = element.props as React.HTMLAttributes<HTMLElement>;
    return React.cloneElement(element, {
      ...props,
      onMouseEnter: handleTriggerHover,
    });
  }, [trigger, handleTriggerHover]);

  if (!mounted) {
    return null;
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetTrigger asChild>{wrappedTrigger}</SheetTrigger>
      <SheetContent
        className={cn(
          "flex w-[85vw] flex-col overflow-hidden p-0 sm:max-w-xl",
          className
        )}
        side={side}
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 pr-12">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
          <CalendarContainer
            isHydrated={mounted}
            isRefreshing={false}
            loading={calendarCore.eventsState.loading && !isPrefetched}
          >
            {open || isPrefetched ? (
              <div className="flex h-full w-full max-w-full flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 p-2">
                <CalendarDock
                  calendarRef={calendarRef}
                  className="mx-0 w-full"
                  currentView={calendarCore.calendarState.currentView}
                  isLocalized={isLocalized}
                />
                <CalendarMainContent
                  calendarHeight={calendarHeight}
                  calendarRef={calendarRef}
                  callbacks={{
                    ...callbacks,
                    dateClick: disableDateClick
                      ? () => {
                          // No-op when date click is disabled
                        }
                      : callbacks.dateClick,
                    // Override eventClick to open document and close drawer
                    eventClick: (info: {
                      event?: {
                        id?: string;
                        extendedProps?: {
                          wa_id?: string;
                          waId?: string;
                          __vacation?: boolean;
                          isVacationPeriod?: boolean;
                        };
                      };
                    }) => {
                      // Prevent vacation events from being clickable
                      const extendedProps = info?.event?.extendedProps;
                      if (
                        extendedProps?.__vacation === true ||
                        extendedProps?.isVacationPeriod === true
                      ) {
                        return;
                      }

                      const waId =
                        info?.event?.extendedProps?.wa_id ||
                        info?.event?.extendedProps?.waId ||
                        info?.event?.id;
                      if (waId) {
                        handleOpenDocument(String(waId));
                      }
                    },
                  }}
                  contextMenu={contextMenu}
                  currentDate={calendarCore.calendarState.currentDate}
                  currentView={calendarCore.calendarState.currentView}
                  dataTableEditor={{
                    handleEditReservation: () => {
                      // No-op: handled by dataTableEditor state
                    },
                  }}
                  disableHoverCards={false}
                  disableNavLinks={false}
                  dragHandlers={dragHandlers}
                  events={allEvents}
                  freeRoam={freeRoam}
                  handleCancelReservation={
                    eventHandlers.handleCancelReservation
                  }
                  handleEventChange={eventHandlers.handleEventChange}
                  handleOpenConversation={() => {
                    // No-op: conversations not opened from drawer
                  }}
                  handleOpenDocument={handleOpenDocument}
                  handleUpdateSize={handleCalendarUpdateSize}
                  handleViewDetails={() => {
                    // No-op: view details handled elsewhere
                  }}
                  hoverCard={hoverCard}
                  isHydrated={true}
                  isLocalized={isLocalized}
                  isVacationDate={isVacationDate}
                  onViewChange={
                    lockView
                      ? (view: string) => {
                          // Prevent view changes when locked
                          if (view !== lockView) {
                            lockedSetCurrentView(lockView);
                          } else {
                            calendarCore.calendarState.setCurrentView(view);
                          }
                        }
                      : calendarCore.calendarState.setCurrentView
                  }
                  processedEvents={allEvents}
                  setCalendarHeight={handleCalendarHeightChange}
                  setCurrentDate={calendarCore.calendarState.setCurrentDate}
                  setCurrentView={
                    lockView
                      ? lockedSetCurrentView
                      : calendarCore.calendarState.setCurrentView
                  }
                  slotTimes={calendarCore.calendarState.slotTimes}
                  slotTimesKey={calendarCore.calendarState.slotTimesKey}
                />
              </div>
            ) : null}
          </CalendarContainer>
        </div>
      </SheetContent>
    </Sheet>
  );
}
