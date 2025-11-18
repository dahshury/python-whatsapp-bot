/**
 * Calendar Events Types
 *
 * Type definitions for processed calendar event data structures.
 * These types represent the normalized payloads used for event generation.
 */

/**
 * Processed reservation data structure used for event generation.
 * Contains normalized reservation fields plus any extended properties.
 */
export type ProcessedReservation = {
	date: string
	time_slot: string
	customer_name?: string
	title?: string
	[key: string]: unknown
}

/**
 * Processed conversation event data structure used for event generation.
 * Contains normalized conversation fields extracted from chat data.
 */
export type ProcessedConversation = {
	id?: string
	text?: string
	ts?: string
	date?: string
	time?: string
	customer_name?: string
}

/**
 * Payload structure mapping customer IDs to their processed reservations.
 */
export type ReservationPayload = Record<string, ProcessedReservation[]>

/**
 * Payload structure mapping customer IDs to their processed conversation events.
 */
export type ConversationPayload = Record<string, ProcessedConversation[]>
