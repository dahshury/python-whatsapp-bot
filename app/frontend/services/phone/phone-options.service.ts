import { i18n } from "@shared/libs/i18n";
import { DEFAULT_COUNTRY } from "@shared/libs/phone/config";
import { getCountryLabel } from "@shared/libs/phone/countries";
import {
	convertZeroZeroToPlus,
	getCountryFromPhone,
} from "@shared/libs/utils/phone-utils";
import type * as RPNInput from "react-phone-number-input";
import {
	getCountryCallingCode,
	parsePhoneNumber,
} from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";

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
		// Fallback if international formatting fails, keep the formatted number as-is
	}

	const country =
		selectedCountry ||
		(getCountryFromPhone(formattedNumber) as RPNInput.Country) ||
		(DEFAULT_COUNTRY as RPNInput.Country);
	const label = getCountryLabel(country, isLocalized);

	return {
		number: formattedNumber,
		name: i18n.getMessage("phone_new_number_label", !!isLocalized),
		country,
		label,
		id: `new-${Date.now()}`,
	};
}

export function findPhoneOptionByNumber(
	options: PhoneOption[],
	number: string
) {
	return options.find((opt) => opt.number === number);
}

export function getDisplayNameOrFallback(
	number: string,
	options: PhoneOption[],
	isLocalized: boolean
): string {
	const match = findPhoneOptionByNumber(options, number);
	return match?.name || i18n.getMessage("phone_unknown_label", !!isLocalized);
}

/**
 * Determines if a phone option name represents an unknown/unregistered customer.
 * Handles various variants like "Unknown", "Unknown Customer", localized labels,
 * and empty/whitespace-only names.
 */
export function isUnknownName(
	name: string | undefined,
	isLocalized: boolean
): boolean {
	const raw = String(name || "").trim();
	if (!raw) {
		return true;
	}
	const lower = raw.toLowerCase();
	const unknownI18n = i18n
		.getMessage("phone_unknown_label", !!isLocalized)
		.toLowerCase();
	// Common variants
	const variants = new Set<string>([
		"unknown",
		"unknown customer",
		unknownI18n,
	]);
	return variants.has(lower);
}
