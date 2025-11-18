import React from 'react'

export function useGridLifecycle(
	isFullscreen: boolean,
	showColumnMenu: boolean,
	setShowColumnMenu: React.Dispatch<React.SetStateAction<boolean>>
) {
	// lock body scroll when fullscreen
	React.useEffect(() => {
		if (isFullscreen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
	}, [isFullscreen])

	// Close column menu on outside click
	React.useEffect(() => {
		if (!showColumnMenu) {
			return
		}
		const handleClick = (e: MouseEvent) => {
			const menu = document.getElementById('column-menu-popup')
			if (menu && !menu.contains(e.target as Node)) {
				setShowColumnMenu(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [showColumnMenu, setShowColumnMenu])
}
