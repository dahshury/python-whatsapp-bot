import { useEffect, useState } from "react";
import { createGlideTheme } from "@/shared/libs/data-grid/components/utils/streamlit-glide-theme";

const THEME_UPDATE_DELAY_MS = 50;

export function useGlideTheme(isDarkMode: boolean) {
	const [gridTheme, setGridTheme] = useState(() =>
		createGlideTheme(isDarkMode ? "dark" : "light")
	);

	useEffect(() => {
		try {
			setGridTheme(createGlideTheme(isDarkMode ? "dark" : "light"));
			setTimeout(() => {
				try {
					setGridTheme(createGlideTheme(isDarkMode ? "dark" : "light"));
				} catch {
					// Theme update failed; will retry on next mode change
				}
			}, THEME_UPDATE_DELAY_MS);
		} catch {
			// Initial theme setup failed; will retry on next mode change
		}
	}, [isDarkMode]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const el = document.documentElement;
		let previousClassName = el.className;
		const schedule = () => {
			try {
				setTimeout(() => {
					const dark = el.classList.contains("dark");
					setGridTheme(createGlideTheme(dark ? "dark" : "light"));
				}, THEME_UPDATE_DELAY_MS);
			} catch {
				// Theme update scheduling failed; will continue observing
			}
		};
		const observer = new MutationObserver(() => {
			if (el.className !== previousClassName) {
				previousClassName = el.className;
				schedule();
			}
		});
		try {
			observer.observe(el, { attributes: true, attributeFilter: ["class"] });
		} catch {
			// Observer setup failed; theme changes may not be detected
		}
		return () => {
			try {
				observer.disconnect();
			} catch {
				// Observer cleanup failed; will continue on unmount
			}
		};
	}, []);

	return gridTheme;
}
