import { useQuery } from '@tanstack/react-query'
import React from 'react'
import type * as RPNInput from 'react-phone-number-input'
import { parsePhoneNumber } from 'react-phone-number-input'
import { callPythonBackend } from '@/shared/libs/backend'
import type { IndexedPhoneOption } from '@/shared/libs/phone/indexed.types'

type PhoneContactResult = {
	wa_id: string
	customer_name: string | null
	last_message_at: string | null
	last_reservation_at: string | null
	similarity?: number
	is_favorite?: boolean
}

/**
 * Hook to fetch recent contacts (50 max) sorted by last user message.
 */
export function useRecentContacts() {
	const { data, isLoading, error } = useQuery({
		queryKey: ['phone-recent'],
		queryFn: async () => {
			const result = await callPythonBackend<{
				success: boolean
				data: PhoneContactResult[]
			}>('/phone/recent?limit=50')

			if (!result || result.success === false) {
				throw new Error('Failed to fetch recent contacts')
			}

			return result.data
		},
		staleTime: 60_000, // Cache for 60 seconds
		gcTime: 300_000, // Keep in cache for 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: 1,
	})

	// Convert to IndexedPhoneOption format
	const indexedOptions: IndexedPhoneOption[] = React.useMemo(() => {
		const mapped = (data || []).map((result) => {
			const phoneNumber = result.wa_id.startsWith('+')
				? result.wa_id
				: `+${result.wa_id}`

			// Parse phone to extract country
			let country: RPNInput.Country = 'US'
			try {
				const parsed = parsePhoneNumber(phoneNumber)
				country = (parsed?.country as RPNInput.Country) || 'US'
			} catch {
				// Keep default
			}

			const name = result.customer_name || phoneNumber
			const lastMessageAt = result.last_message_at
				? new Date(result.last_message_at).getTime()
				: null
			const lastReservationAt = result.last_reservation_at
				? new Date(result.last_reservation_at).getTime()
				: null

			return {
				number: phoneNumber,
				name,
				country,
				label: name,
				id: result.wa_id,
				displayNumber: phoneNumber,
				lastMessageAt,
				lastReservationAt,
				is_favorite: Boolean(result.is_favorite),
				__normalizedNumber: result.wa_id.replace(/[\s\-+]/g, ''),
				__searchName: name.toLowerCase(),
				__searchLabel: name.toLowerCase(),
				__country: country,
			}
		})

		mapped.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0))

		return mapped
	}, [data])

	return {
		contacts: indexedOptions,
		isLoading,
		hasError: Boolean(error),
	}
}
