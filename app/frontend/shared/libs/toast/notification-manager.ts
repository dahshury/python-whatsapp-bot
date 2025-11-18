import { toastService } from '@shared/libs/toast'

export class NotificationManager {
	private static instance: NotificationManager

	private constructor() {}

	static getInstance(): NotificationManager {
		if (!NotificationManager.instance) {
			NotificationManager.instance = new NotificationManager()
		}
		return NotificationManager.instance
	}

	showReservationModified(payload: {
		customer?: string
		wa_id: string
		date: string
		time: string
		isLocalized?: boolean
		onUndo?: () => void
	}): void {
		toastService.reservationModified({
			...(payload.customer && { customer: payload.customer }),
			wa_id: payload.wa_id,
			date: payload.date,
			time: payload.time,
			...(payload.isLocalized !== undefined && {
				isLocalized: payload.isLocalized,
			}),
			...(payload.onUndo && { onUndo: payload.onUndo }),
		})
	}

	showReservationCreated(payload: {
		customer?: string
		wa_id: string
		date: string
		time: string
		isLocalized?: boolean
		onUndo?: () => void
	}): void {
		toastService.reservationCreated({
			...(payload.customer && { customer: payload.customer }),
			wa_id: payload.wa_id,
			date: payload.date,
			time: payload.time,
			...(payload.isLocalized !== undefined && {
				isLocalized: payload.isLocalized,
			}),
			...(payload.onUndo && { onUndo: payload.onUndo }),
		})
	}

	showReservationCancelled(payload: {
		customer?: string
		wa_id: string
		date: string
		time: string
		isLocalized?: boolean
		onUndo?: () => void
	}): void {
		toastService.reservationCancelled({
			...(payload.customer && { customer: payload.customer }),
			wa_id: payload.wa_id,
			date: payload.date,
			time: payload.time,
			...(payload.isLocalized !== undefined && {
				isLocalized: payload.isLocalized,
			}),
			...(payload.onUndo && { onUndo: payload.onUndo }),
		})
	}
}

export const notificationManager = NotificationManager.getInstance()
