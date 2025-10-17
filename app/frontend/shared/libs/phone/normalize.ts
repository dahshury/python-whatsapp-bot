import { convertZeroZeroToPlus } from "@shared/libs/utils/phone-utils";
import { parsePhoneNumber } from "react-phone-number-input";

export function toE164(input: string): string {
	try {
		let s = String(input || "").trim();
		if (!s) {
			return "";
		}
		s = convertZeroZeroToPlus(s);
		const approx = s.replace(/[^\d+]/g, "");
		try {
			const parsed = parsePhoneNumber(approx);
			if (parsed?.number) {
				return parsed.number;
			}
		} catch {
			// parsePhoneNumber may throw; continue with fallback parsing
		}
		const digits = approx.replace(/\D/g, "");
		return digits ? `+${digits}` : "";
	} catch {
		return String(input || "");
	}
}
