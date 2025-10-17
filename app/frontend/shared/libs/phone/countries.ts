import isoCountries from "i18n-iso-countries";
import arCountries from "i18n-iso-countries/langs/ar.json" with {
	type: "json",
};
import enCountries from "i18n-iso-countries/langs/en.json" with {
	type: "json",
};
import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";

// Register locales for i18n-iso-countries
isoCountries.registerLocale(enCountries);
isoCountries.registerLocale(arCountries);

// Generate comprehensive COUNTRY_OPTIONS from all ISO countries
const generateCountryOptions = (): Array<{
	code: string;
	name: string;
	callingCode: string;
}> => {
	const countries = isoCountries.getNames("en");
	return Object.entries(countries)
		.sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
		.map(([code, name]) => {
			const callingCode = (() => {
				try {
					return String(getCountryCallingCode(code as RPNInput.Country));
				} catch {
					return null;
				}
			})();
			return {
				code,
				name,
				callingCode: callingCode || "",
			};
		})
		.filter((c) => c.callingCode !== "");
};

export const COUNTRY_OPTIONS = generateCountryOptions();

export const CALLING_CODE_TO_COUNTRY: Record<string, RPNInput.Country> =
	(() => {
		const map: Record<string, RPNInput.Country> = {};
		for (const c of COUNTRY_OPTIONS) {
			if (!map[c.callingCode]) {
				map[c.callingCode] = c.code as RPNInput.Country;
			}
		}
		return map;
	})();

export const CALLING_CODES_SORTED: string[] = Object.keys(
	CALLING_CODE_TO_COUNTRY
).sort((a, b) => b.length - a.length);

export const getCountryLabel = (
	countryCode: RPNInput.Country,
	isLocalized?: boolean
): string => {
	const country = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
	if (country) {
		const locale = isLocalized ? "ar" : "en";
		const countryNames = isoCountries.getNames(locale);
		const localizedName = countryNames[country.code] || country.name;
		return `${localizedName} (+${country.callingCode})`;
	}
	return `${countryCode} (+${getCountryCallingCode(countryCode)})`;
};

export const getLocalizedCountryOptions = (
	isLocalized: boolean
): ReadonlyArray<{ value: RPNInput.Country; label: string }> => {
	const locale = isLocalized ? "ar" : "en";
	const countryNames = isoCountries.getNames(locale);

	return COUNTRY_OPTIONS.map((c) => {
		const localizedName = countryNames[c.code] || c.name;
		return {
			value: c.code as RPNInput.Country,
			label: `${localizedName} (+${c.callingCode})`,
		};
	}).sort((a, b) => a.label.localeCompare(b.label));
};
