"use client";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

// Style theme used for UI accent themes (e.g., "theme-default", "theme-claude").
// This is intentionally separate from color scheme (light/dark/system), which is handled by next-themes.
export type Theme = string;

// Default chat message limit
const DEFAULT_CHAT_MESSAGE_LIMIT = 50;

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
	const [theme, setTheme] = useState<Theme>(() => {
		if (typeof window !== "undefined") {
			const storedStyleTheme = localStorage.getItem(
				"styleTheme"
			) as Theme | null;
			if (storedStyleTheme) {
				return storedStyleTheme;
			}
			const legacyTheme = localStorage.getItem("theme");
			if (legacyTheme?.startsWith("theme-")) {
				try {
					localStorage.setItem("styleTheme", legacyTheme);
				} catch {
					// Gracefully handle storage quota or privacy mode errors; fallback to default theme
				}
				return legacyTheme as Theme;
			}
		}
		return "theme-default";
	});
	const [freeRoam, setFreeRoam] = useState<boolean>(false);
	const [showDualCalendar, setShowDualCalendar] = useState<boolean>(false);
	const [showToolCalls, setShowToolCalls] = useState<boolean>(true);
	const [chatMessageLimit, setChatMessageLimit] = useState<number>(
		DEFAULT_CHAT_MESSAGE_LIMIT
	);
	const [sendTypingIndicator, setSendTypingIndicator] =
		useState<boolean>(false);

	// Load persisted non-theme settings on mount
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const storedFreeRoam = localStorage.getItem("freeRoam");
		if (storedFreeRoam != null) {
			setFreeRoam(storedFreeRoam === "true");
		}
		const storedDual = localStorage.getItem("showDualCalendar");
		if (storedDual != null) {
			setShowDualCalendar(storedDual === "true");
		}
		const storedToolCalls = localStorage.getItem("showToolCalls");
		if (storedToolCalls != null) {
			setShowToolCalls(storedToolCalls === "true");
		}
		const storedLimit = localStorage.getItem("chatMessageLimit");
		if (storedLimit != null) {
			setChatMessageLimit(Number(storedLimit));
		}
		const storedTyping = localStorage.getItem("sendTypingIndicator");
		if (storedTyping != null) {
			setSendTypingIndicator(storedTyping === "true");
		}
	}, []);

	// Persist style theme only; dark/light is managed by next-themes with its own storage key
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		try {
			localStorage.setItem("styleTheme", theme);
		} catch {
			// Gracefully handle storage quota or privacy mode errors
		}
	}, [theme]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.setItem("freeRoam", String(freeRoam));
	}, [freeRoam]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.setItem("showDualCalendar", String(showDualCalendar));
	}, [showDualCalendar]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.setItem("showToolCalls", String(showToolCalls));
	}, [showToolCalls]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.setItem("chatMessageLimit", String(chatMessageLimit));
	}, [chatMessageLimit]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		localStorage.setItem("sendTypingIndicator", String(sendTypingIndicator));
	}, [sendTypingIndicator]);

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
			freeRoam,
			showDualCalendar,
			showToolCalls,
			chatMessageLimit,
			sendTypingIndicator,
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
