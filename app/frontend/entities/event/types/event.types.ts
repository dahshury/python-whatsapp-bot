export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  display?:
    | "auto"
    | "block"
    | "list-item"
    | "background"
    | "inverse-background"
    | "none";
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  editable?: boolean;
  durationEditable?: boolean;
  overlap?: boolean;
  className?: string[];
  extendedProps?: {
    waId?: string;
    wa_id?: string;
    type?: number;
    cancelled?: boolean;
    reservationId?: number | undefined;
    customerName?: string;
    slotDate?: string;
    slotTime?: string;
    __vacation?: boolean;
    [key: string]: unknown;
  };
};

export type Reservation = {
  id?: number;
  customer_id: string;
  date: string;
  time_slot: string;
  customer_name: string;
  type: number;
  cancelled?: boolean;
  updated_at?: string;
  modified_at?: string;
  last_modified?: string;
  modified_on?: string;
  update_ts?: string;
  history?: Record<string, unknown>[];
  [key: string]: unknown;
};

export type RowChange = {
  scheduled_time?: string | Date;
  phone?: string;
  type?: string | number;
  name?: string;
};

export type SuccessfulOperation = {
  type: "create" | "modify" | "cancel";
  id: string;
  data?: { waId?: string; date?: string; time?: string; type?: number };
};

export type CalendarApi = {
  getEventById?: (id: string) => CalendarEventObject | null;
  getEvents?: () => CalendarEventObject[];
  addEvent?: (event: Partial<CalendarEvent>) => CalendarEventObject | null;
  updateSize?: () => void;
  rerenderEvents?: () => void;
  view?: { type?: string };
};

export type CalendarEventObject = {
  id: string;
  title: string;
  start: string;
  startStr?: string;
  end?: string;
  extendedProps?: Record<string, unknown>;
  setProp?: (prop: string, value: unknown) => void;
  setExtendedProp?: (prop: string, value: unknown) => void;
  setStart?: (date: Date) => void;
  setDates?: (start: Date, end: Date | null) => void;
  moveStart?: (delta: { milliseconds: number }) => void;
  remove?: () => void;
};

export type WebSocketMessage = {
  type: string;
  data: Record<string, unknown>;
};

export type WebSocketConnection = {
  current?: { readyState: number; send: (message: string) => void };
};

export type ApiResponse = {
  success: boolean;
  id?: string | number;
  reservationId?: string | number;
  data?: { reservation_id?: string | number; [key: string]: unknown };
  message?: string;
  error?: string;
  detail?: string;
};

export type OperationResult = {
  hasErrors: boolean;
  successfulOperations: SuccessfulOperation[];
};
