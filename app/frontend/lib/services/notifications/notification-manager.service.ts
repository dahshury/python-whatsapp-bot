import { toastService } from "@/lib/toast-service";

/**
 * Simplified notification manager - only handles WebSocket echoes
 * All notifications come from WebSocket events, no user action duplicates
 */
export class NotificationManager {
	private static instance: NotificationManager;

	private constructor() {}

	static getInstance(): NotificationManager {
		if (!NotificationManager.instance) {
			NotificationManager.instance = new NotificationManager();
		}
		return NotificationManager.instance;
	}

	/**
	 * Show reservation modified notification (WebSocket echo only)
	 */
	showReservationModified(payload: {
		customer?: string;
		wa_id: string;
		date: string;
		time: string;
		isLocalized?: boolean;
	}): void {
		toastService.reservationModified({
			...(payload.customer && { customer: payload.customer }),
			wa_id: payload.wa_id,
			date: payload.date,
			time: payload.time,
			isLocalized: payload.isLocalized || false,
		});
	}

	/**
	 * Show reservation created notification (WebSocket echo only)
	 */
	showReservationCreated(payload: {
		customer?: string;
		wa_id: string;
		date: string;
		time: string;
		isLocalized?: boolean;
	}): void {
		toastService.reservationCreated({
			...(payload.customer && { customer: payload.customer }),
			wa_id: payload.wa_id,
			date: payload.date,
			time: payload.time,
			isLocalized: payload.isLocalized || false,
		});
	}

	/**
	 * Show reservation cancelled notification (WebSocket echo only)
	 */
	showReservationCancelled(payload: {
		customer?: string;
		wa_id: string;
		date: string;
		time: string;
		isLocalized?: boolean;
	}): void {
		toastService.reservationCancelled({
			...(payload.customer && { customer: payload.customer }),
			wa_id: payload.wa_id,
			date: payload.date,
			time: payload.time,
			isLocalized: payload.isLocalized || false,
		});
	}
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
