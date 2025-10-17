import { useMemo } from "react";
import {
	calculateContrastRatio,
	resolveCssVariableToHex,
} from "../components/utils/color-utils";
import { createGlideTheme } from "../components/utils/streamlit-glide-theme";

export type ExcalidrawThemeColors = {
	bgCell: string;
	stroke: string;
};

/**
 * Hook that derives theme colors for the Excalidraw editor
 * Calculates background and stroke colors based on current theme
 * and WCAG contrast requirements
 */
export function useExcalidrawTheme(): ExcalidrawThemeColors {
	return useMemo(() => {
		try {
			const isDark =
				typeof document !== "undefined" &&
				document?.documentElement?.classList?.contains?.("dark") === true;
			const t = createGlideTheme(isDark ? "dark" : "light");
			const bg = resolveCssVariableToHex(
				"--gdg-bg-cell",
				String(((t as { bgCell?: unknown }).bgCell as string) || "#ffffff")
			);

			// Force a black/white stroke for maximum contrast, independent of theme tokens
			const black = "#000000";
			const white = "#ffffff";
			const contrastBlack = calculateContrastRatio(bg, black);
			const contrastWhite = calculateContrastRatio(bg, white);
			const best = contrastBlack >= contrastWhite ? black : white;

			return { bgCell: bg, stroke: best };
		} catch {
			// Failed to derive theme colors, use defaults
			return { bgCell: "#ffffff", stroke: "#111827" };
		}
	}, []);
}
