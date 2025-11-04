import { getReservationDate } from '@/features/dashboard/model/normalize'
import type {
	DashboardReservation,
	DayOfWeekData,
} from '@/features/dashboard/types'

export function computeDayOfWeekData(
	entries: [string, DashboardReservation[]][]
): DayOfWeekData[] {
	const weekdays = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	] as const
	const map = new Map<string, { reservations: number; cancellations: number }>()
	for (const [, items] of entries) {
		for (const r of Array.isArray(items) ? items : []) {
			const d = getReservationDate(r)
			if (!d) {
				continue
			}
			const dayIndex = d.getDay()
			if (dayIndex < 0 || dayIndex >= weekdays.length) {
				continue
			}
			const day = weekdays[dayIndex]
			const entry = map.get(day || '') || { reservations: 0, cancellations: 0 }
			entry.reservations += 1
			if (r.cancelled === true) {
				entry.cancellations += 1
			}
			map.set(day || '', entry)
		}
	}
	const PERCENT = 100
	return Array.from(map.entries()).map(([day, v]) => ({
		day,
		reservations: v.reservations,
		cancellations: v.cancellations,
		cancelRate:
			v.reservations > 0 ? (v.cancellations / v.reservations) * PERCENT : 0,
	}))
}
