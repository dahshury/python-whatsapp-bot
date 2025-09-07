"use client";

import {
	SpacemanThemeProvider,
	ThemeAnimationType,
} from "@space-man/react-theme-animation";
import { useTheme as useNextThemes } from "next-themes";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { THEME_OPTIONS } from "@/components/settings/theme-data";
import { useSettings } from "@/lib/settings-context";

/**
 * SpacemanThemeBridge
 * - Provides animated theme switching using Spaceman while delegating actual theme state to our existing providers
 * - Syncs Spaceman theme -> next-themes and Spaceman colorTheme -> Settings style theme
 * - Keeps our CSS themes and layout untouched; only supplies animation overlay and centralized state
 * - Fixes persistence by syncing Spaceman state with existing providers instead of fighting them
 */
export function SpacemanThemeBridge({
	children,
}: {
	children: React.ReactNode;
}) {
	const { resolvedTheme, theme: nextTheme } = useNextThemes();
	const { theme: styleTheme } = useSettings();

	// Track mounted state to avoid hydration issues
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Sync current state from our existing providers
	const currentTheme = useMemo(() => {
		if (!mounted) return "system";
		// Use resolvedTheme when available (actual computed theme), fall back to nextTheme
		return (resolvedTheme || nextTheme || "system") as
			| "light"
			| "dark"
			| "system";
	}, [mounted, resolvedTheme, nextTheme]);

	const currentColorTheme = useMemo(() => {
		return styleTheme || "theme-default";
	}, [styleTheme]);

	// Don't render until mounted to avoid hydration mismatch
	if (!mounted) {
		return <>{children}</>;
	}

	return (
		<SpacemanThemeProvider
			defaultTheme={currentTheme}
			defaultColorTheme={currentColorTheme}
			themes={["light", "dark", "system"]}
			colorThemes={THEME_OPTIONS.map((t) => t.value)}
			animationType={ThemeAnimationType.CIRCLE}
			duration={600}
		>
			{children}
		</SpacemanThemeProvider>
	);
}
