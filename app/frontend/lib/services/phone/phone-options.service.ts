import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode, parsePhoneNumber } from "react-phone-number-input";
import { getCountryLabel } from "@/lib/phone/countries";
import { convertZeroZeroToPlus, getCountryFromPhone } from "@/lib/utils/phone-utils";
import type { PhoneOption } from "@/types/phone";
import { i18n } from "@/lib/i18n";
import { DEFAULT_COUNTRY } from "@/lib/phone/config";

export function createNewPhoneOption(
	phoneNumber: string,
	selectedCountry: RPNInput.Country | undefined,
    isLocalized?: boolean,
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
		if (parsed) formattedNumber = parsed.formatInternational();
	} catch {}

	const country =
		selectedCountry || (getCountryFromPhone(formattedNumber) as RPNInput.Country) || (DEFAULT_COUNTRY as RPNInput.Country);
	const label = getCountryLabel(country);

	return {
		number: formattedNumber,
		name: i18n.getMessage("phone_new_number_label", !!isLocalized),
		country,
		label,
		id: `new-${Date.now()}`,
	};
}


