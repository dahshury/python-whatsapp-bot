export const runtimeConfig = {
	timezone:
		process.env.NEXT_PUBLIC_TIMEZONE || process.env.TIMEZONE || 'Asia/Riyadh',
}

/**
 * Reservation configuration constants
 */
export const RESERVATION_CONFIG = {
	/**
	 * Maximum number of reservations allowed by the frontend
	 * Note: AI agent uses 5, but frontend allows 6
	 */
	MAX_RESERVATIONS_FRONTEND: 6,
} as const
