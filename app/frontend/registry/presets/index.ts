import { neoRegistry } from "@/registry/themes/neo-brutalism/registry";
import { neoCompositeRegistry } from "@/registry/themes/neo-brutalism/registry-composite";
import type {
	UiCompositeRegistryMap,
	UiRegistryMap,
} from "@/shared/libs/ui-registry";

const THEME_PREFIX_REGEX = /^theme-/;

export function getUiPresetForTheme(theme?: string): UiRegistryMap {
	if (!theme) {
		return {};
	}
	const key = theme.replace(THEME_PREFIX_REGEX, "");
	switch (key) {
		case "neo-brutalism":
			return neoRegistry;
		default:
			return {};
	}
}

export function getUiCompositePresetForTheme(
	theme?: string
): UiCompositeRegistryMap {
	if (!theme) {
		return {};
	}
	const key = theme.replace(THEME_PREFIX_REGEX, "");
	switch (key) {
		case "neo-brutalism":
			return neoCompositeRegistry;
		default:
			return {};
	}
}
