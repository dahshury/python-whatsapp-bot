import type { CalendarCoreRef } from "@/features/calendar";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: "reservation" | "conversation" | "cancellation";
  extendedProps?: {
    description?: string;
    customerName?: string;
    phone?: string;
    waId?: string;
    status?: string;
    type?: number;
    cancelled?: boolean;
    reservationId?: number | undefined;
  };
};

type ReservationData = {
  id?: number;
  date: string;
  time: string;
  phone: string;
  type: number;
  name: string;
};

export type DataTableEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: CalendarEvent[];
  selectedDateRange: { start: string; end: string } | null;
  isLocalized?: boolean;
  slotDurationHours: number;
  onSave: (events: CalendarEvent[]) => void;
  onEventClick: (event: CalendarEvent) => void;
  freeRoam?: boolean;
  data: ReservationData[];
  onDataChange?: (data: ReservationData[]) => void;
  language?: "en" | "ar";
  calendarRef?: React.RefObject<CalendarCoreRef | null> | null;
  onEventAdded?: (event: CalendarEvent) => void;
  onEventModified?: (eventId: string, event: CalendarEvent) => void;
  onEventCancelled?: (eventId: string) => void;
};

export type ValidationResult = {
  isValid: boolean;
  errors: Array<{
    row: number;
    col: number;
    message: string;
    fieldName?: string;
  }>;
};

export type EditingChanges = {
  deleted_rows?: number[];
  edited_rows?: Record<string, Record<string, unknown>>;
  added_rows?: Array<{
    date: string;
    time: string;
    phone: string;
    type: string;
    name: string;
  }>;
};
