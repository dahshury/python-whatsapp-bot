'use client'

import { useEffect } from 'react'

/**
 * Suppresses ResizeObserver loop errors that occur when ResizeObserver callbacks
 * trigger DOM mutations that cause additional resize observations.
 * This is a harmless browser warning that doesn't affect functionality.
 * The error typically occurs when UI libraries use ResizeObserver internally.
 */
export function SuppressResizeObserverWarnings() {
	useEffect(() => {
		const errorHandler = (event: ErrorEvent) => {
			// Suppress ResizeObserver loop errors
			if (
				event.message?.includes('ResizeObserver loop') ||
				event.message?.includes(
					'ResizeObserver loop completed with undelivered notifications'
				)
			) {
				event.preventDefault()
				event.stopPropagation()
				return false
			}
			return
		}

		// Handle unhandled errors
		window.addEventListener('error', errorHandler, true)

		// Handle unhandled promise rejections that might contain ResizeObserver errors
		const rejectionHandler = (event: PromiseRejectionEvent) => {
			const reason = event.reason
			if (
				typeof reason === 'string' &&
				(reason.includes('ResizeObserver loop') ||
					reason.includes(
						'ResizeObserver loop completed with undelivered notifications'
					))
			) {
				event.preventDefault()
			}
		}

		window.addEventListener('unhandledrejection', rejectionHandler)

		return () => {
			window.removeEventListener('error', errorHandler, true)
			window.removeEventListener('unhandledrejection', rejectionHandler)
		}
	}, [])

	return null
}
