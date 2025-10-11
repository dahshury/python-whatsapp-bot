import { isPossiblePhoneNumber, isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";

export interface PhoneValidationResult {
	isValid: boolean;
	error?: string;
}

export function validatePhoneNumber(phone: string): PhoneValidationResult {
	const trimmed = (phone || "").trim();
	if (!trimmed) return { isValid: true };

	if (!isPossiblePhoneNumber(trimmed)) {
		return { isValid: false, error: "phone_invalid_or_short" };
	}

	if (!isValidPhoneNumber(trimmed)) {
		try {
			const parsed = parsePhoneNumber(trimmed);
			if (parsed) {
				return { isValid: false, error: "phone_invalid_area_or_format" };
			}
		} catch {}
	}

	return { isValid: true };
}
