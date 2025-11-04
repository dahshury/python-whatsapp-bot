import type { UpdateType } from './types'

export type AckWaitOptions = {
	reservationId?: string | number
	waId?: string | number
	date: string
	time: string
	timeoutMs?: number
	isLocalized?: boolean
}

export type AckResult = {
	success: boolean
	message?: string
}

export function waitForWSConfirmation(
	options: AckWaitOptions
): Promise<AckResult> {
	const { reservationId, waId, date, timeoutMs = 10_000 } = options
	return new Promise((resolve) => {
		let resolved = false
		const handler = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| {
							type?: UpdateType
							data?: Record<string, unknown>
							error?: string
					  }
					| undefined
				const t = detail?.type
				const d = detail?.data || {}

				if (t === 'modify_reservation_ack') {
					if (!resolved) {
						resolved = true
						window.removeEventListener('realtime', handler as EventListener)
						resolve({ success: true, message: d.message as string })
					}
				} else if (t === 'modify_reservation_nack') {
					if (!resolved) {
						resolved = true
						window.removeEventListener('realtime', handler as EventListener)
						const errorMessage =
							(typeof detail?.error === 'string' ? detail.error : undefined) ||
							(typeof d.message === 'string'
								? (d.message as string)
								: undefined) ||
							'Operation failed'
						resolve({ success: false, message: errorMessage })
					}
				} else if (
					!resolved &&
					(t === 'reservation_updated' || t === 'reservation_reinstated') &&
					((reservationId != null &&
						String((d as { id?: unknown }).id) === String(reservationId)) ||
						(waId != null &&
							String(
								(d as { wa_id?: unknown; waId?: unknown }).wa_id ??
									(d as { waId?: unknown }).waId
							) === String(waId) &&
							String((d as { date?: unknown }).date) === String(date)))
				) {
					resolved = true
					window.removeEventListener('realtime', handler as EventListener)
					resolve({ success: true })
				}
			} catch {
				/* noop */
			}
		}

		try {
			window.addEventListener('realtime', handler as EventListener)
		} catch {
			/* noop */
		}

		setTimeout(() => {
			try {
				window.removeEventListener('realtime', handler as EventListener)
			} catch {
				/* noop */
			}
			if (!resolved) {
				resolve({ success: false, message: 'Request timed out' })
			}
		}, timeoutMs)
	})
}
