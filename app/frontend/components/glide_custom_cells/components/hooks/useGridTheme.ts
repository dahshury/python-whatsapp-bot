// @ts-nocheck

import type { Theme } from "@glideapps/glide-data-grid";
import React from "react";
import { useTheme as useNextTheme } from "next-themes";
import { createGlideTheme } from "../utils/streamlitGlideTheme";

// Create themes lazily to avoid SSR issues
let darkTheme: Partial<Theme> | null = null;
let lightTheme: Partial<Theme> | null = null;

function getThemes() {
	if (!darkTheme || !lightTheme) {
		darkTheme = createGlideTheme("dark");
		lightTheme = createGlideTheme("light");
	}
	return { darkTheme, lightTheme };
}

export function useGridTheme(disableDocumentClass = false) {
	const [theme, setTheme] = React.useState<Partial<Theme> | null>(null);
	const { resolvedTheme } = useNextTheme();

	// Initialize and sync grid theme with app color scheme (managed by next-themes)
	React.useEffect(() => {
		const { darkTheme, lightTheme } = getThemes();
		let isDark: boolean | undefined = undefined;
		if (resolvedTheme) {
			isDark = resolvedTheme === "dark";
		} else if (typeof document !== "undefined") {
			isDark = document.documentElement.classList.contains("dark");
		} else if (typeof window !== "undefined" && window.matchMedia) {
			isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		setTheme(isDark ? darkTheme : lightTheme);
	}, [resolvedTheme]);


	// Add CSS overrides for dropdown text color based on theme
	React.useEffect(() => {
		if (!theme) return;

		const styleId = "dropdown-theme-override";
		const existingStyle = document.getElementById(styleId);

		if (existingStyle) {
			existingStyle.remove();
		}

		const style = document.createElement("style");
		style.id = styleId;

		const { lightTheme } = getThemes();
		if (theme === lightTheme) {
			// Light theme: ensure dropdown text is black
			style.textContent = `
                .gdg-growing-entry .gdg-input,
                .gdg-growing-entry input,
                .gdg-growing-entry select,
                .gdg-growing-entry textarea,
                [class*="react-select"] .gdg-input,
                [class*="react-select"] input,
                [class*="react-select"] [class*="singleValue"],
                [class*="react-select"] [class*="placeholder"],
                [class*="react-select"] [class*="option"],
                [class*="react-select"] [class*="menu"] {
                color: #000000 !important;
                }
                
                [class*="react-select"] [class*="menu"] {
                background-color: #ffffff !important;
                }
                
                [class*="react-select"] [class*="option"]:hover {
                background-color: #f0f0f0 !important;
                color: #000000 !important;
                }
                
                [class*="react-select"] [class*="option--is-selected"] {
                background-color: #4F5DFF !important;
                color: #ffffff !important;
                }
            `;
		} else {
			// Dark theme: ensure dropdown text is light
			style.textContent = `
                .gdg-growing-entry .gdg-input,
                .gdg-growing-entry input,
                .gdg-growing-entry select,
                .gdg-growing-entry textarea,
                [class*="react-select"] .gdg-input,
                [class*="react-select"] input,
                [class*="react-select"] [class*="singleValue"],
                [class*="react-select"] [class*="placeholder"],
                [class*="react-select"] [class*="option"],
                [class*="react-select"] [class*="menu"] {
                color: #e8e8e8 !important;
                }
                
                [class*="react-select"] [class*="menu"] {
                background-color: #2a2a2a !important;
                }
                
                [class*="react-select"] [class*="option"]:hover {
                background-color: #404040 !important;
                color: #e8e8e8 !important;
                }
                
                [class*="react-select"] [class*="option--is-selected"] {
                background-color: #4F5DFF !important;
                color: #ffffff !important;
                }
            `;
		}

		document.head.appendChild(style);

		return () => {
			const styleToRemove = document.getElementById(styleId);
			if (styleToRemove) {
				styleToRemove.remove();
			}
		};
	}, [theme]); // Re-run when theme changes

	const { darkTheme: dark } = getThemes();
	const iconColor = theme === dark ? "#e8e8e8" : "#5f6368";

	// Return the lazy-loaded themes
	const themes = React.useMemo(() => getThemes(), []);

	return {
		theme: theme || themes.darkTheme,
		setTheme,
		darkTheme: themes.darkTheme,
		lightTheme: themes.lightTheme,
		iconColor,
	};
}
