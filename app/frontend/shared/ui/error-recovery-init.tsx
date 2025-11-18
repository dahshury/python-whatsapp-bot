'use client'

import { useEffect } from 'react'
import '@shared/libs/error-recovery' // This will auto-setup error handling

export function ErrorRecoveryInit() {
	useEffect(() => {
		// Additional client-side initialization if needed
		if (process.env.NODE_ENV === 'development') {
			// Error recovery system initialized

			// Add global keyboard shortcut for manual recovery (Ctrl+Shift+R)
			const handleKeydown = (event: KeyboardEvent) => {
				if (event.ctrlKey && event.shiftKey && event.key === 'R') {
					event.preventDefault()
					import('@shared/libs/error-recovery')
						.then(({ ErrorRecovery }) => {
							ErrorRecovery.forceRecovery()
						})
						.catch(() => {
							// Error recovery failed - continue with normal operation
						})
				}
			}

			window.addEventListener('keydown', handleKeydown)
			return () => window.removeEventListener('keydown', handleKeydown)
		}
		return
	}, [])

	return null // This component doesn't render anything
}
