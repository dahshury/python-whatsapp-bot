"use client";
import * as React from "react";

export interface LanguageState {
	locale: string;
	isRTL: boolean;
	setLocale: (locale: string) => void;
	setUseArabicText: (useArabic: boolean) => void;
}

const LanguageContext = React.createContext<LanguageState | undefined>(
	undefined,
);

export const LanguageProvider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	const [locale, setLocale] = React.useState<string>("en");
	const isRTL = locale.startsWith("ar") || locale === "fa";

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		const stored = localStorage.getItem("locale");
		if (stored) setLocale(stored);
	}, []);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem("locale", locale);
		localStorage.setItem("isRTL", String(isRTL));
		// Do not toggle document direction; keep layout LTR while translating text in-place
	}, [locale, isRTL]);

	const setUseArabicText = React.useCallback((useArabic: boolean) => {
		setLocale((prev) => {
			if (useArabic) {
				// If already Arabic (ar or fa), keep current; otherwise switch to Arabic
				return prev.startsWith("ar") || prev === "fa" ? prev : "ar";
			}
			// Switch to English for in-place LTR text
			return "en";
		});
	}, []);

	const value = React.useMemo<LanguageState>(
		() => ({ locale, isRTL, setLocale, setUseArabicText }),
		[locale, isRTL, setUseArabicText],
	);
	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
};

export function useLanguage(): LanguageState {
	const ctx = React.useContext(LanguageContext);
	if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
	return ctx;
}
