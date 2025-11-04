/**
 * Helper hook to get current period data from TanStack Query cache
 * Used for hover cards and other UI components that need raw reservation/conversation data
 */

import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Reservation } from '@/entities/event'
import {
	getPeriodDateRange,
	getPeriodKey,
	type ViewType,
} from './useCalendarDateRange'

type CalendarConversationEvent = {
	role: string
	message: string
	date: string
	time: string
	customer_name: string | null
}

type UseCalendarPeriodDataOptions = {
	currentView: ViewType | string
	currentDate: Date
	freeRoam: boolean
}

export function useCalendarPeriodData(options: UseCalendarPeriodDataOptions) {
	const { currentView, currentDate, freeRoam } = options
	const queryClient = useQueryClient()

	const getCurrentPeriodData = useMemo(() => {
		const periodKey = getPeriodKey(currentView as ViewType, currentDate)
		const { start, end } = getPeriodDateRange(
			currentView as ViewType,
			periodKey
		)
		const fromDate = start.toISOString().split('T')[0]
		const toDate = end.toISOString().split('T')[0]

		return () => {
			// Get reservations from cache
			const reservationsQuery = queryClient.getQueryData<
				Record<string, Reservation[]>
			>(['calendar-reservations', periodKey, freeRoam])
			const reservations = reservationsQuery || {}

			// Get conversation events from cache
			const conversationsQuery = queryClient.getQueryData<
				Record<string, CalendarConversationEvent[]>
			>(['calendar-conversation-events', periodKey, freeRoam])
			const conversations = conversationsQuery || {}

			return {
				reservations,
				conversations,
				periodKey,
				fromDate,
				toDate,
			}
		}
	}, [currentView, currentDate, freeRoam, queryClient])

	return { getCurrentPeriodData }
}
