import type { CalendarEvent } from '@/entities/event'
import type { CancelReservationParams } from '@/features/reservations/hooks'

const TIME_FORMAT_LENGTH = 5

/**
 * Extract cancellation parameters from a calendar event
 * Shared by both data grid and context menu cancellation flows
 */
export function extractCancellationData(
	original: CalendarEvent,
	isLocalized: boolean,
	freeRoam?: boolean
): CancelReservationParams | null {
	const waId = (original.extendedProps?.waId || original.id || '').toString()
	const date = original.start?.split('T')[0] || ''
	const slotTime = (original.extendedProps as { slotTime?: string } | undefined)
		?.slotTime
	const startTimePart = original.start?.split('T')[1]
	const startTime = startTimePart
		? startTimePart.slice(0, TIME_FORMAT_LENGTH)
		: undefined
	const time = slotTime || startTime || undefined

	if (!date) {
		return null
	}
	if (!waId) {
		return null
	}

	const reservationId = original.extendedProps?.reservationId

	return {
		waId,
		date,
		...(time !== undefined ? { time } : {}),
		...(reservationId !== undefined && typeof reservationId === 'number'
			? { reservationId }
			: {}),
		isLocalized,
		...(freeRoam !== undefined ? { freeRoam } : {}),
	}
}


