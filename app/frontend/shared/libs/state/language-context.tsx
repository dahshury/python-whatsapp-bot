"use client";
import * as React from "react";

export interface LanguageState {
	locale: string;
	isLocalized: boolean;
	setLocale: (locale: string) => void;
	setUseLocalizedText: (useLocalized: boolean) => void;
}

const LanguageContext = React.createContext<LanguageState | undefined>(undefined);

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const [locale, setLocale] = React.useState<string>("en");
	const isLocalized = locale !== "en";

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		const stored = localStorage.getItem("locale");
		if (stored) {
			setLocale(stored);
			return;
		}
		// Backward compatibility: migrate old isLocalized flag to locale
		const legacyIsLocalized = localStorage.getItem("isLocalized");
		if (legacyIsLocalized === "true") {
			setLocale("ar");
		}
	}, []);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem("locale", locale);
		// Do not toggle document direction; keep layout LTR while translating text in-place
	}, [locale]);

	const setUseLocalizedText = React.useCallback((useLocalized: boolean) => {
		setLocale((prev) => {
			if (useLocalized) {
				// If already non-English, keep current; otherwise switch to Arabic for now
				return prev !== "en" ? prev : "ar";
			}
			// Switch to English
			return "en";
		});
	}, []);

	const value = React.useMemo<LanguageState>(
		() => ({ locale, isLocalized, setLocale, setUseLocalizedText }),
		[locale, isLocalized, setUseLocalizedText]
	);
	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageState {
	const ctx = React.useContext(LanguageContext);
	if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
	return ctx;
}
