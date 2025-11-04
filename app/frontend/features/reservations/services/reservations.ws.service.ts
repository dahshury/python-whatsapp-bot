import type { ApiResponse } from '@/entities/event'

export class ReservationsWsService {
	sendMessage(message: {
		type: string
		data?: Record<string, unknown>
	}): Promise<boolean> {
		try {
			const wsRef = (
				typeof window !== 'undefined' ? window : null
			) as Window | null
			const connection =
				(wsRef?.__wsConnection as { current?: WebSocket | null } | undefined) ||
				null
			const ws = connection?.current

			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(message))
				return Promise.resolve(true)
			}
			return Promise.resolve(false)
		} catch {
			return Promise.resolve(false)
		}
	}

	private waitForWSConfirmation(args: {
		reservationId?: string | number
		waId?: string | number
		date: string
		time: string
		timeoutMs?: number
	}): Promise<{ success: boolean; message?: string }> {
		const { reservationId, waId, date, timeoutMs = 10_000 } = args

		return new Promise((resolve) => {
			let resolved = false

			const handler = (ev: Event) => {
				try {
					const detail = (ev as CustomEvent).detail as
						| { type?: string; data?: Record<string, unknown>; error?: string }
						| undefined
					const t = detail?.type
					const d = detail?.data || {}

					if (t === 'modify_reservation_ack') {
						if (!resolved) {
							resolved = true
							window.removeEventListener('realtime', handler as EventListener)
							clearTimeout(timeoutId)
							resolve({ success: true, message: String(d.message || '') })
						}
					} else if (t === 'modify_reservation_nack') {
						if (!resolved) {
							resolved = true
							window.removeEventListener('realtime', handler as EventListener)
							clearTimeout(timeoutId)
							const errorMessage =
								detail?.error || d.message || 'Operation failed'
							resolve({ success: false, message: String(errorMessage) })
						}
					} else if (
						(t === 'reservation_updated' || t === 'reservation_reinstated') &&
						((reservationId != null &&
							String(d.id) === String(reservationId)) ||
							(waId != null &&
								String(d.wa_id ?? d.waId) === String(waId) &&
								String(d.date) === String(date))) &&
						!resolved
					) {
						resolved = true
						window.removeEventListener('realtime', handler as EventListener)
						clearTimeout(timeoutId)
						resolve({ success: true })
					}
				} catch {
					// Silently ignore errors in WebSocket event handler (non-critical)
				}
			}

			const timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true
					try {
						window.removeEventListener('realtime', handler as EventListener)
					} catch {
						// Silently ignore errors when removing event listener (listener may not exist)
					}
					resolve({ success: false, message: 'Request timeout' })
				}
			}, timeoutMs)

			try {
				window.addEventListener('realtime', handler as EventListener)
			} catch {
				clearTimeout(timeoutId)
				resolve({
					success: false,
					message: 'Failed to set up confirmation listener',
				})
			}
		})
	}

	async modifyReservation(
		waId: string,
		updates: {
			date: string
			time: string
			title?: string
			type?: number
			reservationId?: number
			approximate?: boolean
		},
		opts?: { isLocalized?: boolean }
	): Promise<ApiResponse> {
		const wsSuccess = await this.sendMessage({
			type: 'modify_reservation',
			data: {
				wa_id: waId,
				date: updates.date,
				time_slot: updates.time,
				customer_name: updates.title,
				type: updates.type,
				reservation_id: updates.reservationId,
				approximate: updates.approximate,
				ar: opts?.isLocalized,
			},
		})

		if (wsSuccess) {
			const confirmation = await this.waitForWSConfirmation({
				reservationId: updates.reservationId || '',
				waId,
				date: updates.date,
				time: updates.time,
				timeoutMs: 30_000,
			})
			return {
				success: confirmation.success,
				...(confirmation.message && { message: confirmation.message }),
			}
		}
		const { modifyReservation } = await import('@/shared/api')
		return (await modifyReservation(waId, updates)) as unknown as ApiResponse
	}

	async cancelReservation(
		waId: string,
		date: string,
		opts?: { isLocalized?: boolean }
	): Promise<ApiResponse> {
		const wsSuccess = await this.sendMessage({
			type: 'cancel_reservation',
			data: { wa_id: waId, date, ar: opts?.isLocalized },
		})
		if (wsSuccess) {
			return { success: true } as ApiResponse
		}
		// Fallback to HTTP
		const payload: { id: string; date: string; isLocalized?: boolean } = {
			id: waId,
			date,
			...(typeof opts?.isLocalized === 'boolean'
				? { isLocalized: opts.isLocalized }
				: {}),
		}
		const { cancelReservation } = await import('@/shared/api')
		return (await cancelReservation(payload)) as unknown as ApiResponse
	}
}
