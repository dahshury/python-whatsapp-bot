import { useQuery } from '@tanstack/react-query'
import { callPythonBackend } from '@/shared/libs/backend'

type StatusStats = {
	registered: number
	unknown: number
	blocked: number
}

type PhoneStatsData = {
	countries: Record<string, number>
	status: StatusStats
	registration?: StatusStats
}

/**
 * Hook to fetch phone statistics from backend.
 * Returns country counts and contact status counts (registered/unregistered/blocked)
 * from ALL customers in database.
 */
export function usePhoneStats() {
	const { data, isLoading, error } = useQuery({
		queryKey: ['phone-stats'],
		queryFn: async () => {
			const result = await callPythonBackend<{
				success: boolean
				data: PhoneStatsData
			}>('/phone/stats')

			if (!result || result.success === false) {
				throw new Error('Failed to fetch phone stats')
			}

			return result.data
		},
		staleTime: 300_000, // Cache for 5 minutes
		gcTime: 600_000, // Keep in cache for 10 minutes
		retry: 1,
	})

	return {
		stats: data,
		isLoading,
		hasError: Boolean(error),
	}
}
