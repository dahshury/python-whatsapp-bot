'use client'

import { useMemo } from 'react'
import { useSettingsStore } from '@/infrastructure/store/app-store'
import {
	getUiCompositePresetForTheme,
	getUiPresetForTheme,
} from '@/registry/presets'
import {
	type UiCompositeRegistryMap,
	UiProvider,
	type UiRegistryMap,
} from '@/shared/libs/ui-registry'

export function UiThemeBridge({ children }: { children: React.ReactNode }) {
	const { theme } = useSettingsStore()
	const components = useMemo<UiRegistryMap>(
		() => getUiPresetForTheme(theme),
		[theme]
	)
	const composites = useMemo<UiCompositeRegistryMap>(
		() => getUiCompositePresetForTheme(theme),
		[theme]
	)
	return (
		<UiProvider components={components} composites={composites}>
			{children}
		</UiProvider>
	)
}
