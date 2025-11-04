/* eslint-disable */

import { i18n } from '@shared/libs/i18n'
import { toastService } from '@shared/libs/toast'
import type {
	ApiResponse,
	CalendarEvent,
	OperationResult,
	RowChange,
	SuccessfulOperation,
} from '@/entities/event'
import { generateLocalOpKeys } from '@/shared/libs/realtime-utils'
import type { FormattingService } from '@/shared/libs/utils/formatting.service'
import type { LocalEchoManager } from '@/shared/libs/utils/local-echo.manager'
import type { CalendarIntegrationService } from './reservation-events.service'
import type { ReservationsWsService } from './reservations.ws.service'

class ReservationModifyService {
	private readonly calendarIntegration: CalendarIntegrationService
	private readonly webSocketService: ReservationsWsService
	private readonly formattingService: FormattingService
	private readonly localEchoManager: LocalEchoManager
	private readonly isLocalized: boolean

	constructor(options: {
		calendarIntegration: CalendarIntegrationService
		webSocketService: ReservationsWsService
		formattingService: FormattingService
		localEchoManager: LocalEchoManager
		isLocalized: boolean
	}) {
		this.calendarIntegration = options.calendarIntegration
		this.webSocketService = options.webSocketService
		this.formattingService = options.formattingService
		this.localEchoManager = options.localEchoManager
		this.isLocalized = options.isLocalized
	}

	async processModifications(
		editedRows: Record<string, RowChange>,
		gridRowToEventMap: Map<number, CalendarEvent>,
		onEventModified?: (eventId: string, event: CalendarEvent) => void
	): Promise<OperationResult> {
		let hasErrors = false
		const successful: SuccessfulOperation[] = []
		const indices = Object.keys(editedRows || {})
		for (const idxStr of indices) {
			const rowIdx = Number(idxStr)
			const change = editedRows[idxStr] || {}
			const original = gridRowToEventMap.get(rowIdx)
			if (!original) {
				continue
			}
			const modificationData = this.prepareModificationData(change, original)
			try {
				this.applyOptimisticUpdates(modificationData)
				try {
					const prevDate = modificationData.prevDate
					// Extract time format (HH:MM) from ISO string
					const TIME_FORMAT_LENGTH = 5
					const prevTime = (String(original?.extendedProps?.slotTime || '') ||
						modificationData.prevStartStr
							.split('T')[1]
							?.slice(0, TIME_FORMAT_LENGTH) ||
						'00:00') as string
					if (prevDate && prevTime) {
						this.calendarIntegration.reflowSlot(prevDate, prevTime)
					}
				} catch {
					// Silently ignore errors when reflowing calendar slot (integration may be unavailable)
				}
				const slotTime = this.formattingService.normalizeToSlotBase(
					modificationData.dateStrNew,
					modificationData.timeStrNew
				)
				try {
					const preKeys = generateLocalOpKeys('reservation_updated', {
						id: original.extendedProps?.reservationId || modificationData.evId,
						wa_id: modificationData.waId,
						date: modificationData.dateStrNew,
						time: slotTime,
					})
					for (const k of preKeys) {
						this.localEchoManager.markLocalEcho(k)
					}
				} catch {
					// Silently ignore errors when marking local echo (manager may be unavailable)
				}
				const reservationId = original.extendedProps?.reservationId
				const modifyParams: {
					date: string
					time: string
					title?: string
					type?: number
					reservationId?: number
					approximate?: boolean
				} = {
					date: modificationData.dateStrNew,
					time: slotTime,
					title: modificationData.titleNew,
					type: Number(modificationData.typeNew),
					// Always preserve user-picked time on the server; prevent slot snapping
					approximate: true,
				}
				if (typeof reservationId === 'number') {
					modifyParams.reservationId = reservationId
				}
				const resp = await this.webSocketService.modifyReservation(
					modificationData.waId,
					modifyParams
				)
				if (!resp?.success) {
					hasErrors = true
					// Revert optimistic updates on failure
					try {
						// Extract time format (HH:MM) from ISO string
						const TIME_FORMAT_LENGTH = 5
						const prevTime = (modificationData.prevStartStr
							.split('T')[1]
							?.slice(0, TIME_FORMAT_LENGTH) || '00:00') as string
						this.calendarIntegration.updateEventProperties(
							modificationData.evId,
							{
								title: original.title,
								type: Number(original.extendedProps?.type),
								cancelled: Boolean(original.extendedProps?.cancelled),
							}
						)
						this.calendarIntegration.updateEventTiming(
							modificationData.evId,
							modificationData.prevStartStr,
							modificationData.prevStartStr
						)
						try {
							if (modificationData.prevDate && prevTime) {
								this.calendarIntegration.reflowSlot(
									modificationData.prevDate,
									prevTime
								)
							}
						} catch {
							// Silently ignore errors when reflowing calendar slot (integration may be unavailable)
						}
					} catch {
						// Silently ignore errors when reverting optimistic updates (integration may be unavailable)
					}

					const errorMessage =
						(resp as unknown as { message?: string; error?: string })
							?.message ||
						(resp as unknown as { error?: string })?.error ||
						i18n.getMessage('update_failed', this.isLocalized)
					toastService.reservationModificationFailed({
						customer: modificationData.titleNew,
						wa_id: modificationData.waId,
						date: modificationData.dateStrNew,
						time: modificationData.timeStrNew,
						isLocalized: this.isLocalized,
						error: errorMessage,
					})
					continue
				}
				const extendedProps: {
					type: number
					cancelled: boolean
					reservationId?: number
				} = {
					type: Number(modificationData.typeNew),
					cancelled: false,
				}
				if (typeof original.extendedProps?.reservationId === 'number') {
					extendedProps.reservationId = original.extendedProps.reservationId
				}
				// Preserve original duration; fall back to a reasonable minimum (15m)
				const prevDurationMin = (() => {
					try {
						const MS_PER_MINUTE = 60_000
						const FALLBACK_DURATION_MINUTES = 15
						const startMs = new Date(original.start).getTime()
						const endMs = new Date(original.end ?? original.start).getTime()
						const diff = Math.max(0, endMs - startMs)
						const minutes = Math.round(diff / MS_PER_MINUTE)
						return Number.isFinite(minutes) && minutes > 0
							? minutes
							: FALLBACK_DURATION_MINUTES
					} catch {
						const FALLBACK_DURATION_MINUTES = 15
						return FALLBACK_DURATION_MINUTES
					}
				})()

				const newStartIso = `${modificationData.dateStrNew}T${modificationData.timeStrNew}:00`
				const newEndIso = (() => {
					try {
						const MS_PER_MINUTE = 60_000
						const [h, m] = (modificationData.timeStrNew || '00:00').split(':')
						const base = new Date(
							`${modificationData.dateStrNew}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
						)
						const out = new Date(
							base.getTime() + prevDurationMin * MS_PER_MINUTE
						)
						return `${modificationData.dateStrNew}T${String(out.getHours()).padStart(2, '0')}:${String(out.getMinutes()).padStart(2, '0')}:00`
					} catch {
						return newStartIso
					}
				})()

				onEventModified?.(modificationData.evId, {
					id: modificationData.evId,
					title: modificationData.titleNew,
					start: newStartIso,
					end: newEndIso,
					extendedProps,
				})
				try {
					const baseTimeNew = this.formattingService.normalizeToSlotBase(
						modificationData.dateStrNew,
						modificationData.timeStrNew
					)
					this.calendarIntegration.reflowSlot(
						modificationData.dateStrNew,
						baseTimeNew
					)
				} catch {
					// Silently ignore errors when reflowing calendar slot (integration may be unavailable)
				}
				successful.push({
					type: 'modify',
					id: modificationData.evId,
					data: {
						waId: modificationData.waId,
						date: modificationData.dateStrNew,
						time: slotTime,
						type: Number(modificationData.typeNew),
					},
				})
				this.storeModificationContext(modificationData, original)
				this.markLocalEchoForModification(
					resp as unknown as ApiResponse,
					modificationData,
					original
				)
			} catch (e) {
				hasErrors = true
				this.handleModificationError(e as Error)
			}
		}
		return { hasErrors, successfulOperations: successful }
	}

	private prepareModificationData(change: RowChange, original: CalendarEvent) {
		// Extract time format (HH:MM) from ISO string
		const TIME_FORMAT_LENGTH = 5
		const evId = String(original.id)
		const waId = (
			original.extendedProps?.waId ||
			original.extendedProps?.wa_id ||
			original.id ||
			''
		).toString()
		const prevStartStr = original.start
		const prevDate = prevStartStr.split('T')[0]
		let dateStrNew = prevDate as string
		let timeStrNew =
			prevStartStr.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) || '00:00'
		if (change.scheduled_time instanceof Date) {
			const s = change.scheduled_time
			dateStrNew = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`
			timeStrNew = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
		} else if (
			typeof change.scheduled_time === 'string' &&
			change.scheduled_time.includes('T')
		) {
			const [dPart, tPart] = change.scheduled_time.split('T')
			dateStrNew = dPart as string
			timeStrNew = this.formattingService.to24h(
				tPart ||
					prevStartStr.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) ||
					'00:00'
			)
		} else {
			timeStrNew = this.formattingService.to24h(
				(change as unknown as { time?: string }).time ||
					prevStartStr.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) ||
					'00:00'
			)
			dateStrNew = ((change as unknown as { date?: string }).date ||
				prevDate) as string
		}
		const typeNew = this.formattingService.parseType(
			change.type ?? original.extendedProps?.type,
			this.isLocalized
		)
		const titleNew =
			change.name ||
			original.title ||
			original.extendedProps?.customerName ||
			waId
		return {
			evId,
			waId,
			prevStartStr,
			prevDate,
			timeStrNew,
			dateStrNew,
			typeNew,
			titleNew,
		}
	}

	private applyOptimisticUpdates(
		modificationData: ReturnType<typeof this.prepareModificationData>
	): void {
		this.calendarIntegration.updateEventProperties(modificationData.evId, {
			title: modificationData.titleNew,
			type: Number(modificationData.typeNew),
			cancelled: false,
		})
		const startIso = `${modificationData.dateStrNew}T${modificationData.timeStrNew}:00`
		this.calendarIntegration.updateEventTiming(
			modificationData.evId,
			modificationData.prevStartStr,
			startIso
		)
	}

	private storeModificationContext(
		modificationData: ReturnType<typeof this.prepareModificationData>,
		original: CalendarEvent
	): void {
		// Extract time format (HH:MM) from ISO string
		const TIME_FORMAT_LENGTH = 5
		this.localEchoManager.storeModificationContext(modificationData.evId, {
			waId: modificationData.waId,
			prevDate: modificationData.prevDate,
			prevTime: modificationData.prevStartStr
				.split('T')[1]
				?.slice(0, TIME_FORMAT_LENGTH),
			prevType: original.extendedProps?.type,
			name: modificationData.titleNew,
			newDate: modificationData.dateStrNew,
			newTime: modificationData.timeStrNew,
			newType: Number(modificationData.typeNew),
		})
	}

	private markLocalEchoForModification(
		resp: ApiResponse,
		modificationData: ReturnType<typeof this.prepareModificationData>,
		original: CalendarEvent
	): void {
		const keys = generateLocalOpKeys('reservation_updated', {
			id:
				(resp as unknown as { id?: string | number })?.id ||
				original.extendedProps?.reservationId ||
				modificationData.evId,
			wa_id: modificationData.waId,
			date: modificationData.dateStrNew,
			time: modificationData.timeStrNew,
		})
		for (const key of keys) {
			this.localEchoManager.markLocalEcho(key)
		}
	}

	private handleModificationError(error: Error): void {
		// Toast duration in milliseconds
		const TOAST_DURATION_MS = 3000
		toastService.error(
			i18n.getMessage('update_failed', this.isLocalized),
			error?.message ||
				i18n.getMessage('system_error_try_later', this.isLocalized),
			TOAST_DURATION_MS
		)
	}
}

export { ReservationModifyService }
