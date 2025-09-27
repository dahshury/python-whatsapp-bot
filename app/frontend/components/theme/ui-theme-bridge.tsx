"use client";

import { useMemo } from "react";
import { useSettings } from "@/lib/settings-context";
import {
	type UiCompositeRegistryMap,
	UiProvider,
	type UiRegistryMap,
} from "@/lib/ui-registry";
import {
	getUiCompositePresetForTheme,
	getUiPresetForTheme,
} from "@/registry/presets";

export function UiThemeBridge({ children }: { children: React.ReactNode }) {
	const { theme } = useSettings();
	const components = useMemo<UiRegistryMap>(
		() => getUiPresetForTheme(theme),
		[theme],
	);
	const composites = useMemo<UiCompositeRegistryMap>(
		() => getUiCompositePresetForTheme(theme),
		[theme],
	);
	return (
		<UiProvider components={components} composites={composites}>
			{children}
		</UiProvider>
	);
}
