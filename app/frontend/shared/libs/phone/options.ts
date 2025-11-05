import type * as RPNInput from "react-phone-number-input";
import {
  getCountryCallingCode,
  parsePhoneNumber,
} from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";
import { i18n } from "@/shared/libs/i18n";
import { DEFAULT_COUNTRY } from "@/shared/libs/phone/config";
import { getCountryLabel } from "@/shared/libs/phone/countries";
import { convertZeroZeroToPlus } from "@/shared/libs/utils/phone-utils";

export function createNewPhoneOption(
  phoneNumber: string,
  selectedCountry: RPNInput.Country | undefined,
  isLocalized?: boolean
): PhoneOption {
  let formattedNumber = convertZeroZeroToPlus((phoneNumber || "").trim());
  if (!formattedNumber.startsWith("+")) {
    try {
      const selected = selectedCountry || (DEFAULT_COUNTRY as RPNInput.Country);
      const cc = getCountryCallingCode(selected);
      const digits = formattedNumber.replace(/\D/g, "");
      formattedNumber = cc ? `+${cc}${digits}` : `+${digits}`;
    } catch {
      const digits = formattedNumber.replace(/\D/g, "");
      formattedNumber = `+${digits}`;
    }
  }

  try {
    const parsed = parsePhoneNumber(formattedNumber);
    if (parsed) {
      formattedNumber = parsed.formatInternational();
    }
  } catch {
    // Ignore parsing errors - use formattedNumber as-is
  }

  const country = selectedCountry || (DEFAULT_COUNTRY as RPNInput.Country);
  const label = getCountryLabel(country);

  return {
    number: formattedNumber,
    name: i18n.getMessage("phone_new_number_label", !!isLocalized),
    country,
    label,
    id: `new-${Date.now()}`,
  };
}
