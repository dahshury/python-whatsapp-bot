import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import type * as RPNInput from 'react-phone-number-input'
import { parsePhoneNumber } from 'react-phone-number-input'
import { phoneKeys } from '@/shared/api/query-keys'
import { callPythonBackend } from '@/shared/libs/backend'
import type { IndexedPhoneOption } from '@/shared/libs/phone/indexed.types'
import { buildPhoneGroups } from '@/shared/libs/phone/phone-groups'

type PhoneSearchResult = {
	wa_id: string
	customer_name: string | null
	last_message_at: string | null
	last_reservation_at: string | null
	similarity: number
	is_favorite?: boolean
}

/**
 * Hook for backend-powered phone search using PostgreSQL pg_trgm.
 * Replaces client-side Fuse.js fuzzy matching with server-side trigram search.
 */
export function useBackendPhoneSearch(
	search: string,
	selectedPhone?: string,
	debounceMs = 300
) {
	const [debouncedSearch, setDebouncedSearch] = useState(search)
	const [hasErrorState, setHasErrorState] = useState(false)

	useEffect(() => {
		if (!search.trim()) {
			setHasErrorState(false)
		}
	}, [search])

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search)
		}, debounceMs)

		return () => clearTimeout(timer)
	}, [search, debounceMs])

	type SearchResponse =
		| { success: true; data: PhoneSearchResult[] }
		| { success: false; data: PhoneSearchResult[]; error: string }

	const { data, isLoading, error, isError, refetch } = useQuery<SearchResponse>(
		{
			queryKey: phoneKeys.search(debouncedSearch),
			queryFn: async (): Promise<SearchResponse> => {
				// Skip empty or very short queries that match too many results
				if (!debouncedSearch || debouncedSearch.trim().length < 2) {
					return { success: true, data: [] }
				}

				try {
					const result = await callPythonBackend<{
						success: boolean
						data: PhoneSearchResult[]
					}>(
						`/phone/search?q=${encodeURIComponent(debouncedSearch.trim())}&limit=500`
					)

					if (!result || result.success === false) {
						return { success: false, data: [], error: 'search_failed' }
					}

					return { success: true, data: result.data }
				} catch {
					// Phone search failed
					return { success: false, data: [], error: 'network_error' }
				}
			},
			enabled: Boolean(debouncedSearch && debouncedSearch.trim().length >= 2),
			staleTime: 60_000, // Cache for 60 seconds
			gcTime: 300_000, // Keep in cache for 5 minutes
			retry: false,
			refetchOnWindowFocus: false, // Don't refetch on window focus
			refetchOnMount: false, // Don't refetch on component mount if data is fresh
		}
	)

	useEffect(() => {
		if (error || isError) {
			setHasErrorState(true)
		} else if (data) {
			if (data.success === false) {
				setHasErrorState(true)
			} else {
				setHasErrorState(false)
			}
		}
	}, [data, error, isError])

	// Convert backend results to IndexedPhoneOption format
	// Memoized to avoid expensive parsing and object creation on every render
	const indexedOptions: IndexedPhoneOption[] = useMemo(
		() =>
			(data?.success ? data.data : []).map((result) => {
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
					is_favorite: result.is_favorite ?? false,
					__normalizedNumber: result.wa_id.replace(/[\s\-+]/g, ''),
					__searchName: name.toLowerCase(),
					__searchLabel: name.toLowerCase(),
					__country: country,
				}
			}),
		[data]
	)

	// Build phone groups from indexed options
	// Memoized to avoid rebuilding groups unnecessarily
	const { groups, ordered } = useMemo(
		() =>
			buildPhoneGroups(indexedOptions, {
				selectedPhone: selectedPhone || '',
				recentLimit: 50,
				totalLimit: 400,
			}),
		[indexedOptions, selectedPhone]
	)

	return {
		groups,
		orderedPhones: ordered,
		indexedOptions,
		isSearching: isLoading,
		hasError: hasErrorState || Boolean(error) || isError,
		refetch,
	}
}
