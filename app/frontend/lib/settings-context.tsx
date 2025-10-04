"use client";
import React from "react";

// Style theme used for UI accent themes (e.g., "theme-default", "theme-claude").
// This is intentionally separate from color scheme (light/dark/system), which is handled by next-themes.
export type Theme = string;
export interface SettingsState {
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
}

const SettingsContext = React.createContext<SettingsState | undefined>(
	undefined,
);

const SettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
	const [theme, setTheme] = React.useState<Theme>(() => {
		if (typeof window !== "undefined") {
			const storedStyleTheme = localStorage.getItem(
				"styleTheme",
			) as Theme | null;
			if (storedStyleTheme) return storedStyleTheme;
			const legacyTheme = localStorage.getItem("theme");
			if (legacyTheme?.startsWith("theme-")) {
				try {
					localStorage.setItem("styleTheme", legacyTheme);
				} catch {}
				return legacyTheme as Theme;
			}
		}
		return "theme-default";
	});
	const [freeRoam, setFreeRoam] = React.useState<boolean>(false);
	const [showDualCalendar, setShowDualCalendar] =
		React.useState<boolean>(false);
	const [showToolCalls, setShowToolCalls] = React.useState<boolean>(true);
	const [chatMessageLimit, setChatMessageLimit] = React.useState<number>(50);

	// Load persisted non-theme settings on mount
	React.useEffect(() => {
		if (typeof window === "undefined") return;
		const storedFreeRoam = localStorage.getItem("freeRoam");
		if (storedFreeRoam != null) setFreeRoam(storedFreeRoam === "true");
		const storedDual = localStorage.getItem("showDualCalendar");
		if (storedDual != null) setShowDualCalendar(storedDual === "true");
		const storedToolCalls = localStorage.getItem("showToolCalls");
		if (storedToolCalls != null) setShowToolCalls(storedToolCalls === "true");
		const storedLimit = localStorage.getItem("chatMessageLimit");
		if (storedLimit != null) setChatMessageLimit(Number(storedLimit));
	}, []);

	// Persist style theme only; dark/light is managed by next-themes with its own storage key
	React.useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem("styleTheme", theme);
		} catch {}
	}, [theme]);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem("freeRoam", String(freeRoam));
	}, [freeRoam]);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem("showDualCalendar", String(showDualCalendar));
	}, [showDualCalendar]);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem("showToolCalls", String(showToolCalls));
	}, [showToolCalls]);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		localStorage.setItem("chatMessageLimit", String(chatMessageLimit));
	}, [chatMessageLimit]);

	const value = React.useMemo<SettingsState>(
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
		}),
		[theme, freeRoam, showDualCalendar, showToolCalls, chatMessageLimit],
	);
	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	);
};

function useSettings(): SettingsState {
	const ctx = React.useContext(SettingsContext);
	if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
	return ctx;
}

export { SettingsProvider, useSettings };
