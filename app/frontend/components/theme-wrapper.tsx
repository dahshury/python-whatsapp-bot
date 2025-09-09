"use client";

import { useLayoutEffect } from "react";
import { useSettings } from "@/lib/settings-context";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
	const { theme } = useSettings();

	useLayoutEffect(() => {
		// Remove all theme classes
		document.documentElement.classList.forEach((className) => {
			if (className.startsWith("theme-")) {
				document.documentElement.classList.remove(className);
			}
		});

		// Add the selected theme class
		if (theme) {
			document.documentElement.classList.add(theme);
		}
	}, [theme]);

	return <>{children}</>;
}
