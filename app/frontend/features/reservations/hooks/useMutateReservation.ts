import { i18n } from '@shared/libs/i18n'
import { toastService } from '@shared/libs/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Reservation } from '@/entities/event'
import {
	LOCAL_OPERATION_TIMEOUT_MS,
	TOAST_TIMEOUT_MS,
} from '@/features/calendar/lib/constants'
import { updateCustomerNamesCache } from '@/features/customers/hooks/utils/customer-names-cache'
import { calendarKeys, customerKeys } from '@/shared/api/query-keys'
import { generateLocalOpKeys } from '@/shared/libs/realtime-utils'
import { markLocalOperation } from '@/shared/libs/utils/local-ops'
import { ReservationsWsService } from '../services/reservations.ws.service'
import { updateReservationCache } from './utils/reservation-cache'

export type MutateReservationParams = {
	waId: string
	reservationId?: number
	date: string
	time: string
	title?: string
	type?: number
	approximate?: boolean
	isLocalized?: boolean
}

type InternalMutateParams = MutateReservationParams & {
	previousDate?: string
	previousTimeSlot?: string
}

export function useMutateReservation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: InternalMutateParams) => {
			const service = new ReservationsWsService()
			const {
				previousDate: _previousDate,
				previousTimeSlot: _previousTimeSlot,
				...apiParams
			} = params
			const response = await service.modifyReservation(
				apiParams.waId,
				{
					date: apiParams.date,
					time: apiParams.time,
					...(apiParams.title !== undefined ? { title: apiParams.title } : {}),
					...(apiParams.type !== undefined ? { type: apiParams.type } : {}),
					...(apiParams.reservationId !== undefined
						? { reservationId: apiParams.reservationId }
						: {}),
					approximate:
						apiParams.approximate !== undefined ? apiParams.approximate : false,
				},
				{
					...(apiParams.isLocalized !== undefined
						? { isLocalized: apiParams.isLocalized }
						: {}),
				}
			)

			if (!response.success) {
				throw new Error(
					response.message ||
						(response as { error?: string }).error ||
						'Failed to modify reservation'
				)
			}

			return response
		},

		onMutate: async (params) => {
			const extendedParams = params as InternalMutateParams

			// Cancel only in-flight queries that might conflict (not all calendar queries)
			// We use the waId to be more specific
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

			const localKeys = generateLocalOpKeys('reservation_updated', {
				id: params.reservationId || '',
				wa_id: params.waId,
				date: params.date,
				time: params.time,
			})
			for (const key of localKeys) {
				markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS)
			}

			const previousDate = extendedParams.previousDate || params.date
			const previousTimeSlotRaw = extendedParams.previousTimeSlot || params.time

			// NOTE: updateReservationCache uses setQueriesData which is correct here
			// Calendar has many queries like ["calendar-reservations", periodKey, freeRoam]
			// We need to update all of them that might contain this reservation
			updateReservationCache({
				queryClient,
				payload: { cancelled: false } as Partial<Reservation>,
				waId: params.waId,
				...(params.reservationId !== undefined
					? { reservationId: params.reservationId }
					: {}),
				previousDate,
				previousTimeSlot: previousTimeSlotRaw,
				nextDate: params.date,
				nextTimeSlot: params.time,
				...(params.title !== undefined
					? { nextCustomerName: params.title }
					: {}),
				...(params.type !== undefined ? { nextType: params.type } : {}),
			})

			// Update customer names cache if name changed
			if (params.title !== undefined) {
				updateCustomerNamesCache(queryClient, params.waId, params.title)
			}

			return { previousData }
		},

		onSuccess: (_response, params) => {
			// Update customer names cache if name changed
			if (params.title !== undefined) {
				updateCustomerNamesCache(queryClient, params.waId, params.title)
			}
		},

		onError: (error, params, context) => {
			if (context?.previousData) {
				for (const [queryKey, data] of context.previousData) {
					queryClient.setQueryData(queryKey, data)
				}
			}

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
