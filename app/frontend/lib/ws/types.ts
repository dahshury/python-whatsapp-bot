import type { UpdateType as BaseUpdateType } from "@/lib/realtime-utils";
import type { ConversationMessage, Reservation } from "@/types/calendar";

export type UpdateType =
	| BaseUpdateType
	| "vacation_update_ack"
	| "vacation_update_nack"
	| "notifications_history"
	| "document_snapshot"
	| "document_save_ack"
	| "document_save_nack"
	| "customer_profile";

export interface WebSocketMessage {
	type: UpdateType;
	timestamp: string;
	data: Record<string, unknown>;
	affected_entities?: string[];
}

export type VacationSnapshot = { start: string; end: string; title?: string };

export interface WebSocketDataState {
	reservations: Record<string, Reservation[]>;
	conversations: Record<string, ConversationMessage[]>;
	vacations: VacationSnapshot[];
	isConnected: boolean;
	lastUpdate: string | null;
}
