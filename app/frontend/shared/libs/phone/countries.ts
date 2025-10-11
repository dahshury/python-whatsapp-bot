import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
import countryLabelsAr from "react-phone-number-input/locale/ar.json";
import countryLabelsEn from "react-phone-number-input/locale/en.json";

export const COUNTRY_OPTIONS = [
	{ code: "US", name: "United States", callingCode: "1" },
	{ code: "GB", name: "United Kingdom", callingCode: "44" },
	{ code: "DE", name: "Germany", callingCode: "49" },
	{ code: "FR", name: "France", callingCode: "33" },
	{ code: "JP", name: "Japan", callingCode: "81" },
	{ code: "AU", name: "Australia", callingCode: "61" },
	{ code: "BR", name: "Brazil", callingCode: "55" },
	{ code: "IN", name: "India", callingCode: "91" },
	{ code: "CN", name: "China", callingCode: "86" },
	{ code: "RU", name: "Russia", callingCode: "7" },
	{ code: "CA", name: "Canada", callingCode: "1" },
	{ code: "MX", name: "Mexico", callingCode: "52" },
	{ code: "ES", name: "Spain", callingCode: "34" },
	{ code: "IT", name: "Italy", callingCode: "39" },
	{ code: "NL", name: "Netherlands", callingCode: "31" },
	{ code: "SE", name: "Sweden", callingCode: "46" },
	{ code: "NO", name: "Norway", callingCode: "47" },
	{ code: "DK", name: "Denmark", callingCode: "45" },
	{ code: "FI", name: "Finland", callingCode: "358" },
	{ code: "PL", name: "Poland", callingCode: "48" },
	{ code: "CZ", name: "Czech Republic", callingCode: "420" },
	{ code: "AT", name: "Austria", callingCode: "43" },
	{ code: "CH", name: "Switzerland", callingCode: "41" },
	{ code: "BE", name: "Belgium", callingCode: "32" },
	{ code: "PT", name: "Portugal", callingCode: "351" },
	{ code: "GR", name: "Greece", callingCode: "30" },
	{ code: "HU", name: "Hungary", callingCode: "36" },
	{ code: "TR", name: "Turkey", callingCode: "90" },
	{ code: "ZA", name: "South Africa", callingCode: "27" },
	{ code: "EG", name: "Egypt", callingCode: "20" },
	{ code: "NG", name: "Nigeria", callingCode: "234" },
	{ code: "KE", name: "Kenya", callingCode: "254" },
	{ code: "AE", name: "UAE", callingCode: "971" },
	{ code: "SG", name: "Singapore", callingCode: "65" },
	{ code: "MY", name: "Malaysia", callingCode: "60" },
	{ code: "TH", name: "Thailand", callingCode: "66" },
	{ code: "ID", name: "Indonesia", callingCode: "62" },
	{ code: "PH", name: "Philippines", callingCode: "63" },
	{ code: "VN", name: "Vietnam", callingCode: "84" },
	{ code: "KR", name: "South Korea", callingCode: "82" },
	{ code: "TW", name: "Taiwan", callingCode: "886" },
	{ code: "HK", name: "Hong Kong", callingCode: "852" },
	{ code: "AR", name: "Argentina", callingCode: "54" },
	{ code: "CL", name: "Chile", callingCode: "56" },
	{ code: "CO", name: "Colombia", callingCode: "57" },
	{ code: "PE", name: "Peru", callingCode: "51" },
	{ code: "VE", name: "Venezuela", callingCode: "58" },
	{ code: "UY", name: "Uruguay", callingCode: "598" },
	{ code: "NZ", name: "New Zealand", callingCode: "64" },
	{ code: "IL", name: "Israel", callingCode: "972" },
	{ code: "SA", name: "Saudi Arabia", callingCode: "966" },
	{ code: "PK", name: "Pakistan", callingCode: "92" },
	{ code: "BD", name: "Bangladesh", callingCode: "880" },
	{ code: "LK", name: "Sri Lanka", callingCode: "94" },
	{ code: "MM", name: "Myanmar", callingCode: "95" },
] as const;

export const CALLING_CODE_TO_COUNTRY: Record<string, RPNInput.Country> = (() => {
	const map: Record<string, RPNInput.Country> = {};
	for (const c of COUNTRY_OPTIONS) {
		if (!map[c.callingCode]) map[c.callingCode] = c.code as RPNInput.Country;
	}
	return map;
})();

export const CALLING_CODES_SORTED: string[] = Object.keys(CALLING_CODE_TO_COUNTRY).sort((a, b) => b.length - a.length);

export const getCountryLabel = (countryCode: RPNInput.Country): string => {
	const country = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
	if (country) {
		return `${country.name} (+${country.callingCode})`;
	}
	return `${countryCode} (+${getCountryCallingCode(countryCode)})`;
};

export const getLocalizedCountryOptions = (
	isLocalized: boolean
): ReadonlyArray<{ value: RPNInput.Country; label: string }> => {
	const labels: Record<string, string> = isLocalized
		? (countryLabelsAr as Record<string, string>)
		: (countryLabelsEn as Record<string, string>);
	return COUNTRY_OPTIONS.map((c) => {
		const code = c.code as RPNInput.Country;
		const localizedName = labels[c.code] || c.name;
		return {
			value: code,
			label: `${localizedName} (+${c.callingCode})`,
		};
	});
};
