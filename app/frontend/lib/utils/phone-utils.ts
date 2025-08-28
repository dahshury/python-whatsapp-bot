/**
 * Phone number utilities for consistent formatting
 * Ensures phone numbers are stored in database without + prefix
 * but displayed with + prefix for better UX
 */

/**
 * Normalize phone number to plain international format for backend storage
 * Removes all non-digit characters except +, then removes + prefix
 *
 * @param phone - Phone number in any format
 * @returns Plain international format (e.g., "966501234567")
 */
export function normalizePhoneForStorage(phone: string | undefined): string {
	if (!phone) return "";

	// Remove all non-digit characters except +
	const cleaned = phone.replace(/[^\d+]/g, "");

	if (!cleaned) return "";

	// Remove + prefix if it exists - database stores plain format
	return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

/**
 * Format phone number for display purposes
 * Ensures phone number has + prefix for better UX
 *
 * @param phone - Phone number in any format
 * @returns Display format with + prefix (e.g., "+966501234567")
 */
export function formatPhoneForDisplay(phone: string | undefined): string {
	if (!phone) return "";

	const normalized = normalizePhoneForStorage(phone);
	if (!normalized) return "";

	// Add + prefix for display
	return `+${normalized}`;
}

/**
 * Check if a phone number is valid (basic validation)
 *
 * @param phone - Phone number to validate
 * @returns True if valid format
 */
export function isValidPhoneFormat(phone: string | undefined): boolean {
	if (!phone) return false;

	const normalized = normalizePhoneForStorage(phone);

	// Basic validation: should be between 7-15 digits
	return /^\d{7,15}$/.test(normalized);
}

/**
 * Extract phone number from Glide cell data
 * Handles various cell formats and ensures proper normalization
 *
 * @param cellData - Cell data that might contain phone information
 * @returns Normalized phone number for backend use
 */
export function extractPhoneFromCellData(cellData: unknown): string {
	if (!cellData) return "";

	// Handle different cell data formats
	let phone = "";

	if (typeof cellData === "string") {
		phone = cellData;
	} else if (cellData && typeof cellData === "object") {
		const data = cellData as Record<string, unknown>;
		if (data.phone && typeof data.phone === "string") {
			phone = data.phone;
		} else if (data.displayPhone && typeof data.displayPhone === "string") {
			phone = data.displayPhone;
		} else if (data.data && typeof data.data === "object") {
			const nestedData = data.data as Record<string, unknown>;
			if (nestedData.phone && typeof nestedData.phone === "string") {
				phone = nestedData.phone;
			}
		}
	}

	return normalizePhoneForStorage(phone);
}
