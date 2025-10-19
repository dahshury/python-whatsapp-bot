import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type LanguageStoreState = {
	locale: string;
	isLocalized: boolean;
	setLocale: (locale: string) => void;
	setUseLocalizedText: (useLocalized: boolean) => void;
};

export const useLanguageStore = create<LanguageStoreState>()(
	persist(
		(set, get) => ({
			locale: "en",
			isLocalized: false,
			setLocale: (locale) => set({ locale, isLocalized: locale !== "en" }),
			setUseLocalizedText: (useLocalized) => {
				const currentLocale = get().locale;
				if (useLocalized) {
					set({
						locale: currentLocale !== "en" ? currentLocale : "ar",
						isLocalized: true,
					});
					return;
				}
				set({ locale: "en", isLocalized: false });
			},
		}),
		{
			name: "language-store-v1",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({ locale: state.locale }),
			migrate: (persisted) => {
				const out =
					(persisted as Partial<Pick<LanguageStoreState, "locale">>) || {};
				const locale = out?.locale ?? "en";
				return {
					locale,
					isLocalized: locale !== "en",
				};
			},
		}
	)
);
