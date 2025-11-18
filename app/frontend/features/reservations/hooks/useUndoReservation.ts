import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Reservation } from '@/entities/event'
import {
	LOCAL_OPERATION_TIMEOUT_MS,
	SLOT_PREFIX_LEN,
} from '@/features/calendar/lib/constants'
import { reflowSlot } from '@/features/calendar/lib/reflow-slot'
import { getWindowProperty } from '@/features/calendar/lib/window-utils'
import { updateCustomerNamesCache } from '@/features/customers/hooks/utils/customer-names-cache'
import { callPythonBackend } from '@/shared/libs/backend'
import {
	isSameAsWaId,
	resolveCustomerDisplayName,
} from '@/shared/libs/customer-name'
import { i18n } from '@/shared/libs/i18n'
import { generateLocalOpKeys } from '@/shared/libs/realtime-utils'
import { toastService } from '@/shared/libs/toast'
import { markLocalOperation } from '@/shared/libs/utils/local-ops'

// Delay to allow event update to complete before reflowing slots
const EVENT_UPDATE_DELAY_MS = 50

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
	newWaId?: string // If provided, phone number was changed and needs to be reverted
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

			// Mark as local operation to suppress WebSocket echo
			try {
				const localKeys = generateLocalOpKeys('reservation_cancelled', {
					id: reservationId,
					wa_id: waId,
					date: '', // Will be filled by backend
					time: '', // Will be filled by backend
				})
				for (const key of localKeys) {
					markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS)
				}
			} catch {
				// ignore marking failures
			}

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
		onSuccess: (_response, params) => {
			// Update cache directly - remove the reservation from all caches
			queryClient.setQueriesData(
				{ queryKey: ['calendar-reservations'] },
				(old: Record<string, Reservation[]> | undefined) => {
					if (!old) {
						return old
					}

					const updated = { ...old }
					let anyChanges = false

					for (const [customerId, reservations] of Object.entries(updated)) {
						const beforeLength = reservations.length
						const filtered = reservations.filter(
							(r) => r.id !== params.reservationId
						)

						if (filtered.length !== beforeLength) {
							updated[customerId] = filtered
							anyChanges = true

							// Remove empty arrays
							if (filtered.length === 0) {
								delete updated[customerId]
							}
						}
					}

					return anyChanges ? updated : old
				}
			)

			// No broad invalidations - cache is already updated
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
			const { reservationId, originalData, ar, newWaId } = params
			// If phone changed, we need to revert it first before modifying the reservation
			// This is because the reservation modification uses wa_id in the URL path
			if (newWaId && newWaId !== originalData.wa_id) {
				const phoneResponse = await fetch('/api/modify-id', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						old_id: newWaId,
						new_id: originalData.wa_id,
						reservation_id: reservationId,
						customer_name: originalData.customer_name || null,
						_call_source: 'undo', // Suppress notification - undo will show its own notification
					}),
				})

				const phoneResult = (await phoneResponse.json()) as {
					success?: boolean
					message?: string
				}
				if (!phoneResult.success) {
					const backendMessage =
						phoneResult.message || 'Failed to revert phone number change'
					throw new Error(backendMessage)
				}
			}

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
		onSuccess: async (response, params) => {
			const { reservationId, originalData, newWaId } = params

			// If phone was changed and reverted, update all caches
			if (newWaId && newWaId !== originalData.wa_id) {
				// Invalidate customer names cache to force fresh fetch from backend
				// This ensures the most up-to-date customer data after phone revert
				await queryClient.invalidateQueries({
					queryKey: ['customer-names'],
				})

				// Rekey reservation caches
				const rekeyReservationMap = (
					map: Record<string, Reservation[]> | undefined
				): Record<string, Reservation[]> | undefined => {
					if (!(map && Object.hasOwn(map, newWaId))) {
						return map
					}
					const updated = { ...map }
					const reservations = updated[newWaId]
					delete updated[newWaId]
					if (reservations) {
						updated[originalData.wa_id] = reservations.map((reservation) => ({
							...reservation,
							wa_id: originalData.wa_id,
							customer_id: originalData.wa_id,
							...(originalData.customer_name !== undefined
								? { customer_name: originalData.customer_name }
								: {}),
						}))
					}
					return updated
				}

				queryClient.setQueriesData(
					{ queryKey: ['calendar-reservations'] },
					(old: Record<string, Reservation[]> | undefined) =>
						rekeyReservationMap(old)
				)

				queryClient.setQueriesData(
					{ queryKey: ['reservations-date-range'] },
					(old: Record<string, Reservation[]> | undefined) =>
						rekeyReservationMap(old)
				)

				const newGridData = queryClient.getQueryData<
					{ name: string; age: number | null } | undefined
				>(['customer-grid-data', newWaId])
				if (newGridData !== undefined) {
					queryClient.setQueryData(['customer-grid-data', originalData.wa_id], {
						...newGridData,
						...(originalData.customer_name !== undefined
							? { name: originalData.customer_name }
							: {}),
					})
					queryClient.removeQueries({
						queryKey: ['customer-grid-data', newWaId],
						exact: true,
					})
				}

				const newStats = queryClient.getQueryData<
					Record<string, unknown> | undefined
				>(['customer-stats', newWaId])
				if (newStats !== undefined) {
					queryClient.setQueryData(['customer-stats', originalData.wa_id], {
						...newStats,
						...(originalData.customer_name !== undefined
							? { customerName: originalData.customer_name }
							: {}),
					})
					queryClient.removeQueries({
						queryKey: ['customer-stats', newWaId],
						exact: true,
					})
				}
			}

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
					const handleEventModified = getWindowProperty<
						((eventId: string, event: unknown) => void) | null | undefined
					>('__calendarHandleEventModified', null)

					// Get calendar API to access current event and reflow slots
					const getCalendarApi = getWindowProperty<
						| (() =>
								| {
										getEventById?: (id: string) => {
											extendedProps?: Record<string, unknown>
											startStr?: string
										} | null
										getEvents?: () => unknown[]
								  }
								| null
								| undefined)
						| null
						| undefined
					>('__getCalendarApi', null)

					let oldSlotDate: string | undefined
					let oldSlotTime: string | undefined

					// Get current event's slot information before updating
					if (getCalendarApi) {
						try {
							const api = getCalendarApi()
							if (api) {
								const currentEvent = api.getEventById?.(String(reservationId))
								if (currentEvent) {
									const extProps = currentEvent.extendedProps || {}
									oldSlotDate =
										String(extProps.slotDate || '').split('T')[0] ||
										(currentEvent.startStr
											? currentEvent.startStr.split('T')[0]
											: undefined)
									oldSlotTime =
										String(extProps.slotTime || '').slice(0, SLOT_PREFIX_LEN) ||
										(currentEvent.startStr
											? currentEvent.startStr
													.split('T')[1]
													?.slice(0, SLOT_PREFIX_LEN)
											: undefined)
								}
							}
						} catch {
							// Ignore errors when getting current event info
						}
					}

					if (typeof handleEventModified === 'function') {
						const baseTime = normalizeTime(originalData.time_slot)
						const startIso = `${originalData.date}T${baseTime}:00`
						const displayName = resolveCustomerDisplayName({
							waId: String(originalData.wa_id || ''),
							candidates: [originalData.customer_name],
						})

						handleEventModified(String(reservationId), {
							id: String(reservationId),
							title: displayName,
							start: startIso,
							extendedProps: {
								type: originalData.type ?? 0,
								cancelled: false,
								waId: originalData.wa_id,
								wa_id: originalData.wa_id,
								phone: originalData.wa_id,
								reservationId: String(reservationId),
								slotDate: originalData.date,
								slotTime: baseTime,
								customerName: displayName,
							},
						})

						// Reflow both old and new slots to trigger sorting workflow
						// Delay to allow handleEventModified to complete first
						setTimeout(() => {
							try {
								if (getCalendarApi) {
									const api = getCalendarApi()
									if (api) {
										// Reflow the old slot (where the event was before undo)
										if (
											oldSlotDate &&
											oldSlotTime &&
											(oldSlotDate !== originalData.date ||
												oldSlotTime !== baseTime)
										) {
											reflowSlot(api, oldSlotDate, oldSlotTime)
										}

										// Reflow the new slot (where the event is being moved to)
										// Note: handleEventModified already reflows the new slot, but we do it here
										// to ensure it happens after the event update is complete
										if (originalData.date && baseTime) {
											reflowSlot(api, originalData.date, baseTime)
										}
									}
								}
							} catch {
								// Ignore errors when reflowing slots
							}
						}, EVENT_UPDATE_DELAY_MS)
					}
				} catch {
					// Calendar handler not available, rely on invalidation
				}
			}

			// Update customer names cache if name was reverted
			if (
				typeof originalData.customer_name === 'string' &&
				originalData.customer_name.trim().length > 0 &&
				!isSameAsWaId(originalData.customer_name.trim(), originalData.wa_id)
			) {
				updateCustomerNamesCache(
					queryClient,
					originalData.wa_id,
					originalData.customer_name.trim()
				)
			}

			// No broad invalidations needed - cache is already updated via setQueriesData
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
			// Mark as local operation to suppress WebSocket echo
			try {
				const localKeys = generateLocalOpKeys('reservation_updated', {
					id: params.reservationId,
					wa_id: '', // Will be filled by backend
					date: '', // Will be filled by backend
					time: '', // Will be filled by backend
				})
				for (const key of localKeys) {
					markLocalOperation(key, LOCAL_OPERATION_TIMEOUT_MS)
				}
			} catch {
				// ignore marking failures
			}

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
		onSuccess: (response, params) => {
			// Update cache directly - mark reservation as not cancelled
			const responseData = response as {
				data?: Partial<Reservation>
			}

			queryClient.setQueriesData(
				{ queryKey: ['calendar-reservations'] },
				(old: Record<string, Reservation[]> | undefined) => {
					if (!old) {
						return old
					}

					const updated = { ...old }
					let anyChanges = false

					for (const [customerId, reservations] of Object.entries(updated)) {
						let mutated = false
						const nextReservations = reservations.map((r) => {
							if (r.id === params.reservationId) {
								mutated = true
								return {
									...r,
									...(responseData.data || {}),
									cancelled: false,
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

			// No broad invalidations needed - cache is already updated
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
