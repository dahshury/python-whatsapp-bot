import type { EventApi, EventChangeArg } from "@fullcalendar/core";
import {
  createDateClickWrapper,
  createSelectWrapper,
} from "@shared/libs/calendar/callback-wrappers";
import { useCallback } from "react";
import type { CalendarEvent } from "@/entities/event";
import type { CalendarCoreRef } from "@/features/calendar";
import { useCalendarEventHandlers } from "@/features/calendar";
import {
  blockPastTimeWithinToday,
  suppressDuplicateEventChange,
} from "@/features/calendar/lib/event-change-guards";

type UseCalendarPaneArgs = {
  events: CalendarEvent[];
  isLocalized: boolean;
  currentView: string;
  isVacationDate: (d: string) => boolean;
  handleRefreshWithBlur: () => Promise<void>;
  calendarRef: React.RefObject<CalendarCoreRef | null>;
};

export function useCalendarPane({
  events,
  isLocalized,
  currentView,
  isVacationDate,
  handleRefreshWithBlur,
  calendarRef,
}: UseCalendarPaneArgs) {
  const featureHandlers = useCalendarEventHandlers({
    events,
    conversations: {},
    isLocalized,
    currentView,
    isVacationDate,
    handleRefreshWithBlur,
    openConversation: () => {
      /* noop */
    },
    addEvent: () => {
      /* noop */
    },
    updateEvent: () => {
      /* noop */
    },
    removeEvent: () => {
      /* noop */
    },
    dataTableEditor: {
      handleEditReservation: (_e: CalendarEvent) => {
        /* noop */
      },
    },
    calendarRef,
  });

  const handleEventChange = useCallback(
    async (
      info: EventChangeArg | { event: EventApi; draggedEl: HTMLElement }
    ) => {
      if (suppressDuplicateEventChange(info)) {
        return;
      }
      if (blockPastTimeWithinToday(info)) {
        return;
      }
      await featureHandlers.handleEventChange(info as EventChangeArg);
    },
    [featureHandlers]
  );

  const wrapDateClick = createDateClickWrapper(() => currentView);
  const wrapSelect = createSelectWrapper(() => currentView);

  const handleUpdateSize = useCallback(() => {
    calendarRef.current?.updateSize();
  }, [calendarRef]);

  return {
    handleEventChange,
    wrapDateClick,
    wrapSelect,
    handleUpdateSize,
  };
}
