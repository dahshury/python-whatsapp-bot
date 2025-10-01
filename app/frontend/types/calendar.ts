export interface CalendarEvent {
	id: string;
	title: string;
	start: string; // ISO 8601 date-time string
	end: string; // ISO 8601 date-time string
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

// Note: conversation-related types moved to '@/types/conversation' for SoC
