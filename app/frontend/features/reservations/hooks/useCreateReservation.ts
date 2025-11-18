import { i18n } from '@shared/libs/i18n'
import { toastService } from '@shared/libs/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Reservation } from '@/entities/event'
import {
	LOCAL_OPERATION_TIMEOUT_MS,
	TOAST_TIMEOUT_MS,
} from '@/features/calendar/lib/constants'
import { updateCustomerNamesCache } from '@/features/customers/hooks/utils/customer-names-cache'
import { reserveTimeSlot } from '@/shared/api'
import { calendarKeys, customerKeys } from '@/shared/api/query-keys'
import {
	getUnknownCustomerLabel,
	isSameAsWaId,
} from '@/shared/libs/customer-name'
import { generateLocalOpKeys } from '@/shared/libs/realtime-utils'
import { markLocalOperation } from '@/shared/libs/utils/local-ops'

export type CreateReservationParams = {
	waId: string
	date: string
	time: string
	title?: string
	type?: number
	isLocalized?: boolean
}

export function useCreateReservation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: CreateReservationParams) => {
			const slotTime = params.time
			const normalizedTitle =
				typeof params.title === 'string' ? params.title.trim() : ''
			const requestTitle =
				normalizedTitle && !isSameAsWaId(normalizedTitle, params.waId)
					? normalizedTitle
					: getUnknownCustomerLabel(params.isLocalized)
			const response = (await reserveTimeSlot({
				id: params.waId,
				title: requestTitle,
				date: params.date,
				time: slotTime,
				type: params.type ?? 0,
				...(params.isLocalized !== undefined ? { ar: params.isLocalized } : {}),
			})) as unknown as ApiResponse

			if (!response?.success) {
				throw new Error(
					response?.message ||
						(response as { error?: string }).error ||
						'Failed to create reservation'
				)
			}

			return response
		},

		onMutate: async (params) => {
			// Cancel only in-flight queries that might conflict (not all calendar queries)
			await queryClient.cancelQueries({
				predicate: (query) => {
					if (query.queryKey[0] !== 'calendar-reservations') {
						return false
					}
					// Only cancel if this query is currently fetching
					return query.state.fetchStatus === 'fetching'
				},
			})

			const previousData = queryClient.getQueriesData({
				queryKey: calendarKeys.reservations(),
			})

			// Mark as local operation to suppress WebSocket echo
			const slotTime = params.time
			const localKeys = generateLocalOpKeys('reservation_created', {
				id: '',
				wa_id: params.waId,
				date: params.date,
				time: slotTime,
			})
			for (const key of localKeys) {
				markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS)
			}

			// Optimistically add temporary reservation with negative ID
			const tempId = -Date.now()
			const normalizedTitle =
				typeof params.title === 'string' && params.title.trim().length > 0
					? params.title.trim()
					: ''
			const tempReservation: Reservation = {
				id: tempId,
				customer_id: params.waId,
				date: params.date,
				time_slot: params.time,
				customer_name:
					normalizedTitle && !isSameAsWaId(normalizedTitle, params.waId)
						? normalizedTitle
						: getUnknownCustomerLabel(params.isLocalized),
				type: params.type ?? 0,
				cancelled: false,
			}

			// NOTE: setQueriesData is correct here because we're updating MULTIPLE queries
			// Calendar has many queries like calendarKeys.reservationsByPeriod(period, freeRoam)
			// We need to update all of them that might contain this reservation
			queryClient.setQueriesData(
				{ queryKey: calendarKeys.reservations() },
				(old: Record<string, Reservation[]> | undefined) => {
					if (!old) {
						return { [params.waId]: [tempReservation] }
					}

					const updated = { ...old }
					if (!updated[params.waId]) {
						updated[params.waId] = []
					}
					const existingReservations = updated[params.waId]
					if (existingReservations) {
						updated[params.waId] = [...existingReservations, tempReservation]
						// Sort by date and time
						const sortedReservations = updated[params.waId]
						if (sortedReservations) {
							sortedReservations.sort((a, b) => {
								const aKey = `${a.date}T${a.time_slot || '00:00'}`
								const bKey = `${b.date}T${b.time_slot || '00:00'}`
								return aKey.localeCompare(bKey)
							})
						}
					}

					return updated
				}
			)

			return { previousData, tempId }
		},

		onSuccess: (_response, params) => {
			// Update customer names cache if name provided
			const normalizedTitle =
				typeof params.title === 'string' ? params.title.trim() : ''
			const shouldPersistName =
				normalizedTitle && !isSameAsWaId(normalizedTitle, params.waId)

			if (shouldPersistName) {
				updateCustomerNamesCache(queryClient, params.waId, normalizedTitle)
			}
		},

		onError: (error, params, context) => {
			// Rollback to snapshot
			if (context?.previousData) {
				for (const [queryKey, data] of context.previousData) {
					queryClient.setQueryData(queryKey, data)
				}
			}

			// Show error toast
			const errorMessage =
				error instanceof Error
					? error.message
					: i18n.getMessage('save_error', params.isLocalized)
			toastService.error(
				i18n.getMessage('save_error', params.isLocalized),
				errorMessage,
				TOAST_TIMEOUT_MS
			)
		},

		onSettled: () => {
			// Always refetch to ensure cache consistency
			// Invalidate all calendar-reservations queries to trigger refetch
			queryClient.invalidateQueries({
				queryKey: calendarKeys.reservations(),
			})
			// Also invalidate customer names to ensure fresh data
			queryClient.invalidateQueries({
				queryKey: customerKeys.names(),
			})
		},
	})
}
