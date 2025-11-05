"use client";

import { useSettings } from "@shared/libs/state/settings-context";
import { useMemo } from "react";
import {
  getUiCompositePresetForTheme,
  getUiPresetForTheme,
} from "@/registry/presets";
import {
  type UiCompositeRegistryMap,
  UiProvider,
  type UiRegistryMap,
} from "@/shared/libs/ui-registry";

export function UiThemeBridge({ children }: { children: React.ReactNode }) {
  const { theme } = useSettings();
  const components = useMemo<UiRegistryMap>(
    () => getUiPresetForTheme(theme),
    [theme]
  );
  const composites = useMemo<UiCompositeRegistryMap>(
    () => getUiCompositePresetForTheme(theme),
    [theme]
  );
  return (
    <UiProvider components={components} composites={composites}>
      {children}
    </UiProvider>
  );
}
