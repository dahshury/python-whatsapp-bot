import type { EventApi } from '@fullcalendar/core'
import { convertDataTableEventToCalendarEvent } from '@shared/libs/calendar/calendar-event-converters'
import { useCallback, useEffect } from 'react'
import type { CalendarEvent } from '@/entities/event'
import { handleCancelReservation as handleCancelReservationService } from '@/features/calendar/handlers/onCancel'
import { handleOpenConversation as handleOpenConversationService } from '@/features/calendar/handlers/onOpenConversation'
import {
	SLOT_PREFIX_LEN,
	STATE_SETTLE_DELAY_MS,
	SUPPRESS_LOCAL_MOVE_MS,
} from '@/features/calendar/lib/constants'
import { createRealtimeHandler } from '@/features/calendar/lib/realtime-update-handler'
import { reflowSlot } from '@/features/calendar/lib/reflow-slot'
import {
	getWindowProperty,
	setWindowProperty,
} from '@/features/calendar/lib/window-utils'
import { orchestrateCalendarDrag } from '@/features/calendar/services/calendar-events.service'
import type { CalendarCoreRef } from '@/features/calendar/types'
import type { MutateReservationParams } from '@/features/reservations/hooks'
import { useMutateReservation } from '@/features/reservations/hooks'

// Removed HandleEventChangeArgs from legacy handler to avoid unused type
type CancelReservationArgs = Parameters<
	typeof handleCancelReservationService
>[0]

// Extend globalThis to include custom properties
// Global augmentation removed; use getWindowProperty/setWindowProperty helpers instead

// Helper function to safely access window properties
// removed: now using getWindowProperty from lib

// Helper function to set window properties safely
// removed: now using setWindowProperty from lib

type UseCalendarEventHandlersProps = {
	events: CalendarEvent[]
	conversations: Record<string, unknown>
	isLocalized?: boolean
	currentView: string
	isVacationDate: (date: string) => boolean
	handleRefreshWithBlur: () => Promise<void>
	openConversation: (id: string) => void
	addEvent: (event: CalendarEvent) => void
	updateEvent: (id: string, event: Partial<CalendarEvent>) => void
	removeEvent: (id: string) => void
	dataTableEditor: { handleEditReservation: (event: CalendarEvent) => void }
	calendarRef?: React.RefObject<CalendarCoreRef | null> // Optional calendar ref for API access
}

// removed unused CalendarEventDetail type

export function useCalendarEventHandlers({
	events,
	conversations: _conversations,
	isLocalized,
	currentView,
	isVacationDate,
	handleRefreshWithBlur,
	openConversation,
	addEvent,
	updateEvent,
	removeEvent,
	dataTableEditor,
	calendarRef,
}: UseCalendarEventHandlersProps) {
	const _isLocalized = isLocalized ?? false
	const modifyMutation = useMutateReservation()
	const mutateReservationForDnD = useCallback(
		(payload: MutateReservationParams) => modifyMutation.mutateAsync(payload),
		[modifyMutation]
	)

	// Ensure global registry for locally-initiated moves to suppress stale WS thrash
	useEffect(() => {
		const currentMap = getWindowProperty('__calendarLocalMoves', null)
		if (!currentMap) {
			setWindowProperty('__calendarLocalMoves', new Map<string, number>())
		}
	}, [])

	// Listen to realtime CustomEvent and update FullCalendar API directly
	useEffect(() => {
		if (!calendarRef?.current) {
			return
		}
		const api = calendarRef.current.getApi?.()
		if (!api) {
			return
		}

		const handler = createRealtimeHandler(
			{
				getEventById: (id: string) => api.getEventById?.(id),
				addEvent: (e: unknown) =>
					(api as unknown as { addEvent?: (e2: unknown) => void })?.addEvent?.(
						e
					),
				getEvents: () => api.getEvents?.() || [],
			},
			{ suppressMs: SUPPRESS_LOCAL_MOVE_MS }
		)
		window.addEventListener('realtime', handler as EventListener)
		return () =>
			window.removeEventListener('realtime', handler as EventListener)
	}, [calendarRef])
	// Handle event change (drag and drop)
	const handleEventChange = useCallback(
		async (info: import('@fullcalendar/core').EventChangeArg) => {
			// Debug calendar API access
			const getCalendarApi = calendarRef?.current
				? () => {
						/* calendar ref current */
						const api = calendarRef.current?.getApi()
						/* calendar API obtained */
						if (api) {
							/* calendar API methods available */
						}
						return api || undefined
					}
				: undefined

			if (!getCalendarApi) {
				/* no calendar ref available for event change handling */
			}

			// Use process orchestrator for DnD handling
			const api = getCalendarApi?.()
			if (!api) {
				return
			}
			await orchestrateCalendarDrag({
				calendarApi: api as unknown as import('@/entities/event').CalendarApi,
				info: info as unknown as import('@/features/calendar/services/calendar-events.service').EventChangeInfo,
				isVacationDate,
				currentView,
				updateEvent: updateEvent as unknown as (
					id: string,
					event: { id: string; title?: string; start?: string; end?: string }
				) => void,
				resolveEvent: (id: string) => {
					// Prefer React state events for reliable extendedProps
					const stateEvent = events.find((e) => e.id === String(id))
					if (stateEvent) {
						return { extendedProps: stateEvent.extendedProps || {} }
					}
					try {
						const ev = api?.getEventById?.(String(id))
						return ev
							? { extendedProps: (ev as EventApi).extendedProps || {} }
							: undefined
					} catch {
						return
					}
				},
				isLocalized: _isLocalized,
				mutateReservation: mutateReservationForDnD,
			})
		},
		[
			isVacationDate,
			_isLocalized,
			currentView,
			calendarRef,
			updateEvent,
			events.find,
			mutateReservationForDnD,
		]
	)

	// Handle open conversation
	const handleOpenConversation = useCallback(
		async (eventId: string) => {
			// Prefer opening by waId/wa_id if available on the event
			let conversationId = eventId
			try {
				const api = calendarRef?.current?.getApi?.()
				const ev = api?.getEventById(String(eventId))
				const wa =
					(ev as EventApi)?.extendedProps?.waId ||
					(ev as EventApi)?.extendedProps?.wa_id
				if (wa) {
					conversationId = String(wa)
				}
			} catch {
				/* noop */
			}

			await handleOpenConversationService({
				eventId: conversationId,
				openConversation,
			})
		},
		[openConversation, calendarRef]
	)

	// Context menu handlers
	const handleCancelReservation = useCallback(
		async (eventId: string) => {
			// Provide FullCalendar API accessor so the handler can update/remove events
			const getCalendarApi = calendarRef?.current
				? () => calendarRef.current?.getApi?.() || undefined
				: undefined
			await handleCancelReservationService({
				eventId,
				events,
				isLocalized: _isLocalized,
				onRefresh: handleRefreshWithBlur,
				...(getCalendarApi
					? {
							getCalendarApi: () =>
								getCalendarApi() as unknown as ReturnType<
									NonNullable<CancelReservationArgs['getCalendarApi']>
								>,
						}
					: {}),
				onEventCancelled: (id: string) => {
					// Mirror DataTableOperationsService behavior: also update React state immediately
					try {
						removeEvent(id)
					} catch {
						/* noop */
					}
				},
			})
		},
		[events, _isLocalized, handleRefreshWithBlur, calendarRef, removeEvent]
	)

	const handleViewDetails = useCallback(
		(eventId: string) => {
			const event = events.find((e) => e.id === eventId)
			if (event) {
				dataTableEditor.handleEditReservation(event)
			}
		},
		[events, dataTableEditor]
	)

	// Data table editor event handlers
	const handleEventAdded = useCallback(
		(event: unknown) => {
			if (event && typeof event === 'object') {
				const calendarEvent = convertDataTableEventToCalendarEvent(
					event as Record<string, unknown>
				)
				const startStr =
					typeof calendarEvent.start === 'string' ? calendarEvent.start : ''
				let endStr = ''
				if (typeof calendarEvent.end === 'string') {
					endStr = calendarEvent.end
				} else if (typeof calendarEvent.start === 'string') {
					endStr = calendarEvent.start
				}
				const reservationIdNormalized = (() => {
					const r = calendarEvent.extendedProps?.reservationId as
						| number
						| string
						| undefined
					if (typeof r === 'number') {
						return r
					}
					if (typeof r === 'string') {
						const n = Number(r)
						return Number.isNaN(n) ? undefined : n
					}
					return
				})()
				addEvent({
					id: calendarEvent.id,
					title: calendarEvent.title,
					start: startStr,
					end: endStr,
					extendedProps: {
						...calendarEvent.extendedProps,
						type:
							typeof calendarEvent.extendedProps?.type === 'number'
								? calendarEvent.extendedProps.type
								: Number(calendarEvent.extendedProps?.type) || 0,
						reservationId: reservationIdNormalized,
					},
				})

				const slotDate = calendarEvent.extendedProps?.slotDate
				const slotTime = calendarEvent.extendedProps?.slotTime
				if (slotDate && slotTime) {
					try {
						const api = calendarRef?.current?.getApi?.()
						if (api) {
							reflowSlot(
								api,
								String(slotDate),
								String(slotTime).slice(0, SLOT_PREFIX_LEN)
							)
						}
					} catch {
						/* noop */
					}
				}
			}
		},
		[addEvent, calendarRef]
	)

	const handleEventModified = useCallback(
		(eventId: string, event: unknown) => {
			if (!(event && typeof event === 'object')) {
				return
			}

			const calendarEvent = convertDataTableEventToCalendarEvent(
				event as Record<string, unknown>
			)

			let eventApi: EventApi | undefined
			try {
				const api = calendarRef?.current?.getApi?.()
				const maybeEvent = api?.getEventById?.(String(eventId))
				if (maybeEvent) {
					eventApi = maybeEvent
				}
			} catch {
				// ignore calendar API access errors
			}

			const startAsString =
				typeof calendarEvent.start === 'string'
					? calendarEvent.start
					: (eventApi?.startStr ??
						(calendarEvent.start instanceof Date
							? calendarEvent.start.toISOString()
							: ''))
			const endAsString = (() => {
				if (typeof calendarEvent.end === 'string') {
					return calendarEvent.end
				}
				if (calendarEvent.end instanceof Date) {
					return calendarEvent.end.toISOString()
				}
				return eventApi?.endStr
			})()

			const rawExt = calendarEvent.extendedProps || {}
			const normalizedExt: {
				[key: string]: unknown
				type?: number
				cancelled?: boolean
				reservationId?: number
			} = {}
			for (const [key, value] of Object.entries(rawExt)) {
				if (value === undefined) {
					continue
				}
				if (key === 'type') {
					const parsed = typeof value === 'number' ? value : Number(value)
					if (Number.isFinite(parsed)) {
						normalizedExt.type = parsed as number
					}
					continue
				}
				if (key === 'reservationId') {
					const parsed = Number(value)
					if (Number.isFinite(parsed)) {
						normalizedExt.reservationId = parsed
					}
					continue
				}
				if (key === 'cancelled') {
					normalizedExt.cancelled = Boolean(value)
					continue
				}
				normalizedExt[key] = value
			}

			if (eventApi) {
				try {
					eventApi.setProp('title', calendarEvent.title)
				} catch {
					/* noop */
				}
				for (const [key, value] of Object.entries(normalizedExt)) {
					if (value === undefined) {
						continue
					}
					try {
						;(eventApi as EventApi).setExtendedProp?.(key, value)
					} catch {
						/* noop */
					}
				}
				if (startAsString) {
					try {
						;(eventApi as EventApi).setDates?.(
							startAsString,
							endAsString ?? startAsString
						)
					} catch {
						/* noop */
					}
					const slotDate = normalizedExt.slotDate || startAsString.split('T')[0]
					const slotTime =
						normalizedExt.slotTime ||
						startAsString.split('T')[1]?.slice(0, SLOT_PREFIX_LEN)
					if (slotDate && slotTime) {
						try {
							const api = calendarRef?.current?.getApi?.()
							if (api) {
								reflowSlot(api, String(slotDate), String(slotTime))
							}
						} catch {
							/* noop */
						}
					}
				}
			}

			const updatePayload: Partial<CalendarEvent> = {
				id: calendarEvent.id,
				title: calendarEvent.title,
				start: startAsString,
				extendedProps: normalizedExt,
			}
			if (endAsString !== undefined) {
				updatePayload.end = endAsString
			}

			updateEvent(eventId, updatePayload)
		},
		[calendarRef, updateEvent]
	)

	const handleEventCancelled = useCallback(
		(eventId: string) => {
			// Get slot info before removing the event so we can reflow
			let slotDate: string | undefined
			let slotTime: string | undefined

			try {
				const api = calendarRef?.current?.getApi?.()
				const eventApi = api?.getEventById?.(String(eventId))

				// Extract slot info from the event before removing it
				if (eventApi) {
					const extProps = (
						eventApi as { extendedProps?: Record<string, unknown> }
					).extendedProps
					slotDate = String(extProps?.slotDate || '')
					slotTime = String(extProps?.slotTime || '')

					// Remove the event from calendar API
					eventApi.remove?.()
				}
			} catch {
				/* noop */
			}

			// Remove the event from React state
			removeEvent(eventId)

			// Reflow the slot to close the gap (with suppression to prevent cascading updates)
			if (slotDate && slotTime) {
				setTimeout(() => {
					try {
						// Increment suppression depth
						const currentDepth =
							(globalThis as { __suppressEventChangeDepth?: number })
								.__suppressEventChangeDepth || 0
						;(
							globalThis as { __suppressEventChangeDepth?: number }
						).__suppressEventChangeDepth = currentDepth + 1

						const api = calendarRef?.current?.getApi?.()
						if (api) {
							reflowSlot(api, slotDate, slotTime)
						}

						// Decrement suppression depth after reflow
						setTimeout(() => {
							try {
								const d =
									(globalThis as { __suppressEventChangeDepth?: number })
										.__suppressEventChangeDepth || 0
								if (d > 0) {
									;(
										globalThis as { __suppressEventChangeDepth?: number }
									).__suppressEventChangeDepth = d - 1
								}
							} catch {
								/* noop */
							}
						}, 10)
					} catch {
						// On error, still decrement suppression
						const d =
							(globalThis as { __suppressEventChangeDepth?: number })
								.__suppressEventChangeDepth || 0
						if (d > 0) {
							;(
								globalThis as { __suppressEventChangeDepth?: number }
							).__suppressEventChangeDepth = d - 1
						}
					}
				}, STATE_SETTLE_DELAY_MS) // Small delay to allow state to settle
			}
		},
		[calendarRef, removeEvent]
	)

	return {
		handleEventChange,
		handleOpenConversation,
		handleCancelReservation,
		handleViewDetails,
		handleEventAdded,
		handleEventModified,
		handleEventCancelled,
	}
}
