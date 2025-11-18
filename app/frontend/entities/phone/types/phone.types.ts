export type PhoneOption = {
	/** International formatted phone number, usually with + prefix */
	number: string
	/** Display name for the contact/customer */
	name: string
	/** ISO 3166-1 alpha-2 country code (from react-phone-number-input) */
	country: string
	/** Human readable label for country/name mix, e.g., "United States (+1)" */
	label: string
	/** Optional unique id of the contact/customer */
	id?: string
	/** Optional preformatted display number to avoid recomputation during render */
	displayNumber?: string
	/** Epoch timestamp (ms) of the last inbound/outbound message, used for recency grouping */
	lastMessageAt?: number | null
	/** Epoch timestamp (ms) of the most recent reservation associated with the contact */
	lastReservationAt?: number | null
	/** Whether the customer is marked as favorite */
	is_favorite?: boolean
}
