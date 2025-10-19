"use client";
import {
	type Theme,
	useSettingsStore,
} from "@shared/libs/store/settings-store";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
} from "react";

export type SettingsState = {
	theme: Theme; // style theme class, e.g., "theme-default"
	setTheme: (theme: Theme) => void;
	freeRoam: boolean;
	setFreeRoam: (value: boolean) => void;
	showDualCalendar: boolean;
	setShowDualCalendar: (value: boolean) => void;
	showToolCalls: boolean;
	setShowToolCalls: (value: boolean) => void;
	chatMessageLimit: number;
	setChatMessageLimit: (value: number) => void;
	// Whether to send WhatsApp typing indicator while secretary is typing
	sendTypingIndicator: boolean;
	setSendTypingIndicator: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsState | undefined>(undefined);

const SettingsProvider: FC<PropsWithChildren> = ({ children }) => {
	const theme = useSettingsStore((s) => s.theme);
	const setTheme = useSettingsStore((s) => s.setTheme);
	const freeRoam = useSettingsStore((s) => s.freeRoam);
	const setFreeRoam = useSettingsStore((s) => s.setFreeRoam);
	const showDualCalendar = useSettingsStore((s) => s.showDualCalendar);
	const setShowDualCalendar = useSettingsStore((s) => s.setShowDualCalendar);
	const showToolCalls = useSettingsStore((s) => s.showToolCalls);
	const setShowToolCalls = useSettingsStore((s) => s.setShowToolCalls);
	const chatMessageLimit = useSettingsStore((s) => s.chatMessageLimit);
	const setChatMessageLimit = useSettingsStore((s) => s.setChatMessageLimit);
	const sendTypingIndicator = useSettingsStore((s) => s.sendTypingIndicator);
	const setSendTypingIndicator = useSettingsStore(
		(s) => s.setSendTypingIndicator
	);

	// Hydrate theme from legacy key once
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const storedStyleTheme = localStorage.getItem("styleTheme") as Theme | null;
		if (storedStyleTheme) {
			setTheme(storedStyleTheme);
			return;
		}
		const legacyTheme = localStorage.getItem("theme");
		if (legacyTheme?.startsWith("theme-")) {
			try {
				localStorage.setItem("styleTheme", legacyTheme);
			} catch {
				// ignore
			}
			setTheme(legacyTheme as Theme);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [setTheme]);

	// Persist style theme only; dark/light is managed by next-themes with its own storage key
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		try {
			localStorage.setItem("styleTheme", theme);
		} catch {
			// ignore
		}
	}, [theme]);

	const value = useMemo<SettingsState>(
		() => ({
			theme,
			setTheme,
			freeRoam,
			setFreeRoam,
			showDualCalendar,
			setShowDualCalendar,
			showToolCalls,
			setShowToolCalls,
			chatMessageLimit,
			setChatMessageLimit,
			sendTypingIndicator,
			setSendTypingIndicator,
		}),
		[
			theme,
			setTheme,
			freeRoam,
			setFreeRoam,
			showDualCalendar,
			setShowDualCalendar,
			showToolCalls,
			setShowToolCalls,
			chatMessageLimit,
			setChatMessageLimit,
			sendTypingIndicator,
			setSendTypingIndicator,
		]
	);
	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	);
};

function useSettings(): SettingsState {
	const ctx = useContext(SettingsContext);
	if (!ctx) {
		throw new Error("useSettings must be used within SettingsProvider");
	}
	return ctx;
}

export { SettingsProvider, useSettings };
export type { Theme } from "@shared/libs/store/settings-store";
