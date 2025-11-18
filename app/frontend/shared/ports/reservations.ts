/**
 * Reservations Port (Domain-specific)
 * Defines the contract for reservation operations (create, modify, cancel).
 */

import type { CalendarEvent, OperationResult } from '@/entities/event'

export type ReservationsPort = {
	create(
		reservation: CreateReservationRequest
	): Promise<CreateReservationResponse>
	modify(
		eventId: string,
		changes: ModifyReservationRequest
	): Promise<OperationResult>
	cancel(eventId: string): Promise<OperationResult>
	subscribe(callback: (update: ReservationUpdate) => void): () => void
}

export type CreateReservationRequest = {
	waId: string
	date: string
	time: string
	duration?: number
	title?: string
	notes?: string
}

export type CreateReservationResponse = {
	event: CalendarEvent
	success: boolean
	message?: string
}

export type ModifyReservationRequest = {
	date?: string
	time?: string
	duration?: number
	title?: string
	notes?: string
}

export type ReservationUpdate = {
	type: 'created' | 'modified' | 'cancelled'
	event?: CalendarEvent
	eventId?: string
}
