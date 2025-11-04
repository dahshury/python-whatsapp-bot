import { i18n } from '@shared/libs/i18n'
import { toastService } from '@shared/libs/toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Reservation } from '@/entities/event'
import {
	LOCAL_OPERATION_TIMEOUT_MS,
	TOAST_TIMEOUT_MS,
} from '@/features/calendar/lib/constants'
import { reserveTimeSlot } from '@/shared/api'
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
			const response = (await reserveTimeSlot({
				id: params.waId,
				title: params.title || params.waId,
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
			await queryClient.cancelQueries({ queryKey: ['calendar-reservations'] })

			const previousData = queryClient.getQueriesData({
				queryKey: ['calendar-reservations'],
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
			const tempReservation: Reservation = {
				id: tempId,
				customer_id: params.waId,
				date: params.date,
				time_slot: params.time,
				customer_name: params.title || params.waId,
				type: params.type ?? 0,
				cancelled: false,
			}

			queryClient.setQueriesData(
				{ queryKey: ['calendar-reservations'] },
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

		onSuccess: (response, params, context) => {
			// Replace temp reservation with real one from backend
			const realId = response.data?.reservation_id || response.id
			if (realId && context?.tempId) {
				queryClient.setQueriesData(
					{ queryKey: ['calendar-reservations'] },
					(old: Record<string, Reservation[]> | undefined) => {
						if (!old) {
							return old
						}

						const updated = { ...old }
						const updatedReservations = updated[params.waId]
						if (updatedReservations) {
							updated[params.waId] = updatedReservations.map((r) =>
								r.id === context.tempId
									? {
											...r,
											id: typeof realId === 'number' ? realId : Number(realId),
											...(response.data as Partial<Reservation>),
										}
									: r
							)
						}

						return updated
					}
				)
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
	})
}
