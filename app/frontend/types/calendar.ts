export interface CalendarEvent {
	id: string;
	title: string;
	start: string; // ISO 8601 date-time string
	end: string; // ISO 8601 date-time string
	backgroundColor?: string;
	borderColor?: string;
	textColor?: string;
	editable?: boolean;
	durationEditable?: boolean;
	className?: string[];
	extendedProps?: {
		type: number;
		cancelled?: boolean;
		[key: string]: unknown;
	};
}

// Reservation payload shape from backend
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

// Conversation message shape from backend
export interface ConversationMessage {
	role: string; // Role of the sender (user, assistant, etc.)
	message: string; // The message content
	time: string; // Time in HH:MM:SS format
	date: string; // Date in YYYY-MM-DD format
}

// Conversation data structure - Record of wa_id to array of messages
export interface Conversations {
	[wa_id: string]: ConversationMessage[];
}

// Vacation period data structure
export interface VacationPeriod {
	start: Date;
	end: Date;
	title?: string;
	duration?: number;
}
