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

/**
 * HTTP status code constants
 */
export const HTTP_STATUS = {
	OK: 200,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Backend connection constants
 */
export const BACKEND_CONNECTION = {
	/**
	 * Delay in milliseconds before reloading the page after retry
	 */
	RETRY_RELOAD_DELAY_MS: 120,
	/**
	 * Maximum length of response preview to store
	 */
	RESPONSE_PREVIEW_MAX_LENGTH: 2000,
} as const

/**
 * UI prefetch constants
 */
export const PREFETCH = {
	/**
	 * Delay in milliseconds before marking prefetch as complete
	 */
	PREFETCH_COMPLETE_DELAY_MS: 100,
} as const
