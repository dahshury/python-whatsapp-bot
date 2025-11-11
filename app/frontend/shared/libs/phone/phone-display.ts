import { i18n } from "@shared/libs/i18n";
import type { PhoneOption } from "@/entities/phone";

/**
 * Normalizes phone number for comparison by removing spaces, dashes, and plus signs
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-+]/g, "").trim();
}

/**
 * Gets the display name for a phone number
 * @param selectedPhone - The selected phone number
 * @param phoneOptions - List of available phone options
 * @param isLocalized - Whether to use localized messages
 * @returns The display name or localized "Unknown Customer" message
 */
export function getPhoneDisplayName(
  selectedPhone: string,
  phoneOptions: PhoneOption[],
  isLocalized: boolean
): string {
  // Normalize phone numbers for comparison
  const normalizedSelected = normalizePhone(selectedPhone);
  const selectedOption = phoneOptions.find(
    (option) => normalizePhone(option.number) === normalizedSelected
  );
  return (
    selectedOption?.name || i18n.getMessage("phone_unknown_label", isLocalized)
  );
}
