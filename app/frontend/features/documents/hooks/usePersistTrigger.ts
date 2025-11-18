'use client'

import { useEffect } from 'react'
import { logger } from '@/shared/libs/logger'

const PERSIST_TRIGGER_DEBOUNCE_MS = 280

const logPersistTriggerWarning = (context: string, error: unknown) => {
	logger.warn(`[usePersistTrigger] ${context}`, error)
}

export type UsePersistTriggerParams = {
	persistRow: (triggeredBy?: 'name' | 'age' | 'phone') => Promise<void>
	ignorePersistUntilRef: React.MutableRefObject<number>
	persistTimerRef: React.MutableRefObject<number | null>
}

/**
 * Hook for listening to explicit persist triggers from the grid (name/phone/age edited).
 * Handles debouncing and guards to prevent duplicate persistence operations.
 *
 * @param params - Hook parameters
 */
export function usePersistTrigger(params: UsePersistTriggerParams): void {
	const { persistRow, ignorePersistUntilRef, persistTimerRef } = params

	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as { field?: string }
				const f = String(detail?.field || '')

				// Ignore transient provider-applied changes immediately after switching user
				if (Date.now() < ignorePersistUntilRef.current) {
					return
				}

				// Ignore programmatic grid writes that set a suppression flag
				try {
					const suppressUntil = (
						globalThis as unknown as { __docSuppressPersistUntil?: number }
					).__docSuppressPersistUntil
					if (typeof suppressUntil === 'number' && Date.now() < suppressUntil) {
						return
					}
				} catch (error) {
					logPersistTriggerWarning(
						'Failed to check persist suppression flag',
						error
					)
				}

				if (f === 'age' || f === 'name' || f === 'phone') {
					if (persistTimerRef.current) {
						clearTimeout(persistTimerRef.current)
					}
					persistTimerRef.current = window.setTimeout(() => {
						try {
							// Preserve which field triggered the persist for accurate toast messaging
							persistRow(f as unknown as 'name' | 'age' | 'phone').catch(
								(error) => {
									logPersistTriggerWarning(
										`Failed to persist row triggered by field ${f}`,
										error
									)
								}
							)
						} catch (error) {
							logPersistTriggerWarning(
								`Error during persist row for field ${f}`,
								error
							)
						}
					}, PERSIST_TRIGGER_DEBOUNCE_MS)
				}
			} catch (error) {
				logPersistTriggerWarning('Error handling persist trigger event', error)
			}
		}
		window.addEventListener('doc:persist', handler as EventListener)
		return () =>
			window.removeEventListener('doc:persist', handler as EventListener)
	}, [persistRow, ignorePersistUntilRef, persistTimerRef])
}
