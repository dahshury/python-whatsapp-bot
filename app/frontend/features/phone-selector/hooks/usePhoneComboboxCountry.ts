import { useCallback } from "react";
import type * as RPNInput from "react-phone-number-input";
import {
  getCountryCallingCode,
  parsePhoneNumber,
} from "react-phone-number-input";
import { CALLING_CODES_SORTED } from "@/shared/libs/phone/countries";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@/shared/validation/phone";

export type UsePhoneComboboxCountryOptions = {
  selectedPhone: string;
  setSelectedPhone: (phone: string) => void;
  uncontrolled: boolean;
  onChange?: (value: string) => void;
  validatePhone?: (phone: string) => { isValid: boolean; error?: string };
};

/**
 * Hook to handle country selection business logic
 */
export function usePhoneComboboxCountry(
  options: UsePhoneComboboxCountryOptions
): {
  handleCountrySelect: (selectedCountry: RPNInput.Country) => void;
} {
  const {
    selectedPhone,
    setSelectedPhone,
    uncontrolled,
    onChange,
    validatePhone,
  } = options;
  // Always call useCallback unconditionally to follow React hooks rules
  const defaultValidatePhone = useCallback(
    (phone: string): { isValid: boolean; error?: string } =>
      validatePhoneNumberSvc(phone),
    []
  );

  const validatePhoneFn = validatePhone || defaultValidatePhone;

  const handleCountrySelect = useCallback(
    (selectedCountry: RPNInput.Country) => {
      // Re-validate current phone number when country changes (no inline errors)
      if (selectedPhone) {
        validatePhoneFn(selectedPhone);
      }

      // If there's a selected phone number, convert it to the new country's format
      if (selectedPhone?.trim()) {
        let updated = false;
        try {
          // Parse the current phone number
          const phoneNumber = parsePhoneNumber(selectedPhone);
          if (phoneNumber) {
            // Get the national (local) number without country code
            const nationalNumber = String(phoneNumber.nationalNumber || "");
            // Format with the new country's calling code
            const newCountryCode = getCountryCallingCode(selectedCountry);
            if (newCountryCode) {
              const newPhoneNumber = nationalNumber
                ? `+${newCountryCode}${nationalNumber}`
                : `+${newCountryCode} `;
              setSelectedPhone(newPhoneNumber);
              if (!uncontrolled && onChange) {
                onChange(newPhoneNumber);
              }
              updated = true;
            }
          }
        } catch {
          // Ignore errors when parsing phone number during country change
        }

        if (!updated) {
          // Fallback: derive local digits by stripping existing calling code prefix
          const digits = String(selectedPhone).replace(/\D/g, "");
          let localDigits = digits;
          const matched = CALLING_CODES_SORTED.find((code) =>
            digits.startsWith(code)
          );
          if (matched) {
            localDigits = digits.slice(matched.length);
          }
          try {
            const newCc = getCountryCallingCode(selectedCountry);
            if (newCc) {
              const newPhoneNumber = localDigits
                ? `+${newCc}${localDigits}`
                : `+${newCc} `;
              setSelectedPhone(newPhoneNumber);
              if (!uncontrolled && onChange) {
                onChange(newPhoneNumber);
              }
            }
          } catch {
            // Ignore errors when getting country calling code during country change
          }
        }
      } else {
        // No phone yet: initialize to +[country code] to keep field non-empty
        try {
          const newCountryCode = getCountryCallingCode(selectedCountry);
          if (newCountryCode) {
            const newPhoneNumber = `+${newCountryCode} `;
            setSelectedPhone(newPhoneNumber);
            if (!uncontrolled && onChange) {
              onChange(newPhoneNumber);
            }
          }
        } catch {
          // Ignore errors when initializing phone number with country code
        }
      }
    },
    [selectedPhone, setSelectedPhone, uncontrolled, onChange, validatePhoneFn]
  );

  return {
    handleCountrySelect,
  };
}
