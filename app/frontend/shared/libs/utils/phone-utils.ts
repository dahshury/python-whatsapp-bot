/**
 * Phone number utilities for consistent formatting
 * Ensures phone numbers are stored in database without + prefix
 * but displayed with + prefix for better UX
 */

const DIGITS_ONLY_PATTERN = /^\d+$/;
const PHONE_FORMAT_PATTERN = /^\d{7,15}$/;
const NON_DIGIT_PLUS_PATTERN = /[^\d+]/g;
const NON_DIGIT_PATTERN = /[\s-]/g;
const DIGITS_PATTERN = /\D/g;

/**
 * Normalize phone number to plain international format for backend storage
 * Removes all non-digit characters except +, then removes + prefix
 *
 * @param phone - Phone number in any format
 * @returns Plain international format (e.g., "966501234567")
 */
export function normalizePhoneForStorage(phone: string | undefined): string {
	if (!phone) {
		return "";
	}

	// Remove all non-digit characters except +
	const cleaned = phone.replace(NON_DIGIT_PLUS_PATTERN, "");

	if (!cleaned) {
		return "";
	}

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
	if (!phone) {
		return "";
	}

	const normalized = normalizePhoneForStorage(phone);
	if (!normalized) {
		return "";
	}

	// Add + prefix for display
	return `+${normalized}`;
}

import {
	CALLING_CODE_TO_COUNTRY,
	CALLING_CODES_SORTED,
} from "@shared/libs/phone/countries";
// New utilities for combobox refactor
import type * as RPNInput from "react-phone-number-input";
import { parsePhoneNumber } from "react-phone-number-input";

/** Convert `00` prefix to `+` prefix */
export const convertZeroZeroToPlus = (phoneNumber: string): string => {
	if (phoneNumber.startsWith("00")) {
		return `+${phoneNumber.substring(2)}`;
	}
	return phoneNumber;
};

/** Infer country from a phone number string. Robust to plain digits and 00 prefix. */
export const getCountryFromPhone = (phoneNumber: string): RPNInput.Country => {
	try {
		if (!phoneNumber) {
			return "US" as RPNInput.Country;
		}
		let normalized = convertZeroZeroToPlus(String(phoneNumber).trim());
		const digitsOnly = normalized.replace(NON_DIGIT_PATTERN, "");
		if (!normalized.startsWith("+") && DIGITS_ONLY_PATTERN.test(digitsOnly)) {
			normalized = `+${digitsOnly}`;
		}
		const parsed = parsePhoneNumber(normalized);
		if (parsed?.country) {
			return parsed.country as RPNInput.Country;
		}
	} catch {
		// Continue to fallback logic
	}

	// Fallback by calling code prefix if parsing failed
	try {
		let s = String(phoneNumber || "");
		s = convertZeroZeroToPlus(s);
		if (s.startsWith("+")) {
			s = s.slice(1);
		}
		const digits = s.replace(DIGITS_PATTERN, "");
		if (digits) {
			const match = CALLING_CODES_SORTED.find((code) =>
				digits.startsWith(code)
			);
			if (match) {
				return CALLING_CODE_TO_COUNTRY[match] as RPNInput.Country;
			}
		}
	} catch {
		// Return default country
	}
	return "US" as RPNInput.Country;
};

/** Format number for clean display without affecting value semantics */
export const formatNumberForDisplay = (phoneNumber: string): string => {
	try {
		let normalized = phoneNumber;
		const digitsOnly = normalized.replace(NON_DIGIT_PATTERN, "");
		if (
			normalized &&
			!normalized.startsWith("+") &&
			DIGITS_ONLY_PATTERN.test(digitsOnly)
		) {
			normalized = `+${digitsOnly}`;
		}
		const parsed = parsePhoneNumber(normalized);
		if (parsed) {
			return parsed.formatInternational();
		}
		return normalized;
	} catch {
		// Return original format on parse error
	}
	return phoneNumber;
};

/**
 * Check if a phone number is valid (basic validation)
 *
 * @param phone - Phone number to validate
 * @returns True if valid format
 */
export function isValidPhoneFormat(phone: string | undefined): boolean {
	if (!phone) {
		return false;
	}

	const normalized = normalizePhoneForStorage(phone);

	// Basic validation: should be between 7-15 digits
	return PHONE_FORMAT_PATTERN.test(normalized);
}

function extractPhoneFromStringCell(cellData: string): string {
	return cellData;
}

function extractPhoneFromObjectCell(data: Record<string, unknown>): string {
	if (data.phone && typeof data.phone === "string") {
		return data.phone;
	}
	if (data.displayPhone && typeof data.displayPhone === "string") {
		return data.displayPhone;
	}
	if (data.data && typeof data.data === "object") {
		const nestedData = data.data as Record<string, unknown>;
		if (nestedData.phone && typeof nestedData.phone === "string") {
			return nestedData.phone;
		}
	}
	return "";
}

/**
 * Extract phone number from Glide cell data
 * Handles various cell formats and ensures proper normalization
 *
 * @param cellData - Cell data that might contain phone information
 * @returns Normalized phone number for backend use
 */
export function extractPhoneFromCellData(cellData: unknown): string {
	if (!cellData) {
		return "";
	}

	if (typeof cellData === "string") {
		return normalizePhoneForStorage(extractPhoneFromStringCell(cellData));
	}

	if (cellData && typeof cellData === "object") {
		const data = cellData as Record<string, unknown>;
		const phone = extractPhoneFromObjectCell(data);
		return normalizePhoneForStorage(phone);
	}

	return "";
}

/**
 * Alias for normalizePhoneForStorage for backward compatibility
 */
export const normalizePhoneNumber = normalizePhoneForStorage;
