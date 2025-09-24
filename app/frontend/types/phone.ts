export interface PhoneOption {
	/** International formatted phone number, usually with + prefix */
	number: string;
	/** Display name for the contact/customer */
	name: string;
	/** ISO 3166-1 alpha-2 country code (from react-phone-number-input) */
	country: string;
	/** Human readable label for country/name mix, e.g., "United States (+1)" */
	label: string;
	/** Optional unique id of the contact/customer */
	id?: string;
	/** Optional preformatted display number to avoid recomputation during render */
	displayNumber?: string;
}
