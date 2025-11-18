'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

type GridPortalContextType = {
	portalContainer: HTMLElement | null
}

const GridPortalContext = createContext<GridPortalContextType>({
	portalContainer: null,
})

export const useGridPortal = () => {
	const context = useContext(GridPortalContext)
	const [portalElement, setPortalElement] = useState<HTMLElement | null>(null)

	useEffect(() => {
		const findPortal = () => {
			// Prefer fullscreen overlay portal when present, then dialog overlay portal
			if (typeof document !== 'undefined') {
				const fullscreenOverlay = document.getElementById(
					'grid-fullscreen-overlay-portal'
				)
				if (fullscreenOverlay) {
					return fullscreenOverlay
				}

				const dialogOverlay = document.getElementById('dialog-overlay-portal')
				if (dialogOverlay) {
					return dialogOverlay
				}
			}
			// Fallback to provided container or document.body
			return (
				context.portalContainer ||
				(typeof document !== 'undefined' ? document.body : null)
			)
		}

		// Initial check
		setPortalElement(findPortal())

		// Set up a MutationObserver to watch for portal creation
		if (typeof document !== 'undefined') {
			const observer = new MutationObserver(() => {
				setPortalElement(findPortal())
			})

			observer.observe(document.body, {
				childList: true,
				subtree: false,
			})

			return () => observer.disconnect()
		}
		return
	}, [context.portalContainer])

	return portalElement
}

type GridPortalProviderProps = {
	children: React.ReactNode
	container?: HTMLElement | null
}

export function GridPortalProvider({
	children,
	container,
}: GridPortalProviderProps) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null
	)

	useEffect(() => {
		if (container) {
			setPortalContainer(container)
			return
		}
		if (typeof document !== 'undefined') {
			setPortalContainer(document.body)
		}
	}, [container])

	return (
		<GridPortalContext.Provider value={{ portalContainer }}>
			{children}
		</GridPortalContext.Provider>
	)
}
