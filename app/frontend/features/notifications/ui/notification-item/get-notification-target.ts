import type {
	NotificationType,
	ReservationData,
} from '@/entities/notification/types'

export function getNotificationTarget(
	type: NotificationType | string | undefined,
	data: ReservationData | Record<string, unknown> | undefined
): string {
	if (type?.startsWith('reservation_') && data) {
		const d = data as ReservationData
		if (d.date || d.time_slot) {
			return `${d.date ?? ''} ${d.time_slot ?? ''}`.trim()
		}
	}
	return ''
}
