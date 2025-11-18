import { useEffect, useState } from 'react'
import type { SettingsUseCase } from '../usecase/settings.usecase'

export const createUseThemeSetting = (svc: SettingsUseCase) => () => {
	const [theme, setThemeState] = useState<'light' | 'dark'>(svc.getTheme())
	useEffect(() => {
		const onTheme = (e: Event) => {
			try {
				const t = (e as CustomEvent).detail?.theme as 'light' | 'dark'
				if (t) {
					setThemeState(t)
				}
			} catch {
				// Silently ignore errors when handling theme change event (non-critical)
			}
		}
		window.addEventListener('settings:theme', onTheme as EventListener)
		return () =>
			window.removeEventListener('settings:theme', onTheme as EventListener)
	}, [])
	return { theme, setTheme: svc.setTheme } as const
}
