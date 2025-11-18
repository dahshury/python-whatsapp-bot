// Notification value objects and helpers

export type Brand<TValue, TBrand extends string> = TValue & {
	readonly __brand: TBrand
}

export type NotificationId = Brand<string, 'NotificationId'>
export type WaId = Brand<string, 'WaId'>
export type TimestampMs = Brand<number, 'TimestampMs'>

export const getWaId = (data?: Record<string, unknown>): string => {
	try {
		const d = (data || {}) as { wa_id?: unknown; waId?: unknown }
		const val = (d.wa_id ?? d.waId) as unknown
		return typeof val === 'string' ? val : String(val ?? '')
	} catch {
		return ''
	}
}

export const toTimestampMs = (input: string | number | undefined): number => {
	if (typeof input === 'number' && Number.isFinite(input)) {
		return input as number
	}
	const iso = String(input ?? '')
	const parsed = new Date(iso).getTime()
	return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now()
}

export const buildCompositeKey = (
	type: string,
	data?: Record<string, unknown>
): string => {
	const d = (data || {}) as {
		id?: unknown
		wa_id?: unknown
		waId?: unknown
		date?: unknown
		time_slot?: unknown
	}
	const id = (d.id ?? d.wa_id ?? d.waId) as unknown
	const date = d.date as unknown
	const timeSlot = d.time_slot as unknown
	return `${String(type)}:${String(id ?? '')}:${String(date ?? '')}:${String(timeSlot ?? '')}`
}

export const buildNotificationId = (ts: number, compositeKey: string): string =>
	`${ts}:${compositeKey}`
