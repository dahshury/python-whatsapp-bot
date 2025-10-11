export interface CalendarEvent {
	id: string;
	title: string;
	start: string; // ISO 8601 date-time string
	end?: string; // ISO 8601 date-time string
	display?: "auto" | "block" | "list-item" | "background" | "inverse-background" | "none";
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
}

export interface Reservation {
	id?: number; // Database ID of the reservation
	customer_id: string; // e.g. WhatsApp ID
	date: string; // YYYY-MM-DD
	time_slot: string; // HH:mm format
	customer_name: string;
	type: number; // 0 or 1
	cancelled?: boolean;
	// Optional timestamp fields that may be present
	updated_at?: string;
	modified_at?: string;
	last_modified?: string;
	modified_on?: string;
	update_ts?: string;
	history?: Array<{
		ts?: string;
		timestamp?: string;
		[key: string]: unknown;
	}>;
	[key: string]: unknown;
}

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
