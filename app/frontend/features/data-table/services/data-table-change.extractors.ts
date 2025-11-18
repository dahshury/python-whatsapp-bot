import type { RowChange } from '@/entities/event'
import type {
	CancelReservationParams,
	CreateReservationParams,
	MutateReservationParams,
} from '@/features/reservations/hooks'
import { extractCancellationData } from '@/features/reservations/utils/extract-cancellation-data'
import {
	getUnknownCustomerLabel,
	isSameAsWaId,
} from '@/shared/libs/customer-name'
import type { FormattingService } from '@/shared/libs/utils/formatting.service'
import { normalizePhoneForStorage } from '@/shared/libs/utils/phone-utils'
import type { CalendarEvent } from '@/widgets/data-table-editor/types'

/**
 * Payload extracted from modification changes
 */
export type ModificationPayload = {
	mutation: MutateReservationParams
	event: CalendarEvent
	waIdChange?: { oldWaId: string; newWaId: string } | null
}

/**
 * Helper to extract modification data from RowChange and CalendarEvent.
 * Preserves all original logic exactly as-is.
 */
export function extractModificationData(
	change: RowChange,
	original: CalendarEvent,
	formattingService: FormattingService,
	isLocalized: boolean
): ModificationPayload | null {
	const TIME_FORMAT_LENGTH = 5
	const evId = String(original.id)
	const waIdRaw = (original.extendedProps?.waId || original.id || '').toString()
	// Normalize the old waId to ensure consistent format (no + prefix)
	const waId = normalizePhoneForStorage(waIdRaw) || waIdRaw
	if (!waId) {
		return null
	}
	const prevStartStr = original.start || ''
	const prevDate = prevStartStr.split('T')[0]
	const prevTimeRaw =
		prevStartStr.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) || '00:00'
	let dateStrNew = prevDate
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
		dateStrNew = dPart
		timeStrNew = formattingService.to24h(
			tPart ||
				prevStartStr.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) ||
				'00:00'
		)
	} else {
		timeStrNew = formattingService.to24h(
			(change as unknown as { time?: string }).time ||
				prevStartStr.split('T')[1]?.slice(0, TIME_FORMAT_LENGTH) ||
				'00:00'
		)
		dateStrNew = ((change as unknown as { date?: string }).date ||
			prevDate) as string
	}

	const normalizedSlotTime = formattingService.normalizeToSlotBase(
		dateStrNew ?? '',
		timeStrNew ?? ''
	)
	const previousSlotTime = formattingService.normalizeToSlotBase(
		prevDate ?? '',
		prevTimeRaw ?? ''
	)
	const typeParsed = formattingService.parseType(
		change.type ?? original.extendedProps?.type,
		isLocalized
	)
	const typeValue = (() => {
		const maybeNumber = Number(typeParsed)
		if (Number.isFinite(maybeNumber)) {
			return maybeNumber
		}
		const fallback = Number(original.extendedProps?.type)
		return Number.isFinite(fallback) ? fallback : 0
	})()
	const hasPhoneChange = Object.hasOwn(change, 'phone')
	const phoneRaw = hasPhoneChange
		? String((change as unknown as { phone?: string }).phone ?? '')
		: ''
	const normalizedPhone = hasPhoneChange
		? normalizePhoneForStorage(phoneRaw)
		: ''
	const waIdNew = hasPhoneChange && normalizedPhone ? normalizedPhone : waId
	const titleNew = String(
		change.name ||
			original.title ||
			original.extendedProps?.customerName ||
			waId
	)
	const hasNameChange = Object.hasOwn(change, 'name')
	const customerNameNew = (() => {
		if (hasNameChange) {
			return titleNew
		}
		const existingName = original.extendedProps?.customerName
		if (typeof existingName === 'string' && existingName.length > 0) {
			return existingName
		}
		return titleNew
	})()
	const reservationId =
		typeof original.extendedProps?.reservationId === 'number'
			? original.extendedProps?.reservationId
			: undefined
	const prevDurationMinutes = (() => {
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
	const newStartIso = `${dateStrNew}T${timeStrNew}:00`
	const newEndIso = (() => {
		try {
			const MS_PER_MINUTE = 60_000
			const [h, m] = (timeStrNew || '00:00').split(':')
			const base = new Date(
				`${dateStrNew}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
			)
			const out = new Date(base.getTime() + prevDurationMinutes * MS_PER_MINUTE)
			return `${dateStrNew}T${String(out.getHours()).padStart(2, '0')}:${String(out.getMinutes()).padStart(2, '0')}:00`
		} catch {
			return newStartIso
		}
	})()
	const waIdChanged = hasPhoneChange && waIdNew.length > 0 && waIdNew !== waId
	const extendedProps = {
		...(original.extendedProps || {}),
		waId: waIdNew,
		wa_id: waIdNew,
		phone: waIdNew,
		slotDate: dateStrNew,
		slotTime: normalizedSlotTime,
		type: typeValue,
		cancelled: false,
		customerName: customerNameNew,
		...(reservationId !== undefined ? { reservationId } : {}),
	}
	const calendarEvent: CalendarEvent = {
		id: evId,
		title: titleNew,
		start: newStartIso,
		end: newEndIso,
		type: 'reservation',
		extendedProps,
	}
	const mutation: MutateReservationParams & {
		previousDate?: string
		previousTimeSlot?: string
	} = {
		waId: waIdNew,
		date: dateStrNew ?? '',
		time: normalizedSlotTime,
		title: titleNew,
		type: typeValue,
		approximate: true,
		isLocalized,
		...(prevDate !== undefined ? { previousDate: prevDate } : {}),
		previousTimeSlot: previousSlotTime,
	}
	if (reservationId !== undefined) {
		mutation.reservationId = reservationId
	}

	return {
		mutation,
		event: calendarEvent,
		waIdChange: waIdChanged ? { oldWaId: waId, newWaId: waIdNew } : null,
	}
}

/**
 * Helper to extract creation data from RowChange.
 * Preserves all original logic exactly as-is.
 */
export function extractCreationData(
	row: RowChange,
	formattingService: FormattingService,
	isLocalized: boolean
): CreateReservationParams | null {
	let dStr = ''
	let tStr = ''
	const st = row.scheduled_time as unknown

	if (st instanceof Date) {
		dStr = formattingService.formatDateOnly(st) || ''
		tStr =
			formattingService.formatHHmmInZone(st, 'Asia/Riyadh') ||
			formattingService.formatHHmm(st) ||
			''
	} else if (typeof st === 'string' && st.includes('T')) {
		const dateObj = new Date(st)
		dStr = formattingService.formatDateOnly(dateObj) || st.split('T')[0] || ''
		tStr =
			formattingService.formatHHmmInZone(dateObj, 'Asia/Riyadh') ||
			formattingService.formatHHmm(dateObj) ||
			''
	} else {
		dStr =
			formattingService.formatDateOnly(
				(row as unknown as { date?: string }).date
			) || ''
		tStr =
			formattingService.formatHHmmInZone(
				(row as unknown as { time?: string }).time,
				'Asia/Riyadh'
			) ||
			formattingService.formatHHmm(
				(row as unknown as { time?: string }).time
			) ||
			formattingService.to24h(
				String((row as unknown as { time?: string }).time || '')
			) ||
			''
	}

	const waId = normalizePhoneForStorage((row.phone || '').toString())
	const MIN_PHONE_LENGTH = 7
	if (!waId || waId.length < MIN_PHONE_LENGTH) {
		return null
	}

	const slotTime = formattingService.normalizeToSlotBase(dStr, tStr)
	const type = formattingService.parseType(row.type, isLocalized)
	const name = (row.name || '').toString().trim()
	const displayTitle =
		name && !isSameAsWaId(name, waId)
			? name
			: getUnknownCustomerLabel(isLocalized)

	return {
		waId,
		date: dStr,
		time: slotTime,
		title: displayTitle,
		type,
		isLocalized,
	}
}

/**
 * Helper to extract cancellation data from CalendarEvent (using shared utility).
 * Preserves all original logic exactly as-is.
 */
export function extractCancellationDataForGrid(
	original: CalendarEvent,
	isLocalized: boolean,
	freeRoam: boolean
): CancelReservationParams | null {
	return extractCancellationData(original, isLocalized, freeRoam)
}
