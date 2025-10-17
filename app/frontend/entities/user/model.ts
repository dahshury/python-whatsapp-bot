/**
 * User Domain Model
 *
 * Domain types for user/customer functionality.
 * Placeholder for future user schema and business logic.
 */

export type User = {
	id: string;
	waId: string;
	name?: string;
	phone: string;
	email?: string;
	preferences?: UserPreferences;
	createdAt: string;
	updatedAt?: string;
};

export type UserPreferences = {
	language?: "en" | "ar";
	notifications?: boolean;
	timezone?: string;
};

export interface Customer extends User {
	reservationCount?: number;
	lastReservationDate?: string;
	totalSpent?: number;
	loyaltyPoints?: number;
}

export type UserProfile = {
	user: User;
	statistics?: {
		reservations: number;
		cancellations: number;
		averageRating?: number;
	};
};
