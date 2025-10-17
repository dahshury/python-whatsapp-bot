import { CALLING_CODES_SORTED } from "@shared/libs/phone/countries";
import { getCountryFromPhone } from "@shared/libs/utils/phone-utils";
import type * as RPNInput from "react-phone-number-input";
import {
	getCountryCallingCode,
	parsePhoneNumber,
} from "react-phone-number-input";

export function reformatPhoneForCountry(
	current: string,
	selectedCountry: RPNInput.Country
): string {
	const trimmed = String(current || "").trim();
	if (!trimmed) {
		return templatePhoneForCountry(selectedCountry);
	}
	try {
		const parsed = parsePhoneNumber(trimmed);
		if (parsed) {
			const national = String(parsed.nationalNumber || "");
			const cc = getCountryCallingCode(selectedCountry);
			return national ? `+${cc}${national}` : `+${cc} `;
		}
	} catch {
		// Fallback to manual parsing if libphonenumber parsing fails
	}
	const digits = trimmed.replace(/\D/g, "");
	const matched = CALLING_CODES_SORTED.find((code) => digits.startsWith(code));
	const local = matched ? digits.slice(matched.length) : digits;
	try {
		const cc = getCountryCallingCode(selectedCountry);
		return local ? `+${cc}${local}` : `+${cc} `;
	} catch {
		return `+${local}`;
	}
}

export function templatePhoneForCountry(
	selectedCountry: RPNInput.Country
): string {
	try {
		const cc = getCountryCallingCode(selectedCountry);
		return `+${cc} `;
	} catch {
		return "+";
	}
}

export function inferCountryFromPhone(value: string) {
	try {
		return getCountryFromPhone(value);
	} catch {
		return;
	}
}
