import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useSettings } from '@shared/libs/state/settings-context'
import { createGlideTheme } from '@/shared/libs/data-grid/components/utils/streamlitGlideTheme'

export function useGridTheme(): { gridTheme: ReturnType<typeof createGlideTheme> } {
	const { theme: appTheme } = useTheme()
	const { theme: _styleTheme } = useSettings()
	const isDarkMode = appTheme === 'dark'
	const [gridTheme, setGridTheme] = useState(() => createGlideTheme(isDarkMode ? 'dark' : 'light'))

	useEffect(() => {
		try {
			setGridTheme(createGlideTheme(isDarkMode ? 'dark' : 'light'))
			setTimeout(() => {
				try { setGridTheme(createGlideTheme(isDarkMode ? 'dark' : 'light')) } catch {}
			}, 50)
		} catch {}
	}, [isDarkMode])

	useEffect(() => {
		if (typeof window === 'undefined') return
		const el = document.documentElement
		let prev = el.className
		const schedule = () => {
			try {
				setTimeout(() => {
					const dark = el.classList.contains('dark')
					setGridTheme(createGlideTheme(dark ? 'dark' : 'light'))
				}, 50)
			} catch {}
		}
		const mo = new MutationObserver(() => {
			if (el.className !== prev) {
				prev = el.className
				schedule()
			}
		})
		try { mo.observe(el, { attributes: true, attributeFilter: ['class'] }) } catch {}
		return () => { try { mo.disconnect() } catch {} }
	}, [])

	return { gridTheme }
}


