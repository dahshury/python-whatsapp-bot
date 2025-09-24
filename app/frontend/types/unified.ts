import type {
	ConversationMessage as CalendarConversationMessage,
	Reservation as CalendarReservation,
} from "@/types/calendar";

export type ConversationMessage = CalendarConversationMessage & {
	ts?: string;
	text?: string;
	datetime?: string;
	sender?: string;
	author?: string;
};

export type Reservation = CalendarReservation & {
	start?: string;
	end?: string;
	updated_at?: string;
	modified_at?: string;
	last_modified?: string;
	modified_on?: string;
	update_ts?: string;
	title?: string;
	cancelled?: boolean;
	history?: Array<{ ts?: string; timestamp?: string }>;
};

export interface Vacation {
	id: string;
	start: string;
	end: string;
}
