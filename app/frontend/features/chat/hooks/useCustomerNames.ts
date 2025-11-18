'use client'

import { useQuery } from '@tanstack/react-query'
import { customerKeys } from '@/shared/api/query-keys'
import { SYSTEM_AGENT } from '@/shared/config'
import { callPythonBackend } from '@/shared/libs/backend'
import { useBackendReconnectRefetch } from '@/shared/libs/hooks/useBackendReconnectRefetch'

export type CustomerName = {
	wa_id: string
	customer_name: string | null
	is_blocked?: boolean
	is_favorite?: boolean
}

type CustomerNamesResponse = {
	success: boolean
	data: Record<string, CustomerName>
}

/**
 * Hook for fetching all customer names for sidebar combobox.
 * Returns all customers whether they have reservations or conversations.
 * Uses TanStack Query for caching and state management.
 */
export function useCustomerNames() {
	const query = useQuery<Record<string, CustomerName>>({
		queryKey: customerKeys.names(),
		queryFn: async (): Promise<Record<string, CustomerName>> => {
			const response =
				await callPythonBackend<CustomerNamesResponse>('/customers/names')

			if (!(response.success && response.data)) {
				return {}
			}

			const customers = { ...response.data }
			const systemEntry = customers[SYSTEM_AGENT.waId]
			if (!systemEntry) {
				customers[SYSTEM_AGENT.waId] = {
					wa_id: SYSTEM_AGENT.waId,
					customer_name: SYSTEM_AGENT.displayName,
					is_blocked: false,
					is_favorite: false,
				}
			} else if (!systemEntry.customer_name) {
				systemEntry.customer_name = SYSTEM_AGENT.displayName
				systemEntry.is_blocked = systemEntry.is_blocked ?? false
				systemEntry.is_favorite = systemEntry.is_favorite ?? false
			}

			return customers
		},
		staleTime: 300_000, // Cache for 5 minutes
		gcTime: 600_000, // Keep in cache for 10 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		retry: 1,
	})
	useBackendReconnectRefetch(query.refetch, {
		enabled: !query.isFetching,
	})
	return query
}
