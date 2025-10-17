export function useThemeMode(resolvedTheme?: string): "light" | "dark" {
	return resolvedTheme === "dark" ? "dark" : "light";
}
