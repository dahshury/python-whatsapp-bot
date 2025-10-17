import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";
import type { UpdateType as BaseUpdateType } from "@/shared/libs/realtime-utils";

export type UpdateType =
	| BaseUpdateType
	| "conversation_typing"
	| "typing_ack"
	| "typing_nack"
	| "vacation_update_ack"
	| "vacation_update_nack"
	| "notifications_history"
	| "customer_document_updated";

export type WebSocketMessage = {
	type: UpdateType;
	timestamp: string;
	data: Record<string, unknown>;
	affected_entities?: string[];
};

export type VacationSnapshot = { start: string; end: string; title?: string };

export type WebSocketDataState = {
	reservations: Record<string, Reservation[]>;
	conversations: Record<string, ConversationMessage[]>;
	vacations: VacationSnapshot[];
	isConnected: boolean;
	lastUpdate: string | null;
};
