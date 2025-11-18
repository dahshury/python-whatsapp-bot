'use client'

import {
	SpacemanThemeProvider,
	ThemeAnimationType,
} from '@space-man/react-theme-animation'
import { useTheme as useNextThemes } from 'next-themes'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useAppConfigQuery } from '@/features/app-config'
import { filterThemeOptions } from '@/features/settings/settings/theme-data'
import { useSettingsStore } from '@/infrastructure/store/app-store'

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
	children: React.ReactNode
}) {
	const { resolvedTheme, theme: nextTheme } = useNextThemes()
	const { theme: styleTheme } = useSettingsStore()
	const { data: appConfig } = useAppConfigQuery()

	// Ensure we always have a valid config (fallback to all themes if query hasn't loaded)
	const availableThemes = appConfig?.availableThemes ?? null

	// Track mounted state to avoid hydration issues
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	// Sync current state from our existing providers
	const currentTheme = useMemo(() => {
		if (!mounted) {
			return 'system'
		}
		// Use resolvedTheme when available (actual computed theme), fall back to nextTheme
		return (resolvedTheme || nextTheme || 'system') as
			| 'light'
			| 'dark'
			| 'system'
	}, [mounted, resolvedTheme, nextTheme])

	const currentColorTheme = useMemo(
		() => styleTheme || 'theme-default',
		[styleTheme]
	)

	const colorThemes = useMemo(() => {
		const filtered = filterThemeOptions(availableThemes)
		return filtered.map((t) => t.value)
	}, [availableThemes])

	const resolvedColorTheme = useMemo(() => {
		if (!colorThemes.length) {
			return 'theme-default'
		}
		if (colorThemes.includes(currentColorTheme)) {
			return currentColorTheme
		}
		return colorThemes[0] ?? 'theme-default'
	}, [colorThemes, currentColorTheme])

	// Don't render until mounted to avoid hydration mismatch
	if (!mounted) {
		return <>{children}</>
	}

	return (
		<SpacemanThemeProvider
			animationType={ThemeAnimationType.CIRCLE}
			colorThemes={colorThemes}
			defaultColorTheme={resolvedColorTheme}
			defaultTheme={currentTheme}
			duration={600}
			themes={['light', 'dark', 'system']}
		>
			{children}
		</SpacemanThemeProvider>
	)
}
