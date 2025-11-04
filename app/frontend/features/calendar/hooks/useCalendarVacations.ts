'use client'

import { useQuery } from '@tanstack/react-query'
import type { Vacation } from '@/entities/vacation'
import { callPythonBackend } from '@/shared/libs/backend'

type CalendarVacationsResponse = {
	success: boolean
	data: Vacation[]
}

/**
 * Hook for fetching vacations for calendar.
 * Uses TanStack Query for caching and state management.
 */
export function useCalendarVacations() {
	return useQuery({
		queryKey: ['calendar-vacations'],
		queryFn: async (): Promise<Vacation[]> => {
			const response =
				await callPythonBackend<CalendarVacationsResponse>('/vacations')

			if (!(response.success && response.data)) {
				return []
			}

			return response.data
		},
		staleTime: 60_000, // Cache for 1 minute
		gcTime: 300_000, // Keep in cache for 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		retry: 1,
	})
}
