"use client";
import { useLanguageStore } from "@shared/libs/store/language-store";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
} from "react";

export type LanguageState = {
	locale: string;
	isLocalized: boolean;
	setLocale: (locale: string) => void;
	setUseLocalizedText: (useLocalized: boolean) => void;
};

const LanguageContext = createContext<LanguageState | undefined>(undefined);

export const LanguageProvider: FC<PropsWithChildren> = ({ children }) => {
	const locale = useLanguageStore((s) => s.locale);
	const isLocalized = useLanguageStore((s) => s.isLocalized);
	const setLocale = useLanguageStore((s) => s.setLocale);
	const setUseLocalizedText = useLanguageStore((s) => s.setUseLocalizedText);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const stored = localStorage.getItem("locale");
		if (stored) {
			setLocale(stored);
			return;
		}
		const legacyIsLocalized = localStorage.getItem("isLocalized");
		if (legacyIsLocalized === "true") {
			setLocale("ar");
		}
	}, [setLocale]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.setItem("locale", locale);
	}, [locale]);

	const value = useMemo<LanguageState>(
		() => ({ locale, isLocalized, setLocale, setUseLocalizedText }),
		[locale, isLocalized, setLocale, setUseLocalizedText]
	);
	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
};

export function useLanguage(): LanguageState {
	const ctx = useContext(LanguageContext);
	if (!ctx) {
		throw new Error("useLanguage must be used within LanguageProvider");
	}
	return ctx;
}
