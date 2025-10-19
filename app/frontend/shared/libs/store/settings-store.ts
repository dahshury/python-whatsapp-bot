import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = string;

type SettingsStoreState = {
	// State
	theme: Theme;
	freeRoam: boolean;
	showDualCalendar: boolean;
	showToolCalls: boolean;
	chatMessageLimit: number;
	sendTypingIndicator: boolean;
	// Actions
	setTheme: (theme: Theme) => void;
	setFreeRoam: (value: boolean) => void;
	setShowDualCalendar: (value: boolean) => void;
	setShowToolCalls: (value: boolean) => void;
	setChatMessageLimit: (value: number) => void;
	setSendTypingIndicator: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsStoreState>()(
	persist(
		(set, _get) => ({
			theme: "theme-default",
			freeRoam: false,
			showDualCalendar: false,
			showToolCalls: true,
			chatMessageLimit: 50,
			sendTypingIndicator: false,
			setTheme: (theme) => set({ theme }),
			setFreeRoam: (value) => set({ freeRoam: value }),
			setShowDualCalendar: (value) => set({ showDualCalendar: value }),
			setShowToolCalls: (value) => set({ showToolCalls: value }),
			setChatMessageLimit: (value) => set({ chatMessageLimit: value }),
			setSendTypingIndicator: (value) => set({ sendTypingIndicator: value }),
		}),
		{
			name: "settings-store-v1",
			storage: createJSONStorage(() => localStorage),
		}
	)
);
