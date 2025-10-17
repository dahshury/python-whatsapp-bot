import type { Theme } from "@glideapps/glide-data-grid";

export function resolveGridTheme(
	externalTheme: Partial<Theme> | undefined,
	isDarkMode: boolean,
	internalTheme: Theme,
	iconColor: string
): {
	theme: Partial<Theme>;
	isUsingExternalTheme: boolean;
	actualIconColor: string;
} {
	const theme: Partial<Theme> =
		externalTheme ?? (internalTheme as Partial<Theme>);
	const isUsingExternalTheme = Boolean(externalTheme);
	let actualIconColor: string;
	if (isUsingExternalTheme) {
		actualIconColor = isDarkMode ? "#e8e8e8" : "#000000";
	} else {
		actualIconColor = iconColor;
	}
	return { theme, isUsingExternalTheme, actualIconColor };
}
