"use client";

import { useSettings } from "@shared/libs/state/settings-context";
import { useTheme as useNextThemes } from "next-themes";
import { useEffect, useLayoutEffect } from "react";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
	const { theme } = useSettings();
	const { resolvedTheme, theme: nextTheme } = useNextThemes();

	useLayoutEffect(() => {
		// Remove all theme classes
		for (const className of Array.from(document.documentElement.classList)) {
			if (className.startsWith("theme-")) {
				document.documentElement.classList.remove(className);
			}
		}

		// Add the selected theme class
		if (theme) {
			document.documentElement.classList.add(theme);
		}

		// Ensure light/dark mode remains consistent with next-themes
		// Prefer explicit selection over resolved system mode
		const desiredMode = (nextTheme && nextTheme !== "system" ? nextTheme : resolvedTheme) as
			| "light"
			| "dark"
			| "system"
			| undefined;
		// Ensure 'dark' is controlled on html only; remove from body to keep selectors consistent
		document.body.classList.remove("dark");
		if (desiredMode === "dark") {
			document.documentElement.classList.add("dark");
		} else if (desiredMode === "light") {
			document.documentElement.classList.remove("dark");
		}
	}, [theme, resolvedTheme, nextTheme]);

	// Defensive guard: if user explicitly chose light, prevent any late togglers from adding 'dark'
	useEffect(() => {
		const explicitMode = nextTheme && nextTheme !== "system" ? nextTheme : undefined;
		if (explicitMode !== "light") return;

		// Immediate and next frame enforcement
		document.documentElement.classList.remove("dark");
		const raf1 = requestAnimationFrame(() => {
			document.documentElement.classList.remove("dark");
		});
		const raf2 = requestAnimationFrame(() => {
			document.documentElement.classList.remove("dark");
		});

		// Observe class changes and strip 'dark' if re-added
		const observer = new MutationObserver(() => {
			if (document.documentElement.classList.contains("dark")) {
				document.documentElement.classList.remove("dark");
			}
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			cancelAnimationFrame(raf1);
			cancelAnimationFrame(raf2);
			observer.disconnect();
		};
	}, [nextTheme]);

	// Symmetric guard: if user explicitly chose dark, ensure 'dark' stays present
	useEffect(() => {
		const explicitMode = nextTheme && nextTheme !== "system" ? nextTheme : undefined;
		if (explicitMode !== "dark") return;

		// Immediate assert of dark class
		document.documentElement.classList.add("dark");
		const raf1 = requestAnimationFrame(() => {
			document.documentElement.classList.add("dark");
		});
		const raf2 = requestAnimationFrame(() => {
			document.documentElement.classList.add("dark");
		});

		// Observe class changes and re-add 'dark' if removed by any late listeners
		const observer = new MutationObserver(() => {
			if (!document.documentElement.classList.contains("dark")) {
				document.documentElement.classList.add("dark");
			}
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			cancelAnimationFrame(raf1);
			cancelAnimationFrame(raf2);
			observer.disconnect();
		};
	}, [nextTheme]);

	return <>{children}</>;
}
