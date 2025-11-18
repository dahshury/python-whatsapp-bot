import type {
	NotificationItem,
	NotificationType,
	ReservationData,
} from '../types'
import {
	buildCompositeKey,
	buildNotificationId,
	getWaId,
	toTimestampMs,
} from '../value-objects'

const SUPPRESSED_NOTIFICATION_TYPES = new Set([
	'notifications_history',
	'customer_favorite_updated',
])

const normalizeTypeForComparison = (type?: string): string => {
	if (typeof type !== 'string') {
		return ''
	}
	return type.trim().toLowerCase()
}

const sanitizeNotificationType = (type?: string): string => {
	if (typeof type !== 'string') {
		return ''
	}
	return type.trim()
}

const shouldRenderNotificationType = (type?: string): boolean => {
	const normalized = normalizeTypeForComparison(type)
	if (!normalized) {
		return true
	}
	return !SUPPRESSED_NOTIFICATION_TYPES.has(normalized)
}

export type GetMessage = (key: string) => string
export type ResolveCustomerName = (
	waId?: string,
	fallbackName?: string
) => string | undefined

const pickCustomerLabel = (
	data: ReservationData,
	resolveCustomerName?: ResolveCustomerName
): string => {
	const wa = getWaId(data as unknown as Record<string, unknown>)
	const fallback = data?.customer_name
	if (resolveCustomerName) {
		return (
			resolveCustomerName(wa || undefined, fallback || undefined) ||
			wa ||
			String(fallback || '')
		)
	}
	return wa || String(fallback || '')
}

export const composeNotificationText = (
	type: NotificationType | string,
	data: ReservationData,
	getMessage: GetMessage,
	resolveCustomerName?: ResolveCustomerName
): string => {
	if (type === 'reservation_created') {
		return `${getMessage('toast_reservation_created')}: ${pickCustomerLabel(data, resolveCustomerName)} ${
			data.date ?? ''
		} ${data.time_slot ?? ''}`.trim()
	}
	if (type === 'reservation_updated' || type === 'reservation_reinstated') {
		return `${getMessage('toast_reservation_modified')}: ${pickCustomerLabel(data, resolveCustomerName)} ${
			data.date ?? ''
		} ${data.time_slot ?? ''}`.trim()
	}
	if (type === 'reservation_cancelled') {
		return `${getMessage('toast_reservation_cancelled')}: ${getWaId(
			data as unknown as Record<string, unknown>
		)}`
	}
	if (type === 'conversation_new_message') {
		return `${getMessage('new_message')}: ${pickCustomerLabel(data, resolveCustomerName)}`
	}
	if (type === 'vacation_period_updated') {
		return getMessage('toast_vacation_periods_updated')
	}
	return String(type)
}

type HistoryRecord = {
	id?: number | string
	type?: string
	timestamp?: string | number
	data?: Record<string, unknown>
}

export const mapHistoryItems = (
	records: HistoryRecord[] | undefined,
	options: {
		getMessage: GetMessage
		resolveCustomerName?: ResolveCustomerName
	}
): NotificationItem[] => {
	const list = Array.isArray(records) ? records : []
	const mapped: NotificationItem[] = list
		.filter((record) => shouldRenderNotificationType(record.type))
		.map((r) => {
			const ts = toTimestampMs(r.timestamp)
			const d = (r.data || {}) as ReservationData
			const type = sanitizeNotificationType(r.type)
			const compositeKey = buildCompositeKey(type, r.data)
			return {
				id: buildNotificationId(ts, compositeKey),
				text: composeNotificationText(
					type,
					d,
					options.getMessage,
					options.resolveCustomerName
				),
				timestamp: ts,
				unread: false,
				type: type as NotificationType,
				data: r.data || {},
			}
		})
		.filter(Boolean)

	mapped.sort((a, b) => b.timestamp - a.timestamp)
	return mapped
}

type LiveEventDetail = {
	type?: string
	data?: Record<string, unknown>
	ts?: number | string
}

export const mapLiveEvent = (
	detail: LiveEventDetail,
	options: {
		getMessage: GetMessage
		resolveCustomerName?: ResolveCustomerName
	}
): NotificationItem | null => {
	if (!shouldRenderNotificationType(detail.type)) {
		return null
	}
	const ts = toTimestampMs(detail.ts as unknown as string | number | undefined)
	const type = sanitizeNotificationType(detail.type)
	const compositeKey = buildCompositeKey(type, detail.data)
	const d = (detail.data || {}) as ReservationData
	return {
		id: buildNotificationId(ts, compositeKey),
		text: composeNotificationText(
			type,
			d,
			options.getMessage,
			options.resolveCustomerName
		),
		timestamp: ts,
		unread: true, // caller can override based on UI state
		type: type as NotificationType,
		data: detail.data || {},
	}
}
