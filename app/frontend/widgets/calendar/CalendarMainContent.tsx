"use client";

import type { EventChangeArg } from "@fullcalendar/core";
import type { CalendarCallbacks } from "@shared/libs/calendar/calendar-callbacks";
import { calculateCalendarHeight } from "@shared/libs/calendar/calendar-view-utils";
import type React from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { CalendarEvent, Reservation } from "@/entities/event";
import type { CalendarCoreRef } from "@/features/calendar";
import { CalendarCore } from "./CalendarCore";
import { CalendarEventContextMenu } from "./CalendarEventContextMenu";
import { CalendarHoverCardPortal } from "./CalendarHoverCardPortal";

export type CalendarMainContentProps = {
  calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
  processedEvents: CalendarEvent[];
  currentView: string;
  currentDate: Date;
  isLocalized?: boolean;
  freeRoam: boolean;
  slotTimes: {
    slotMinTime: string;
    slotMaxTime: string;
  };
  slotTimesKey: number;
  calendarHeight: number | "auto";
  isVacationDate: (date: string) => boolean;
  callbacks: CalendarCallbacks;
  contextMenu: {
    contextMenuEvent: CalendarEvent | null;
    contextMenuPosition: { x: number; y: number } | null;
    handleContextMenu: (
      event: CalendarEvent,
      position: { x: number; y: number }
    ) => void;
    handleCloseContextMenu: () => void;
  };
  hoverCard: {
    hoveredEventId: string | null;
    hoverCardPosition: {
      x: number;
      y: number;
      preferBottom?: boolean;
      eventHeight?: number;
    } | null;
    isHoverCardMounted: boolean;
    isHoverCardClosing: boolean;
    onHoverCardMouseEnter: () => void;
    onHoverCardMouseLeave: () => void;
    handleEventMouseEnter: (info: {
      event?: unknown;
      el: HTMLElement;
      jsEvent?: MouseEvent;
    }) => void;
    handleEventMouseLeave: (info: {
      event?: unknown;
      el?: HTMLElement;
      jsEvent?: MouseEvent;
    }) => void;
    closeHoverCardImmediately: () => void;
  };
  dragHandlers: {
    isDragging: boolean;
    handleEventDragStart: (info: unknown) => void;
    handleEventDragStop: () => void;
  };
  conversations: Record<string, ConversationMessage[]>;
  reservations: Record<string, Reservation[]>;
  events: CalendarEvent[];
  dataTableEditor: { handleEditReservation: (event: CalendarEvent) => void };
  handleOpenConversation: (eventId: string) => void;
  handleEventChange: (info: EventChangeArg) => void;
  handleCancelReservation: (eventId: string) => void;
  handleViewDetails: (eventId: string) => void;
  handleOpenDocument: (waId: string) => void;
  setCurrentView: (view: string) => void;
  setCalendarHeight: (height: number | "auto") => void;
  handleUpdateSize: () => void;
  onViewChange?: (view: string) => void;
  isHydrated: boolean;
  setCurrentDate: (
    date: Date,
    options?: {
      updateSlotFocus?: boolean;
    }
  ) => void;
  // Drawer-specific behavior toggles
  disableHoverCards?: boolean;
  disableNavLinks?: boolean;
};

export function CalendarMainContent({
  calendarRef,
  processedEvents,
  currentView,
  currentDate,
  isLocalized,
  freeRoam,
  slotTimes,
  slotTimesKey,
  calendarHeight,
  isVacationDate,
  callbacks,
  contextMenu,
  hoverCard,
  dragHandlers,
  conversations,
  reservations,
  events,
  dataTableEditor,
  handleOpenConversation,
  handleEventChange,
  handleCancelReservation,
  handleViewDetails,
  handleOpenDocument,
  setCurrentView,
  setCalendarHeight,
  handleUpdateSize,
  onViewChange,
  isHydrated,
  setCurrentDate,
  disableHoverCards,
  disableNavLinks,
}: CalendarMainContentProps) {
  const _isLocalized = isLocalized ?? false;
  return (
    <>
      <CalendarCore
        calendarHeight={calendarHeight}
        currentDate={currentDate}
        currentView={currentView}
        events={processedEvents}
        freeRoam={freeRoam}
        isLocalized={_isLocalized}
        isVacationDate={isVacationDate}
        {...(calendarRef ? { ref: calendarRef } : {})}
        slotTimes={slotTimes}
        slotTimesKey={slotTimesKey}
        {...(disableNavLinks ? { navLinks: false } : {})}
        {...(callbacks.dateClick
          ? {
              onDateClick: (info: {
                date: Date;
                dateStr: string;
                allDay: boolean;
              }) =>
                callbacks.dateClick?.({
                  ...info,
                  view: { type: currentView },
                }),
            }
          : {})}
        {...(callbacks.select
          ? {
              onSelect: (info: {
                start: Date;
                end: Date;
                startStr: string;
                endStr: string;
                allDay: boolean;
              }) =>
                callbacks.select?.({
                  ...info,
                  view: { type: currentView },
                }),
            }
          : {})}
        onEventChange={(info: EventChangeArg) => {
          try {
            handleEventChange(info);
          } catch {
            // Silently fail if event change handling fails
          }
        }}
        onEventClick={(info) => {
          const waId =
            (
              info as {
                event?: { extendedProps?: { wa_id?: string; waId?: string } };
              }
            )?.event?.extendedProps?.wa_id ||
            (
              info as {
                event?: { extendedProps?: { wa_id?: string; waId?: string } };
              }
            )?.event?.extendedProps?.waId ||
            info.event?.id;
          handleOpenConversation(waId);
          if (callbacks.eventClick) {
            callbacks.eventClick(info);
          }
        }}
        {...(onViewChange && { onViewChange })}
        {...(contextMenu?.handleContextMenu
          ? { onContextMenu: contextMenu.handleContextMenu }
          : {})}
        onDatesSet={(info) => {
          if (isHydrated && info.view.type !== currentView) {
            setCurrentView(info.view.type);
            if (onViewChange) {
              onViewChange(info.view.type);
            }
          }
        }}
        onUpdateSize={handleUpdateSize}
        onViewDidMount={(info) => {
          if (isHydrated) {
            const newHeight = calculateCalendarHeight(info.view.type);
            setCalendarHeight(newHeight);
            if (info.view.type !== currentView) {
              setCurrentView(info.view.type);
            }

            if (onViewChange && info.view.type !== currentView) {
              onViewChange(info.view.type);
            }

            if (info.view.type === "multiMonthYear") {
              requestAnimationFrame(() => {
                calendarRef?.current?.updateSize();
              });
            }
          }
        }}
        {...(disableHoverCards
          ? {}
          : {
              onEventMouseEnter: (arg: {
                event?: unknown;
                el?: HTMLElement;
                jsEvent?: MouseEvent;
              }) =>
                hoverCard.handleEventMouseEnter?.({
                  event: arg?.event,
                  el: arg?.el as HTMLElement,
                  jsEvent: arg?.jsEvent as MouseEvent,
                }),
            })}
        {...(disableHoverCards
          ? {}
          : {
              onEventMouseLeave: (arg: {
                event?: unknown;
                el?: HTMLElement;
                jsEvent?: MouseEvent;
              }) =>
                hoverCard.handleEventMouseLeave?.({
                  event: arg?.event,
                  el: arg?.el as HTMLElement,
                  jsEvent: arg?.jsEvent as MouseEvent,
                }),
            })}
        {...(dragHandlers?.handleEventDragStart
          ? { onEventDragStart: dragHandlers.handleEventDragStart }
          : {})}
        {...(dragHandlers?.handleEventDragStop
          ? { onEventDragStop: dragHandlers.handleEventDragStop }
          : {})}
        {...(disableHoverCards
          ? {}
          : { onEventMouseDown: hoverCard.closeHoverCardImmediately })}
        onNavDate={(date) => setCurrentDate(date, { updateSlotFocus: false })}
      />

      {/* Context Menu for Events */}
      <CalendarEventContextMenu
        event={contextMenu.contextMenuEvent}
        onCancelReservation={handleCancelReservation}
        onClose={contextMenu.handleCloseContextMenu}
        onEditReservation={(eventId) => {
          const event = events.find((e) => e.id === eventId);
          if (event) {
            dataTableEditor.handleEditReservation(event);
          }
        }}
        onOpenConversation={handleOpenConversation}
        onOpenDocument={handleOpenDocument}
        onViewDetails={handleViewDetails}
        position={contextMenu.contextMenuPosition}
      />

      {/* Hover Card for Events */}
      {!disableHoverCards &&
        hoverCard.hoveredEventId &&
        hoverCard.hoverCardPosition &&
        !dragHandlers.isDragging && (
          <CalendarHoverCardPortal
            conversations={conversations}
            hoverCardPosition={hoverCard.hoverCardPosition}
            hoveredEventId={hoverCard.hoveredEventId}
            isDragging={dragHandlers.isDragging}
            isHoverCardClosing={hoverCard.isHoverCardClosing}
            isHoverCardMounted={hoverCard.isHoverCardMounted}
            isLocalized={_isLocalized}
            onMouseEnter={hoverCard.onHoverCardMouseEnter}
            onMouseLeave={hoverCard.onHoverCardMouseLeave}
            reservations={reservations}
          />
        )}
    </>
  );
}
