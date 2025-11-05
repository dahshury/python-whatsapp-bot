import type {
  CalendarApi,
  DatesSetArg,
  EventApi,
  EventChangeArg,
  EventClickArg,
  EventHoveringArg,
} from "@fullcalendar/core";
import type { CalendarEvent } from "@/entities/event";

export type CalendarCoreRef = {
  getApi: () => CalendarApi | undefined;
  updateSize: () => void;
};

export type CalendarCoreProps = {
  events: CalendarEvent[];
  currentView: string;
  currentDate: Date;
  isLocalized: boolean;
  freeRoam: boolean;
  slotTimes: { slotMinTime: string; slotMaxTime: string };
  slotTimesKey: number;
  calendarHeight: number | "auto" | "parent";
  overrideValidRange?: boolean;
  isVacationDate?: (dateStr: string) => boolean;
  onDateClick?: (info: {
    date: Date;
    dateStr: string;
    allDay: boolean;
  }) => void;
  onSelect?: (info: {
    start: Date;
    end: Date;
    startStr: string;
    endStr: string;
    allDay: boolean;
  }) => void;
  onEventClick?: (info: EventClickArg) => void;
  onEventChange?: (info: EventChangeArg) => void;
  onViewDidMount?: (info: {
    view: { type: string; title: string };
    el: HTMLElement;
  }) => void;
  onEventDidMount?: (info: {
    event: {
      id: string;
      title: string;
      start: Date;
      end?: Date;
      extendedProps?: Record<string, unknown>;
    };
    el: HTMLElement;
  }) => void;
  onDatesSet?: (info: DatesSetArg) => void;
  onEventMouseEnter?: (info: EventHoveringArg) => void;
  onEventMouseLeave?: (info: EventHoveringArg) => void;
  onEventDragStart?: (info: {
    event: {
      id: string;
      title: string;
      start: Date;
      end?: Date;
      extendedProps?: Record<string, unknown>;
    };
    el: HTMLElement;
    jsEvent: MouseEvent;
  }) => void;
  onEventDragStop?: (info: {
    event: {
      id: string;
      title: string;
      start: Date;
      end?: Date;
      extendedProps?: Record<string, unknown>;
    };
    el: HTMLElement;
    jsEvent: MouseEvent;
  }) => void;
  onViewChange?: (view: string) => void;
  onContextMenu?: (
    event: CalendarEvent,
    position: { x: number; y: number }
  ) => void;
  onUpdateSize?: () => void;
  onEventMouseDown?: () => void;
  droppable?: boolean;
  onEventReceive?: (info: { event: EventApi; draggedEl: HTMLElement }) => void;
  onEventLeave?: (info: { event?: EventApi; draggedEl: HTMLElement }) => void;
  onNavDate?: (date: Date) => void;
  navLinks?: boolean;
};
