/**
 * Phone number utilities for consistent formatting
 * Ensures phone numbers are stored in database without + prefix
 * but displayed with + prefix for better UX
 */

// Regex patterns for phone number validation - defined at top level for performance
const PHONE_DIGITS_ONLY_REGEX = /^\d+$/;
const PHONE_VALID_LENGTH_REGEX = /^\d{7,15}$/;
const PHONE_CLEAN_REGEX = /[\s-]/g;
const NON_DIGIT_REGEX = /\D/g;

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
  const NON_DIGIT_EXCEPT_PLUS_REGEX = /[^\d+]/g;
  const cleaned = phone.replace(NON_DIGIT_EXCEPT_PLUS_REGEX, "");

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
    const digitsOnly = normalized.replace(PHONE_CLEAN_REGEX, "");
    if (
      !normalized.startsWith("+") &&
      PHONE_DIGITS_ONLY_REGEX.test(digitsOnly)
    ) {
      normalized = `+${digitsOnly}`;
    }
    const parsed = parsePhoneNumber(normalized);
    if (parsed?.country) {
      return parsed.country as RPNInput.Country;
    }
  } catch {
    // Phone number parsing failed - try fallback method
  }

  // Fallback by calling code prefix if parsing failed
  try {
    let s = String(phoneNumber || "");
    s = convertZeroZeroToPlus(s);
    if (s.startsWith("+")) {
      s = s.slice(1);
    }
    const digits = s.replace(NON_DIGIT_REGEX, "");
    if (digits) {
      const match = CALLING_CODES_SORTED.find((code) =>
        digits.startsWith(code)
      );
      if (match) {
        return CALLING_CODE_TO_COUNTRY[match] as RPNInput.Country;
      }
    }
  } catch {
    // Calling code lookup failed - return default country
  }
  return "US" as RPNInput.Country;
};

/** Format number for clean display without affecting value semantics */
export const formatNumberForDisplay = (phoneNumber: string): string => {
  try {
    let normalized = phoneNumber;
    const digitsOnly = normalized.replace(PHONE_CLEAN_REGEX, "");
    if (
      normalized &&
      !normalized.startsWith("+") &&
      PHONE_DIGITS_ONLY_REGEX.test(digitsOnly)
    ) {
      normalized = `+${digitsOnly}`;
    }
    const parsed = parsePhoneNumber(normalized);
    if (parsed) {
      return parsed.formatInternational();
    }
    return normalized;
  } catch {
    // Phone formatting failed - return original
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
  return PHONE_VALID_LENGTH_REGEX.test(normalized);
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
