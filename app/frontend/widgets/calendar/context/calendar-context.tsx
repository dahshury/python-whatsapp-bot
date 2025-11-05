/**
 * Calendar Context
 * Centralizes calendar state and callbacks to eliminate prop drilling.
 * Consumed by CalendarMainContent and child components.
 */

import type { EventApi, EventChangeArg } from "@fullcalendar/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import type { CalendarEvent, Reservation } from "@/entities/event";
import type {
  CalendarCallbacks,
  VacationDateChecker,
} from "@/shared/libs/calendar/calendar-callbacks";

export type CalendarContextValue = {
  // State
  calendarRef: React.RefObject<unknown> | null;
  processedEvents: CalendarEvent[];
  currentView: string;
  currentDate: Date;
  isLocalized: boolean;
  freeRoam: boolean;
  slotTimes: {
    slotMinTime: string;
    slotMaxTime: string;
  };
  slotTimesKey: number;
  calendarHeight: number | "auto";
  isVacationDate: VacationDateChecker;
  callbacks: CalendarCallbacks;
  conversations: Record<string, ConversationMessage[]>;
  reservations: Record<string, Reservation[]>;
  events: CalendarEvent[];
  isHydrated: boolean;

  // Context menu state
  contextMenuEvent: CalendarEvent | null;
  contextMenuPosition: { x: number; y: number } | null;

  // Hover card state
  hoveredEventId: string | null;
  hoverCardPosition: {
    x: number;
    y: number;
    preferBottom?: boolean;
    eventHeight?: number;
  } | null;
  isHoverCardMounted: boolean;
  isHoverCardClosing: boolean;

  // Drag state
  isDragging: boolean;

  // Actions
  setCurrentView: (view: string) => void;
  setCalendarHeight: (height: number | "auto") => void;
  setCurrentDate: (date: Date) => void;
  handleUpdateSize: () => void;
  handleEventChange: (info: EventChangeArg) => void;
  handleContextMenu: (
    event: CalendarEvent,
    position: { x: number; y: number }
  ) => void;
  handleCloseContextMenu: () => void;
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
  handleEventDragStart: (info: unknown) => void;
  handleEventDragStop: () => void;
  handleOpenConversation: (eventId: string) => void;
  handleCancelReservation: (eventId: string) => void;
  handleViewDetails: (eventId: string) => void;
  handleOpenDocument: (waId: string) => void;
  onViewChange?: (view: string) => void;
  onEventReceive?: (info: { event: EventApi; draggedEl: HTMLElement }) => void;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CalendarContextValue;
}) {
  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext(): CalendarContextValue {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error(
      "useCalendarContext must be used within CalendarContextProvider"
    );
  }
  return context;
}
