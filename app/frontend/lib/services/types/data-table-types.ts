export type RowChange = {
	scheduled_time?: string | Date;
	phone?: string;
	type?: string | number;
	name?: string;
};

export interface SuccessfulOperation {
	type: "create" | "modify" | "cancel";
	id: string; // wa_id or event id
	data?: {
		waId?: string;
		date?: string;
		time?: string;
		type?: number;
	};
}

export interface CalendarEvent {
	id: string;
	title: string;
	start: string;
	end?: string;
	extendedProps?: {
		waId?: string;
		wa_id?: string;
		type?: number;
		cancelled?: boolean;
		reservationId?: number;
		customerName?: string;
		slotDate?: string;
		slotTime?: string;
	};
}

export interface CalendarApi {
	getEventById?: (id: string) => CalendarEventObject | null;
	getEvents?: () => CalendarEventObject[];
	addEvent?: (event: Partial<CalendarEvent>) => CalendarEventObject | null;
	updateSize?: () => void;
	rerenderEvents?: () => void;
	view?: { type?: string };
}

export interface CalendarEventObject {
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
}

export interface WebSocketMessage {
	type: string;
	data: Record<string, unknown>;
}

export interface WebSocketConnection {
	current?: {
		readyState: number;
		send: (message: string) => void;
	};
}

export interface ApiResponse {
	success: boolean;
	id?: string | number;
	reservationId?: string | number;
	data?: {
		reservation_id?: string | number;
		[key: string]: unknown;
	};
	message?: string;
	error?: string;
	detail?: string;
}

export interface OperationResult {
	hasErrors: boolean;
	successfulOperations: SuccessfulOperation[];
}

declare global {
	interface GlobalThis {
		__wsConnection?: WebSocketConnection;
		__localOps?: Set<string>;
		__suppressEventChangeDepth?: number;
		__calendarLastModifyContext?: Map<string, Record<string, unknown>>;
	}
}
