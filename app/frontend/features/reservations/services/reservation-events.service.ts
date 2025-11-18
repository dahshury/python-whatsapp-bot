import {
	getSlotDuration,
	getSlotTimes,
	SLOT_DURATION_HOURS,
} from '@shared/libs/calendar/calendar-config'
import { resolveCustomerDisplayName } from '@shared/libs/customer-name'
import { to24h } from '@shared/libs/utils'
import type { CalendarEvent } from '@/entities/event'
import type { AppConfig as LegacyAppConfig } from '@/shared/services/config-service'

type ReservationItem = {
	date: string
	time_slot: string
	customer_name?: string
	title?: string
	[key: string]: unknown
}

type ConversationItem = {
	customer_name?: string
	[key: string]: unknown
}

const DEFAULT_SECRETARY_CAPACITY = 6
const MIN_EVENT_DURATION_MINUTES = 5
const MIN_SLOT_MINUTES = 15

const resolveEventDurationMinutes = (
	options: ReservationProcessingOptions,
	context: { date: string; reservationType: number | undefined }
): number => {
	const typeKey =
		typeof context.reservationType === 'number'
			? String(context.reservationType)
			: null
	const { eventDurationSettings, slotCapacitySettings, calendarConfig } =
		options

	if (eventDurationSettings && eventDurationSettings.strategy === 'manual') {
		const perType = eventDurationSettings.perTypeMinutes ?? {}
		const override = typeKey ? perType[typeKey] : undefined
		const baseMinutes = override ?? eventDurationSettings.defaultMinutes
		return Math.max(MIN_EVENT_DURATION_MINUTES, baseMinutes)
	}

	const secretaryCapacity =
		slotCapacitySettings?.secretary.totalMax ?? DEFAULT_SECRETARY_CAPACITY
	const slotDurationHours = calendarConfig
		? getSlotDuration(new Date(`${context.date}T00:00:00`), calendarConfig)
		: SLOT_DURATION_HOURS
	const slotMinutes = Math.max(
		MIN_SLOT_MINUTES,
		Math.round((slotDurationHours || SLOT_DURATION_HOURS) * 60)
	)
	const derived = Math.floor(
		slotMinutes / Math.max(1, secretaryCapacity || DEFAULT_SECRETARY_CAPACITY)
	)
	return Math.max(MIN_EVENT_DURATION_MINUTES, derived)
}

export type ReservationProcessingOptions = {
	freeRoam: boolean
	isLocalized: boolean
	vacationPeriods: Array<{ start: string | Date; end: string | Date }>
	customerNames?: Record<
		string,
		{ wa_id: string; customer_name?: string | null }
	>
	excludeConversations?: boolean
	ageByWaId?: Record<string, number | null> | null
	conversationsByUser?: Record<string, unknown[]>
	documentStatus?: Record<string, boolean>
	calendarConfig?: LegacyAppConfig | null
	eventDurationSettings?: {
		strategy: 'auto' | 'manual'
		defaultMinutes: number
		perTypeMinutes: Record<string, number>
	} | null
	slotCapacitySettings?: {
		agent: { totalMax: number }
		secretary: { totalMax: number }
	} | null
}

// Minimal interface describing the calendar adapter used by reservation services
export type CalendarIntegrationService = {
	reflowSlot: (date: string, time: string) => void
	updateSize: () => void
	updateEventProperties: (
		eventId: string,
		props: { title?: string; type?: number; cancelled?: boolean }
	) => void
	updateEventTiming: (
		eventId: string,
		prevStartIso: string,
		nextStartIso: string
	) => void
	markEventCancelled: (eventId: string) => void
	removeEvent: (eventId: string) => void
	isTimeGridView: () => boolean
}

export function getReservationEventProcessor() {
	return {
		generateCalendarEvents(
			reservationsByUser: Record<string, ReservationItem[]>,
			conversationsByUser: Record<string, ConversationItem[]>,
			options: ReservationProcessingOptions
		): CalendarEvent[] {
			if (!reservationsByUser || typeof reservationsByUser !== 'object') {
				return []
			}

			const events: CalendarEvent[] = []

			const groupMap: Record<
				string,
				Array<{ waId: string; r: ReservationItem }>
			> = {}
			for (const [waId, list] of Object.entries(reservationsByUser)) {
				for (const r of list || []) {
					const dateStr = r.date
					const timeStr = r.time_slot
					if (!(dateStr && timeStr)) {
						continue
					}
					const baseTime = toSlotBase(
						dateStr,
						String(timeStr),
						options.freeRoam
					)
					const key = `${dateStr}_${baseTime}`
					if (!groupMap[key]) {
						groupMap[key] = [] as Array<{ waId: string; r: ReservationItem }>
					}
					groupMap[key].push({ waId, r })
				}
			}

			for (const arr of Object.values(groupMap)) {
				// Sort: Checkups (type 0) → Follow-ups (type 1), then by name
				arr.sort((a, b) => {
					const t1 = Number(a.r.type ?? 0)
					const t2 = Number(b.r.type ?? 0)
					if (t1 !== t2) {
						return t1 - t2
					}
					const n1 = a.r.customer_name || ''
					const n2 = b.r.customer_name || ''
					return n1.localeCompare(n2)
				})
			}

			const orderedGroups = Object.entries(groupMap).sort(([ka], [kb]) => {
				const [dateA, timeAraw] = (ka || '_').split('_')
				const [dateB, timeBraw] = (kb || '_').split('_')
				if (dateA !== dateB) {
					return String(dateA).localeCompare(String(dateB))
				}
				const timeA = to24h(String(timeAraw || '00:00'))
				const timeB = to24h(String(timeBraw || '00:00'))
				return timeA.localeCompare(timeB)
			})

			for (const [key, arr] of orderedGroups) {
				const [_dateStr, baseTimeRaw] = key.split('_')
				const baseTimeBound = to24h(String(baseTimeRaw || '00:00'))
				let offsetMinutes = 0
				const gapMinutes = 1
				for (const { waId, r } of arr) {
					try {
						const baseDate = String(r.date)
						const baseTime = baseTimeBound
						const type = Number((r as { type?: unknown }).type ?? 0)
						const durationMinutes = resolveEventDurationMinutes(options, {
							date: baseDate,
							reservationType: Number.isFinite(type) ? type : undefined,
						})
						const clampedDuration = Math.max(
							MIN_EVENT_DURATION_MINUTES,
							durationMinutes
						)
						const startTime = addMinutesToClock(
							baseTime,
							Math.floor(offsetMinutes)
						)
						const endTime = addMinutesToClock(
							baseTime,
							Math.floor(offsetMinutes + clampedDuration)
						)
						offsetMinutes += clampedDuration + gapMinutes
						const cancelled = Boolean((r as { cancelled?: unknown }).cancelled)
						const isConversation = type === 2
						// Resolve customer name from customerNames map (backend no longer sends it)
						const customerName = resolveCustomerDisplayName({
							waId,
							candidates: [
								(r as { customer_name?: unknown }).customer_name,
								(r as { title?: unknown }).title,
								options.customerNames?.[waId]?.customer_name,
							],
							isLocalized: options.isLocalized,
						})

						// Get has_document from documentStatus map (preferred) or reservation data (fallback)
						const hasDocument = Boolean(
							options.documentStatus?.[waId] ??
								(r as { has_document?: boolean }).has_document ??
								false
						)

						const eventData: Record<string, unknown> = {
							id: String((r as { id?: unknown }).id ?? waId),
							title: customerName,
							start: `${baseDate}T${startTime}`,
							end: `${baseDate}T${endTime}`,
							editable: !(isConversation || cancelled),
							extendedProps: {
								type,
								cancelled,
								waId,
								slotDate: baseDate,
								slotTime: baseTime,
								customerName,
								hasDocument, // Add document status to extended props
								...(typeof (r as { id?: unknown }).id !== 'undefined'
									? {
											reservationId:
												typeof (r as { id?: unknown }).id === 'number'
													? ((r as { id?: number }).id as number)
													: (() => {
															const n = Number((r as { id?: unknown }).id)
															return Number.isFinite(n)
																? (n as number)
																: undefined
														})(),
										}
									: {}),
							},
						}
						if (cancelled) {
							;(eventData as { textColor?: string }).textColor = '#908584'
						}
						events.push(eventData as unknown as CalendarEvent)
					} catch {
						// Silently ignore errors when creating calendar event (data may be invalid)
					}
				}
			}

			events.sort((a, b) => String(a.start).localeCompare(String(b.start)))

			if (options.freeRoam && conversationsByUser) {
				for (const [waId, conv] of Object.entries(conversationsByUser)) {
					if (!Array.isArray(conv) || conv.length === 0) {
						continue
					}
					const last = conv.at(-1)
					if (!last?.date) {
						continue
					}
					const baseDate = String((last as { date?: unknown }).date)
					const baseTime = to24h(
						typeof (last as { time?: unknown }).time === 'string'
							? ((last as { time?: string }).time as string)
							: '00:00'
					)
					const startTime = `${baseTime}:00`
					const conversationDuration = resolveEventDurationMinutes(options, {
						date: baseDate,
						reservationType: 2,
					})
					const endTime = addMinutesToClock(
						baseTime,
						Math.max(MIN_EVENT_DURATION_MINUTES, conversationDuration)
					)
					// Resolve customer name from customerNames map (backend no longer sends it in conversations/reservations)
					const displayTitle = resolveCustomerDisplayName({
						waId,
						candidates: [
							(last as { customer_name?: unknown }).customer_name,
							options.customerNames?.[waId]?.customer_name,
						],
						isLocalized: options.isLocalized,
					})
					const conversationEvent = {
						id: String(waId),
						title: displayTitle,
						start: `${baseDate}T${startTime}`,
						end: `${baseDate}T${endTime}`,
						backgroundColor: '#EDAE49',
						borderColor: '#EDAE49',
						editable: false,
						extendedProps: { type: 2, cancelled: false },
					}
					events.push(conversationEvent as unknown as CalendarEvent)
				}
			}

			return events
		},
	}
}

function addMinutesToClock(baseTime: string, minutesToAdd: number): string {
	try {
		const parts = baseTime.split(':')
		const h = parts[0] ? Number.parseInt(parts[0], 10) : 0
		const m = parts[1] ? Number.parseInt(parts[1], 10) : 0
		let total =
			(Number.isFinite(h) ? h : 0) * 60 +
			(Number.isFinite(m) ? m : 0) +
			minutesToAdd
		if (total < 0) {
			total = 0
		}
		if (total > 24 * 60 - 1) {
			total = 24 * 60 - 1
		}
		const hh = String(Math.floor(total / 60)).padStart(2, '0')
		const mm = String(total % 60).padStart(2, '0')
		return `${hh}:${mm}:00`
	} catch {
		return `${baseTime}:00`
	}
}

function toSlotBase(
	dateStr: string,
	timeStr: string,
	freeRoam: boolean
): string {
	try {
		const baseTime = to24h(String(timeStr || '00:00'))
		const timeParts = baseTime.split(':')
		const hh = timeParts[0] ? Number.parseInt(timeParts[0], 10) : 0
		const mm = timeParts[1] ? Number.parseInt(timeParts[1], 10) : 0
		const minutes =
			(Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0)
		const day = new Date(`${dateStr}T00:00:00`)
		const { slotMinTime } = getSlotTimes(day, freeRoam, '')
		// Extract time format (HH:MM) from slot time string
		const TIME_FORMAT_LENGTH = 5
		const slotParts = String(slotMinTime || '00:00:00')
			.slice(0, TIME_FORMAT_LENGTH)
			.split(':')
		const sH = slotParts[0] ? Number.parseInt(slotParts[0], 10) : 0
		const sM = slotParts[1] ? Number.parseInt(slotParts[1], 10) : 0
		const minMinutes =
			(Number.isFinite(sH) ? sH : 0) * 60 + (Number.isFinite(sM) ? sM : 0)
		const duration = Math.max(60, (SLOT_DURATION_HOURS || 2) * 60)
		const rel = Math.max(0, minutes - minMinutes)
		const slotIndex = Math.floor(rel / duration)
		const baseMinutes = minMinutes + slotIndex * duration
		const hhOut = String(Math.floor(baseMinutes / 60)).padStart(2, '0')
		const mmOut = String(baseMinutes % 60).padStart(2, '0')
		return `${hhOut}:${mmOut}`
	} catch {
		return to24h(String(timeStr || '00:00'))
	}
}
