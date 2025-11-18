'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
	ReservationCacheSynchronizer,
	type ReservationRealtimeEvent,
} from '@/features/calendar/lib/reservation-cache-sync'

export function ReservationCacheBridge() {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}
		const synchronizer = new ReservationCacheSynchronizer(queryClient)
		const handler = (event: Event) => {
			const detail = (event as CustomEvent).detail as
				| ReservationRealtimeEvent
				| undefined
			if (!detail) {
				return
			}
			synchronizer.handle(detail)
		}
		window.addEventListener('realtime', handler as EventListener)
		return () => {
			window.removeEventListener('realtime', handler as EventListener)
			synchronizer.dispose()
		}
	}, [queryClient])

	return null
}
