import { useQuery } from '@tanstack/react-query'
import { callPythonBackend } from '@/shared/libs/backend'

type PhoneStatsData = {
	countries: Record<string, number>
	registration: {
		registered: number
		unknown: number
	}
}

/**
 * Hook to fetch phone statistics from backend.
 * Returns country counts and registration status counts from ALL customers in database.
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
