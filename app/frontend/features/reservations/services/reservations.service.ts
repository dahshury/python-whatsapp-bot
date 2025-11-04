import type { EventApi } from '@fullcalendar/core'
import type { CalendarApi } from '@/entities/event'
import { FormattingService } from '@/shared/libs/utils/formatting.service'
import { LocalEchoManager } from '@/shared/libs/utils/local-echo.manager'
import type {
	CalendarIntegration,
	ReservationsUseCase,
} from '../usecase/reservations.usecase'
import { ReservationCancelService } from './reservation-cancel.service'
import { ReservationCreateService } from './reservation-create.service'
import { getReservationEventProcessor } from './reservation-events.service'
import { ReservationModifyService } from './reservation-modify.service'
import { ReservationsWsService } from './reservations.ws.service'

export const ReservationsService = (
	calendarApi: CalendarApi,
	isLocalized: boolean,
	refreshCustomerData?: () => Promise<void>
): ReservationsUseCase => {
	const webSocketService = new ReservationsWsService()
	const formattingService = new FormattingService()
	const localEchoManager = new LocalEchoManager()
	const eventProcessor = getReservationEventProcessor()

	// Helper to suppress FullCalendar's eventChange handler during programmatic updates
	const withSuppression = (fn: () => void) => {
		try {
			const depth =
				((globalThis as { __suppressEventChangeDepth?: number })
					.__suppressEventChangeDepth || 0) + 1
			;(
				globalThis as { __suppressEventChangeDepth?: number }
			).__suppressEventChangeDepth = depth
			try {
				fn()
			} finally {
				setTimeout(() => {
					try {
						const d = (globalThis as { __suppressEventChangeDepth?: number })
							.__suppressEventChangeDepth
						if (typeof d === 'number' && d > 0) {
							;(
								globalThis as { __suppressEventChangeDepth?: number }
							).__suppressEventChangeDepth = d - 1
						}
					} catch {
						// Silently ignore errors when accessing calendar API (API may be unavailable)
					}
				}, 0)
			}
		} catch {
			// Best-effort suppression; proceed even if guard fails
			fn()
		}
	}

	// Calendar integration adapter
	const calendarIntegration: CalendarIntegration = {
		reflowSlot: (_date: string, _time: string) => {
			try {
				calendarApi.rerenderEvents?.()
			} catch {
				// Silently ignore errors when reflowing calendar slots (API may be unavailable)
			}
		},
		updateSize: () => {
			try {
				calendarApi.updateSize?.()
			} catch {
				// Silently ignore errors when updating calendar size (API may be unavailable)
			}
		},
		updateEventProperties: (eventId, props) => {
			withSuppression(() => {
				try {
					const ev = (
						calendarApi as unknown as {
							getEventById?: (id: string) => EventApi | null | undefined
						}
					).getEventById?.(eventId)
					if (!ev) {
						return
					}
					if (typeof props.title === 'string') {
						try {
							ev.setProp?.('title', props.title)
						} catch {
							// Silently ignore errors when setting event title (API may be unavailable)
						}
					}
					if (typeof props.type !== 'undefined') {
						try {
							ev.setExtendedProp?.('type', Number(props.type))
						} catch {
							// Silently ignore errors when setting event type (API may be unavailable)
						}
					}
					if (typeof props.cancelled !== 'undefined') {
						try {
							ev.setExtendedProp?.('cancelled', Boolean(props.cancelled))
						} catch {
							// Silently ignore errors when setting cancelled property (API may be unavailable)
						}
						if (props.cancelled === true) {
							try {
								ev.setProp?.('textColor', '#908584')
							} catch {
								// Silently ignore errors when setting text color (API may be unavailable)
							}
						}
					}
				} catch {
					// Silently ignore errors when updating event properties (API may be unavailable)
				}
			})
		},
		updateEventTiming: (eventId, _prevStartIso, nextStartIso) => {
			withSuppression(() => {
				try {
					const ev = (
						calendarApi as unknown as {
							getEventById?: (id: string) => EventApi | null | undefined
						}
					).getEventById?.(eventId)
					if (!ev) {
						return
					}
					try {
						// Preserve event duration while moving start
						const startInput = new Date(nextStartIso)
						// Some FullCalendar versions accept an options object with maintainDuration
						try {
							ev.setStart?.(startInput, { maintainDuration: true })
						} catch {
							// Fallback: manually maintain duration if available
							try {
								const prevStart: Date | null =
									ev.start instanceof Date ? (ev.start as Date) : null
								const prevEnd: Date | null =
									ev.end instanceof Date ? (ev.end as Date) : null
								if (prevStart && prevEnd) {
									const durationMs = Math.max(
										0,
										prevEnd.getTime() - prevStart.getTime()
									)
									ev.setStart?.(startInput)
									ev.setEnd?.(new Date(startInput.getTime() + durationMs))
								} else {
									// No prior duration, set a small default (30 minutes)
									const DEFAULT_DURATION_MINUTES = 30
									const MS_PER_MINUTE = 60
									const MS_PER_SECOND = 1000
									ev.setStart?.(startInput)
									ev.setEnd?.(
										new Date(
											startInput.getTime() +
												DEFAULT_DURATION_MINUTES * MS_PER_MINUTE * MS_PER_SECOND
										)
									)
								}
							} catch {
								// Silently ignore errors when maintaining event duration (API may be unavailable)
							}
						}
					} catch {
						// Silently ignore errors when updating event timing (API may be unavailable)
					}
				} catch {
					// Silently ignore errors when accessing calendar API (API may be unavailable)
				}
			})
		},
		markEventCancelled: (eventId) => {
			withSuppression(() => {
				try {
					const ev = (
						calendarApi as unknown as {
							getEventById?: (id: string) => EventApi | null | undefined
						}
					).getEventById?.(eventId)
					if (!ev) {
						return
					}
					try {
						ev.setExtendedProp?.('cancelled', true)
					} catch {
						// Silently ignore errors when marking event as cancelled (API may be unavailable)
					}
					try {
						ev.setProp?.('textColor', '#908584')
					} catch {
						// Silently ignore errors when setting text color (API may be unavailable)
					}
				} catch {
					// Silently ignore errors when accessing calendar API (API may be unavailable)
				}
			})
		},
		removeEvent: (eventId) => {
			withSuppression(() => {
				try {
					const ev = (
						calendarApi as unknown as {
							getEventById?: (id: string) => EventApi | null | undefined
						}
					).getEventById?.(eventId)
					try {
						ev?.remove?.()
					} catch {
						// Silently ignore errors when removing event (API may be unavailable)
					}
				} catch {
					// Silently ignore errors when accessing calendar API (API may be unavailable)
				}
			})
		},
		isTimeGridView: () => {
			try {
				const type =
					(calendarApi as unknown as { view?: { type?: string } }).view?.type ||
					(
						calendarApi as unknown as { getView?: () => { type?: string } }
					).getView?.()?.type
				return typeof type === 'string' ? type.startsWith('timeGrid') : false
			} catch {
				return false
			}
		},
	}

	// Initialize services
	const cancelService = new ReservationCancelService(
		calendarIntegration,
		localEchoManager,
		isLocalized,
		webSocketService
	)

	const modifyService = new ReservationModifyService({
		calendarIntegration,
		webSocketService,
		formattingService,
		localEchoManager,
		isLocalized,
	})

	const createService = new ReservationCreateService(
		formattingService,
		localEchoManager,
		isLocalized
	)

	return {
		generateCalendarEvents: (
			reservationsByUser,
			conversationsByUser,
			options
		) =>
			eventProcessor.generateCalendarEvents(
				reservationsByUser,
				conversationsByUser,
				options
			),

		processCancellations: async (
			deletedRows,
			gridRowToEventMap,
			onEventCancelled
		) =>
			cancelService.processCancellations(
				deletedRows,
				gridRowToEventMap,
				onEventCancelled
			),

		processModifications: async (
			editedRows,
			gridRowToEventMap,
			onEventModified
		) =>
			modifyService.processModifications(
				editedRows,
				gridRowToEventMap,
				onEventModified
			),

		processAdditions: async (addedRows, onEventAdded) =>
			createService.processAdditions(addedRows, onEventAdded),

		updateCalendarWithOperations: (successfulOperations) => {
			try {
				try {
					const seen = new Set<string>()
					for (const op of successfulOperations || []) {
						if (!op || op.type !== 'create') {
							continue
						}
						const date = (op as { data?: { date?: string } })?.data?.date
						const time = (op as { data?: { time?: string } })?.data?.time
						if (!(date && time)) {
							continue
						}
						const key = `${date}T${time}`
						if (seen.has(key)) {
							continue
						}
						seen.add(key)
						try {
							calendarIntegration.reflowSlot(date, time)
						} catch {
							// Silently ignore errors when reflowing calendar slot (integration may be unavailable)
						}
					}
				} catch {
					// Silently ignore errors when accessing calendar integration (integration may be unavailable)
				}

				calendarIntegration.updateSize()
				if (typeof refreshCustomerData === 'function') {
					refreshCustomerData().catch(() => {
						// Silently ignore errors when refreshing customer data (non-critical)
					})
				}
			} catch {
				// Silently ignore errors when reloading events (non-critical)
			}
		},
	}
}
