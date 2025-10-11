/**
 * RSVP Domain Model
 *
 * Domain types for RSVP/reservation functionality.
 * Placeholder for future reservation schema and business logic.
 */

export interface RSVP {
	id: string | number;
	eventId: string;
	customerId: string;
	status: RSVPStatus;
	createdAt: string;
	updatedAt?: string;
}

export enum RSVPStatus {
	PENDING = "pending",
	CONFIRMED = "confirmed",
	CANCELLED = "cancelled",
	DECLINED = "declined",
}

export interface ReservationRequest {
	customerId: string;
	eventId: string;
	guestCount?: number;
	specialRequests?: string;
}

export interface ReservationResponse {
	success: boolean;
	rsvp?: RSVP;
	message?: string;
}
