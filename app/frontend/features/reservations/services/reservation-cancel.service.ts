/* eslint-disable */

import { i18n } from '@shared/libs/i18n'
import { toastService } from '@shared/libs/toast'
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	SuccessfulOperation,
} from '@/entities/event'
import { cancelReservation } from '@/shared/api'
import { generateLocalOpKeys } from '@/shared/libs/realtime-utils'
import type { LocalEchoManager } from '@/shared/libs/utils/local-echo.manager'
import type { CalendarIntegrationService } from './reservation-events.service'
import type { ReservationsWsService } from './reservations.ws.service'

export class ReservationCancelService {
	private readonly calendarIntegration: CalendarIntegrationService
	private readonly localEchoManager: LocalEchoManager
	private readonly isLocalized: boolean
	private readonly webSocketService?: ReservationsWsService

	constructor(
		calendarIntegration: CalendarIntegrationService,
		localEchoManager: LocalEchoManager,
		isLocalized: boolean,
		webSocketService?: ReservationsWsService
	) {
		this.calendarIntegration = calendarIntegration
		this.localEchoManager = localEchoManager
		this.isLocalized = isLocalized
		if (webSocketService !== undefined) {
			this.webSocketService = webSocketService
		}
	}

	async processCancellations(
		deletedRows: number[],
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventCancelled?: (eventId: string) => void
	): Promise<OperationResult> {
		let hasErrors = false
		const successful: SuccessfulOperation[] = []
		for (const rowIdx of deletedRows || []) {
			const mapped = gridRowToEventMap.get(rowIdx)
			if (!mapped) {
				continue
			}
			const eventId = String(mapped.id)
			const waId = this.extractWaId(mapped)
			const date = mapped.start?.split('T')[0] || ''
			const time = this.extractTimeFromEvent(mapped)
			try {
				this.calendarIntegration.markEventCancelled(eventId)
				try {
					if (date && time) {
						const preKeys = generateLocalOpKeys('reservation_cancelled', {
							id: mapped.extendedProps?.reservationId || eventId,
							wa_id: waId,
							date,
							time,
						})
						for (const k of preKeys) {
							this.localEchoManager.markLocalEcho(k)
						}
					}
				} catch {
					// Silently ignore errors when marking local echo (non-critical operation)
				}
				const resp = this.webSocketService
					? await this.webSocketService.cancelReservation(waId, date, {
							isLocalized: this.isLocalized,
						})
					: ((await cancelReservation({
							id: waId,
							date,
							isLocalized: this.isLocalized,
						})) as unknown as ApiResponse)
				if (!resp?.success) {
					throw new Error(
						(resp as unknown as { message?: string; error?: string })
							?.message ||
							(resp as unknown as { error?: string })?.error ||
							'Cancel failed'
					)
				}
				this.calendarIntegration.removeEvent(eventId)
				const baseTime = ((): string | null => {
					try {
						if (mapped?.extendedProps?.slotTime) {
							// Extract first 5 characters for time format (HH:MM)
							const TIME_FORMAT_LENGTH = 5
							return String(mapped.extendedProps.slotTime).slice(
								0,
								TIME_FORMAT_LENGTH
							)
						}
						if (time) {
							return time
						}
						return null
					} catch {
						return null
					}
				})()
				if (date && baseTime) {
					try {
						this.calendarIntegration.reflowSlot(date, baseTime)
					} catch {
						// Silently ignore errors when reflowing slot (non-critical operation)
					}
				}
				onEventCancelled?.(eventId)
				successful.push({
					type: 'cancel',
					id: eventId,
					data: { waId, ...(date && { date }) },
				})
				if (date && time) {
					this.markLocalEchoForCancellation({
						resp: resp as unknown as ApiResponse,
						mapped,
						eventId,
						date,
						time,
						waId,
					})
				}
			} catch (e) {
				hasErrors = true
				this.handleCancellationError(e as Error)
			}
		}
		return { hasErrors, successfulOperations: successful }
	}

	private extractWaId(mapped: CalendarEvent): string {
		return (
			mapped.extendedProps?.waId ||
			mapped.extendedProps?.wa_id ||
			mapped.id ||
			''
		).toString()
	}

	private extractTimeFromEvent(mapped: CalendarEvent): string {
		try {
			const slot = mapped?.extendedProps?.slotTime
			if (slot) {
				// Extract first 5 characters for time format (HH:MM)
				const TIME_FORMAT_LENGTH = 5
				return String(slot).slice(0, TIME_FORMAT_LENGTH)
			}
			const s = mapped?.start || ''
			if (s?.includes('T')) {
				// Extract first 5 characters for time format (HH:MM)
				const TIME_FORMAT_LENGTH = 5
				return s.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) || ''
			}
			return ''
		} catch {
			return ''
		}
	}

	private markLocalEchoForCancellation(options: {
		resp: ApiResponse
		mapped: CalendarEvent
		eventId: string
		date: string
		time: string
		waId: string
	}): void {
		const { resp, mapped, eventId, date, time, waId } = options
		const keys = generateLocalOpKeys('reservation_cancelled', {
			id:
				(resp as unknown as { id?: string | number })?.id ||
				mapped.extendedProps?.reservationId ||
				eventId,
			wa_id: waId,
			date,
			time,
		})
		for (const key of keys) {
			this.localEchoManager.markLocalEcho(key)
		}
	}

	private handleCancellationError(error: Error): void {
		// Toast duration in milliseconds
		const TOAST_DURATION_MS = 3000
		toastService.error(
			i18n.getMessage('cancel_failed', this.isLocalized),
			error?.message ||
				i18n.getMessage('system_error_try_later', this.isLocalized),
			TOAST_DURATION_MS
		)
	}
}
