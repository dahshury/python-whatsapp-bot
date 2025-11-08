import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Reservation } from '@/entities/event'
import {
	LOCAL_OPERATION_TIMEOUT_MS,
	SLOT_PREFIX_LEN,
} from '@/features/calendar/lib/constants'
import { callPythonBackend } from '@/shared/libs/backend'
import { i18n } from '@/shared/libs/i18n'
import { generateLocalOpKeys } from '@/shared/libs/realtime-utils'
import { toastService } from '@/shared/libs/toast'
import { markLocalOperation } from '@/shared/libs/utils/local-ops'

const normalizeTime = (value?: string): string => {
	if (!value) {
		return ''
	}
	return value.slice(0, SLOT_PREFIX_LEN)
}

type UndoCreateParams = {
	reservationId: number
	waId: string
	ar?: boolean
}

type UndoModifyParams = {
	reservationId: number
	originalData: {
		wa_id: string
		date: string
		time_slot: string
		customer_name?: string
		type?: number
	}
	ar?: boolean
}

type UndoCancelParams = {
	reservationId: number
	ar?: boolean
}

/**
 * Hook for undoing reservation operations
 * Supports undoing create, modify, and cancel operations
 */
export function useUndoReservation() {
	const queryClient = useQueryClient()

	/**
	 * Undo a reservation creation by canceling it
	 */
	const undoCreate = useMutation({
		mutationFn: async (params: UndoCreateParams) => {
			const { reservationId, waId, ar } = params
			const encodedWaId = encodeURIComponent(waId)

			// Call Python backend directly to cancel the reservation
			const response = await callPythonBackend(
				`/reservations/${encodedWaId}/cancel`,
				{
					method: 'POST',
					body: JSON.stringify({
						reservation_id_to_cancel: reservationId,
						ar,
						_call_source: 'undo',
					}),
				}
			)

			if (!(response as { success?: boolean }).success) {
				throw new Error(
					(response as { message?: string }).message || 'Undo create failed'
				)
			}

			return response
		},
		onSuccess: () => {
			// Invalidate queries to refresh the UI
			queryClient.invalidateQueries({ queryKey: ['reservations'] })
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
			toastService.success(i18n.getMessage('toast_undo_successful'))
		},
		onError: (error: Error) => {
			toastService.error(
				i18n.getMessage('toast_undo_failed'),
				error.message || i18n.getMessage('toast_error_generic')
			)
		},
	})

	/**
	 * Undo a reservation modification by reverting to original data
	 */
	const undoModify = useMutation({
		mutationFn: async (params: UndoModifyParams) => {
			const { reservationId, originalData, ar } = params
			const encodedWaId = encodeURIComponent(originalData.wa_id)

			// Mark as local op to suppress WS echo handling, same as Save Changes
			try {
				const slotTime = normalizeTime(originalData.time_slot)
				const localKeys = generateLocalOpKeys('reservation_updated', {
					id: reservationId,
					wa_id: originalData.wa_id,
					date: originalData.date,
					time: slotTime,
				})
				for (const key of localKeys) {
					markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS)
				}
			} catch {
				// ignore marking failures
			}

			// Call Python backend directly to modify the reservation back
			const response = await callPythonBackend(
				`/reservations/${encodedWaId}/modify`,
				{
					method: 'POST',
					body: JSON.stringify({
						new_date: originalData.date,
						new_time_slot: originalData.time_slot,
						new_name: originalData.customer_name,
						new_type: originalData.type,
						max_reservations: 6,
						approximate: false,
						hijri: false,
						ar,
						reservation_id_to_modify: reservationId,
						_call_source: 'undo',
					}),
				}
			)

			const result = response as {
				success?: boolean
				data?: Partial<Reservation>
				message?: string
			}
			if (!result.success) {
				throw new Error(result.message || 'Undo modify failed')
			}

			return result
		},
		onSuccess: (response, params) => {
			const { reservationId, originalData } = params

			// Update query cache immediately like useMutateReservation does
			if (response.data && originalData) {
				queryClient.setQueriesData(
					{ queryKey: ['calendar-reservations'] },
					(old: Record<string, Reservation[]> | undefined) => {
						if (!old) {
							return old
						}

						const updated = { ...old }
						let anyChanges = false
						const payload = response.data as Partial<Reservation>
						const responseTimeSlot = normalizeTime(
							payload?.time_slot as string | undefined
						)
						const nextTimeSlot = normalizeTime(originalData.time_slot)

						for (const [customerId, reservations] of Object.entries(updated)) {
							let mutated = false
							const nextReservations = reservations.map((r) => {
								const matchesById = r.id === reservationId
								const matchesBySlot =
									customerId === originalData.wa_id &&
									r.date === (payload?.date || originalData.date) &&
									normalizeTime(r.time_slot) ===
										normalizeTime(
											(payload?.time_slot as string | undefined) ||
												originalData.time_slot
										)

								if (matchesById || matchesBySlot) {
									mutated = true
									return {
										...r,
										...payload,
										date: originalData.date,
										time_slot: responseTimeSlot || nextTimeSlot,
										...(originalData.customer_name !== undefined
											? { customer_name: originalData.customer_name }
											: {}),
										...(originalData.type !== undefined
											? { type: originalData.type }
											: {}),
									}
								}
								return r
							})

							if (mutated) {
								updated[customerId] = nextReservations
								anyChanges = true
							}
						}

						return anyChanges ? updated : old
					}
				)

				// Use calendar manipulation service to update the visual event
				try {
					const handleEventModified = (
						window as { __calendarHandleEventModified?: unknown }
					).__calendarHandleEventModified as
						| ((eventId: string, event: unknown) => void)
						| null
						| undefined
					if (typeof handleEventModified === 'function') {
						const baseTime = normalizeTime(originalData.time_slot)
						const startIso = `${originalData.date}T${baseTime}:00`

						handleEventModified(String(reservationId), {
							id: String(reservationId),
							title: originalData.customer_name || originalData.wa_id,
							start: startIso,
							extendedProps: {
								type: originalData.type ?? 0,
								cancelled: false,
								waId: originalData.wa_id,
								wa_id: originalData.wa_id,
								reservationId: String(reservationId),
								slotDate: originalData.date,
								slotTime: baseTime,
							},
						})
					}
				} catch {
					// Calendar handler not available, rely on invalidation
				}
			}

			// Also invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: ['reservations'] })
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
			toastService.success(i18n.getMessage('toast_undo_successful'))
		},
		onError: (error: Error) => {
			toastService.error(
				i18n.getMessage('toast_undo_failed'),
				error.message || i18n.getMessage('toast_error_generic')
			)
		},
	})

	/**
	 * Undo a reservation cancellation by reinstating it
	 */
	const undoCancel = useMutation({
		mutationFn: async (params: UndoCancelParams) => {
			// Call Python backend directly to reinstate the reservation
			const response = await callPythonBackend('/undo-cancel', {
				method: 'POST',
				body: JSON.stringify({
					reservation_id: params.reservationId,
					ar: params.ar,
				}),
			})

			if (!(response as { success?: boolean }).success) {
				throw new Error(
					(response as { message?: string }).message || 'Undo cancel failed'
				)
			}

			return response
		},
		onSuccess: () => {
			// Invalidate queries to refresh the UI
			queryClient.invalidateQueries({ queryKey: ['reservations'] })
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
			toastService.success(i18n.getMessage('toast_undo_successful'))
		},
		onError: (error: Error) => {
			toastService.error(
				i18n.getMessage('toast_undo_failed'),
				error.message || i18n.getMessage('toast_error_generic')
			)
		},
	})

	return {
		undoCreate,
		undoModify,
		undoCancel,
	}
}
