import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridThemeConfig } from "../core/types";
import { BrowserUtils } from "../utils/browserUtils";

export interface ThemePreferences {
	prefersDarkMode: boolean;
	highContrast: boolean;
	reducedMotion: boolean;
}

const LIGHT_THEME: GridThemeConfig = {
	accentColor: "#0072ce",
	accentFg: "#ffffff",
	bgBubble: "#f0f0f0",
	bgBubbleSelected: "#e0e0e0",
	bgCell: "#ffffff",
	bgCellMedium: "#f9f9f9",
	bgHeader: "#f5f5f5",
	bgHeaderHasFocus: "#e8f4fd",
	bgHeaderHovered: "#ebebeb",
	bgSearchResult: "#fff2cc",
	borderColor: "#e1e1e1",
	drilldownBorder: "#0072ce",
	fgIconHeader: "#666666",
	fontFamily: "system-ui, -apple-system, sans-serif",
	headerFontStyle: "600 14px",
	linkColor: "#0072ce",
	textBubble: "#333333",
	textDark: "#000000",
	textGroupHeader: "#333333",
	textHeader: "#333333",
	textHeaderSelected: "#0072ce",
	textLight: "#666666",
	textMedium: "#444444",
};

const DARK_THEME: GridThemeConfig = {
	accentColor: "#4da6ff",
	accentFg: "#000000",
	bgBubble: "#2a2a2a",
	bgBubbleSelected: "#404040",
	bgCell: "#1a1a1a",
	bgCellMedium: "#242424",
	bgHeader: "#2d2d2d",
	bgHeaderHasFocus: "#1e3a5f",
	bgHeaderHovered: "#3a3a3a",
	bgSearchResult: "#4a4000",
	borderColor: "#404040",
	drilldownBorder: "#4da6ff",
	fgIconHeader: "#cccccc",
	fontFamily: "system-ui, -apple-system, sans-serif",
	headerFontStyle: "600 14px",
	linkColor: "#4da6ff",
	textBubble: "#ffffff",
	textDark: "#ffffff",
	textGroupHeader: "#ffffff",
	textHeader: "#ffffff",
	textHeaderSelected: "#4da6ff",
	textLight: "#cccccc",
	textMedium: "#e0e0e0",
};

const HIGH_CONTRAST_THEME: GridThemeConfig = {
	...LIGHT_THEME,
	accentColor: "#000000",
	bgCell: "#ffffff",
	bgHeader: "#ffffff",
	borderColor: "#000000",
	textDark: "#000000",
	textHeader: "#000000",
	textMedium: "#000000",
};

export function useAdvancedTheming() {
	const [currentTheme, setCurrentTheme] = useState<"light" | "dark" | "auto">(
		"auto",
	);
	const [customTheme, setCustomTheme] = useState<Partial<GridThemeConfig>>({});

	const preferences = useMemo((): ThemePreferences => {
		return {
			prefersDarkMode: window.matchMedia("(prefers-color-scheme: dark)")
				.matches,
			highContrast: window.matchMedia("(prefers-contrast: high)").matches,
			reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
				.matches,
		};
	}, []);

	const effectiveTheme = useMemo((): GridThemeConfig => {
		let baseTheme: GridThemeConfig;

		if (preferences.highContrast) {
			baseTheme = HIGH_CONTRAST_THEME;
		} else if (
			currentTheme === "dark" ||
			(currentTheme === "auto" && preferences.prefersDarkMode)
		) {
			baseTheme = DARK_THEME;
		} else {
			baseTheme = LIGHT_THEME;
		}

		return { ...baseTheme, ...customTheme };
	}, [currentTheme, preferences, customTheme]);

	const setTheme = useCallback((theme: "light" | "dark" | "auto") => {
		setCurrentTheme(theme);
		BrowserUtils.setCookie("theme-preference", theme);
	}, []);

	const updateCustomTheme = useCallback((updates: Partial<GridThemeConfig>) => {
		setCustomTheme((prev) => ({ ...prev, ...updates }));
	}, []);

	const resetTheme = useCallback(() => {
		setCustomTheme({});
		setCurrentTheme("auto");
		BrowserUtils.setCookie("theme-preference", "auto");
	}, []);

	useEffect(() => {
		const savedThemeRaw = BrowserUtils.getCookie("theme-preference");
		const savedTheme = (
			typeof savedThemeRaw === "string" ? savedThemeRaw : null
		) as "light" | "dark" | "auto" | null;
		if (
			savedTheme === "light" ||
			savedTheme === "dark" ||
			savedTheme === "auto"
		) {
			setCurrentTheme(savedTheme);
		}
	}, []);

	useEffect(() => {
		const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const highContrastQuery = window.matchMedia("(prefers-contrast: high)");

		const handleChange = () => {
			// Force re-render when system preferences change
			setCurrentTheme((prev) => prev);
		};

		darkModeQuery.addEventListener("change", handleChange);
		highContrastQuery.addEventListener("change", handleChange);

		return () => {
			darkModeQuery.removeEventListener("change", handleChange);
			highContrastQuery.removeEventListener("change", handleChange);
		};
	}, []);

	return {
		theme: effectiveTheme,
		currentTheme,
		preferences,
		setTheme,
		updateCustomTheme,
		resetTheme,
		isDarkMode:
			currentTheme === "dark" ||
			(currentTheme === "auto" && preferences.prefersDarkMode),
		isHighContrast: preferences.highContrast,
		lightTheme: LIGHT_THEME,
		darkTheme: DARK_THEME,
	};
}

export function useRowHoverEffect(theme: GridThemeConfig) {
	const [hoveredRow, setHoveredRow] = useState<number | undefined>();

	const onItemHovered = useCallback(
		(args: { kind: string; location: [number, number] }) => {
			if (args.kind === "cell") {
				setHoveredRow(args.location[1]);
			} else {
				setHoveredRow(undefined);
			}
		},
		[],
	);

	const getRowThemeOverride = useCallback(
		(row: number) => {
			if (row !== hoveredRow) return undefined;

			return {
				bgCell: theme.bgCellMedium,
				bgCellMedium: theme.bgHeader,
			};
		},
		[hoveredRow, theme.bgCellMedium, theme.bgHeader],
	);

	return {
		hoveredRow,
		onItemHovered,
		getRowThemeOverride,
		setHoveredRow,
	};
}

export function useThemeTransitions(reducedMotion: boolean) {
	const transitionStyle = useMemo(() => {
		if (reducedMotion) {
			return {};
		}

		return {
			transition:
				"background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
		};
	}, [reducedMotion]);

	return { transitionStyle };
}

export function generateThemeVariants(baseTheme: GridThemeConfig): {
	normal: GridThemeConfig;
	hover: GridThemeConfig;
	selected: GridThemeConfig;
	focus: GridThemeConfig;
} {
	return {
		normal: baseTheme,
		hover: {
			...baseTheme,
			bgCell: baseTheme.bgCellMedium,
			bgHeader: baseTheme.bgHeaderHovered,
		},
		selected: {
			...baseTheme,
			bgCell: baseTheme.bgBubbleSelected,
			textHeader: baseTheme.textHeaderSelected,
		},
		focus: {
			...baseTheme,
			bgHeader: baseTheme.bgHeaderHasFocus,
			borderColor: baseTheme.accentColor,
		},
	};
}
