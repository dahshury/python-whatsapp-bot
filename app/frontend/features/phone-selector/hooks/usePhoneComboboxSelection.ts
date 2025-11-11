import { useCallback } from "react";
import type * as RPNInput from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";
import { createNewPhoneOption as createNewPhoneOptionSvc } from "@/shared/libs/phone/phone-options";
import { getCountryFromPhone } from "@/shared/libs/utils/phone-utils";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@/shared/validation/phone";

/**
 * Normalizes phone number for comparison by removing spaces, dashes, and plus signs
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-+]/g, "").trim();
}

export type UsePhoneComboboxSelectionOptions = {
  selectedPhone: string;
  setSelectedPhone: (phone: string) => void;
  phoneOptions: PhoneOption[];
  uncontrolled: boolean;
  onChange?: (value: string) => void;
  onCustomerSelect?: (phone: string, customerName: string) => void;
  onCountryChange?: (country: RPNInput.Country) => void;
  setIsPhoneOpen?: (open: boolean) => void;
  setPhoneSearch?: (search: string) => void;
  selectedCountry?: RPNInput.Country;
  isLocalized?: boolean;
  validatePhone?: (phone: string) => { isValid: boolean; error?: string };
};

/**
 * Hook to handle phone selection business logic
 */
export function usePhoneComboboxSelection(
  options: UsePhoneComboboxSelectionOptions
): {
  handlePhoneSelectControlled: (phoneNumber: string) => void;
  handleCreateNewPhone: (phoneNumber: string) => void;
  handlePhoneSelectInternal: (phoneNumber: string) => void;
  createNewPhoneOption: (phoneNumber: string) => PhoneOption;
} {
  const {
    selectedPhone: _selectedPhone,
    setSelectedPhone,
    phoneOptions,
    uncontrolled,
    onChange,
    onCustomerSelect,
    onCountryChange,
    setIsPhoneOpen,
    setPhoneSearch,
    selectedCountry,
    isLocalized,
    validatePhone,
  } = options;
  // Always call useCallback unconditionally to follow React hooks rules
  const defaultValidatePhone = useCallback(
    (phone: string): { isValid: boolean; error?: string } =>
      validatePhoneNumberSvc(phone),
    []
  );

  const validatePhoneFn = validatePhone || defaultValidatePhone;

  // Create a new phone number option via service
  const createNewPhoneOption = useCallback(
    (phoneNumber: string): PhoneOption => {
      // Validate but do not block creation in UI
      validatePhoneFn(phoneNumber);
      return createNewPhoneOptionSvc(
        phoneNumber,
        selectedCountry,
        isLocalized ?? false
      );
    },
    [selectedCountry, isLocalized, validatePhoneFn]
  );

  // Handle phone selection with different behavior for controlled vs uncontrolled
  const handlePhoneSelectInternal = useCallback(
    (phoneNumber: string) => {
      // Validate the phone number (suppress inline errors)
      validatePhoneFn(phoneNumber);

      setSelectedPhone(phoneNumber);
      if (!uncontrolled && onChange) {
        onChange(phoneNumber);
      }
      if (setPhoneSearch) {
        setPhoneSearch("");
      }
      if (setIsPhoneOpen) {
        setIsPhoneOpen(false);
      }
    },
    [
      validatePhoneFn,
      setSelectedPhone,
      uncontrolled,
      onChange,
      setPhoneSearch,
      setIsPhoneOpen,
    ]
  );

  // Handle creating and selecting a new phone number
  const handleCreateNewPhone = useCallback(
    (phoneNumber: string) => {
      const newOption = createNewPhoneOption(phoneNumber);
      if (newOption) {
        handlePhoneSelectInternal(newOption.number);
      }
    },
    [createNewPhoneOption, handlePhoneSelectInternal]
  );

  // For controlled mode, call onChange immediately when user selects
  const handlePhoneSelectControlled = useCallback(
    (phoneNumber: string) => {
      // Normalize phone number for comparison (remove + and spaces)
      const normalizedPhone = normalizePhone(phoneNumber);

      // Find the customer data for auto-fill (normalize both sides for comparison)
      const selectedCustomer = phoneOptions.find(
        (option) => normalizePhone(option.number) === normalizedPhone
      );

      // When selecting an existing option, adapt country to the selected number
      if (onCountryChange) {
        try {
          const inferred = getCountryFromPhone(phoneNumber);
          if (inferred) {
            onCountryChange(inferred);
          }
        } catch {
          // Ignore errors when inferring country from phone number during selection
        }
      }
      // Trigger customer auto-fill if we have a real customer name
      if (
        onCustomerSelect &&
        selectedCustomer &&
        selectedCustomer.name !== "New Phone Number" &&
        selectedCustomer.name !== "Unknown Customer"
      ) {
        onCustomerSelect(phoneNumber, selectedCustomer.name);
      }

      if (!uncontrolled && onChange) {
        // Update local state immediately for better UX (optimistic update)
        // The parent will update the value prop which will sync via useEffect
        setSelectedPhone(phoneNumber);
        // Use the customer's phone format if found, otherwise use the normalized phone number
        // This ensures the format matches what's used in conversation keys
        const phoneForOnChange = selectedCustomer?.number || normalizedPhone;
        onChange(phoneForOnChange);
        if (setIsPhoneOpen) {
          setIsPhoneOpen(false);
        }
      } else {
        handlePhoneSelectInternal(phoneNumber);
      }
    },
    [
      phoneOptions,
      onCountryChange,
      onCustomerSelect,
      uncontrolled,
      onChange,
      setSelectedPhone,
      setIsPhoneOpen,
      handlePhoneSelectInternal,
    ]
  );

  return {
    handlePhoneSelectControlled,
    handleCreateNewPhone,
    handlePhoneSelectInternal,
    createNewPhoneOption,
  };
}
