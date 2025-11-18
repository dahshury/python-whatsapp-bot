import { useEffect, useState } from 'react'
import type { NavigationUseCase } from '../usecase/navigation.usecase'

export const createUseNavigationView = (nav: NavigationUseCase) => () => {
	const [view, setView] = useState<string>(nav.getView())
	useEffect(() => {
		const onNav = (e: Event) => {
			try {
				const v = (e as CustomEvent).detail?.view as string
				if (v) {
					setView(v)
				}
			} catch {
				// Silently ignore errors in navigation event handler to prevent UI disruption
			}
		}
		window.addEventListener('nav:view', onNav as EventListener)
		return () => window.removeEventListener('nav:view', onNav as EventListener)
	}, [])
	return { view, setView: nav.setView } as const
}
