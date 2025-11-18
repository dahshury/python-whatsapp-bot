/**
 * WebSocket Cache Invalidation Hook
 *
 * Listens to WebSocket events and invalidates TanStack Query cache
 * for affected calendar periods.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import {
	ReservationCacheSynchronizer,
	type ReservationRealtimeEvent,
} from '../lib/reservation-cache-sync'

/**
 * Hook to integrate WebSocket events with TanStack Query cache invalidation
 */
export function useCalendarWebSocketInvalidation() {
	const queryClient = useQueryClient()
	const synchronizer = useMemo(
		() => new ReservationCacheSynchronizer(queryClient),
		[queryClient]
	)

	useEffect(() => {
		const handler = (ev: Event) => {
			const detail = (ev as CustomEvent).detail as
				| ReservationRealtimeEvent
				| undefined
			const handled = synchronizer.handle(detail)
			if (!handled) {
				synchronizer.invalidateAll()
			}
		}

		window.addEventListener('realtime', handler as EventListener)

		return () => {
			window.removeEventListener('realtime', handler as EventListener)
			synchronizer.dispose()
		}
	}, [synchronizer])
}
