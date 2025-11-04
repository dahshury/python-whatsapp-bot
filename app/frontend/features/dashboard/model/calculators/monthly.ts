import {
	getMessageDate,
	getReservationDate,
} from '@/features/dashboard/model/normalize'
import type {
	DashboardConversationMessage,
	DashboardReservation,
	MonthlyTrend,
} from '@/features/dashboard/types'

export function computeMonthlyTrends(
	filteredReservations: [string, DashboardReservation[]][],
	filteredConversations: [string, DashboardConversationMessage[]][],
	locale: string
): MonthlyTrend[] {
	const monthMap = new Map<
		string,
		{ reservations: number; cancellations: number; conversations: number }
	>()
	for (const [, items] of filteredReservations) {
		for (const r of Array.isArray(items) ? items : []) {
			const d = getReservationDate(r)
			if (!d) {
				continue
			}
			const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
			const entry = monthMap.get(key) || {
				reservations: 0,
				cancellations: 0,
				conversations: 0,
			}
			entry.reservations += 1
			if (r.cancelled === true) {
				entry.cancellations += 1
			}
			monthMap.set(key, entry)
		}
	}
	for (const [, msgs] of filteredConversations) {
		for (const m of Array.isArray(msgs) ? msgs : []) {
			const d = getMessageDate(m)
			if (!d) {
				continue
			}
			const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
			const entry = monthMap.get(key) || {
				reservations: 0,
				cancellations: 0,
				conversations: 0,
			}
			entry.conversations += 1
			monthMap.set(key, entry)
		}
	}
	return Array.from(monthMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([key, v]) => {
			const parts = key.split('-')
			const yearStr = parts[0]
			const monthStr = parts[1]
			const y = Number(yearStr)
			const m = Number(monthStr)
			const invalidYear = !y || Number.isNaN(y)
			const invalidMonth = !m || Number.isNaN(m)
			if (invalidYear || invalidMonth) {
				return null
			}
			const date = new Date(y, m - 1, 1)
			const loc = locale || 'en'
			const month = date.toLocaleString(loc, { month: 'short' })
			return {
				month,
				reservations: v.reservations,
				cancellations: v.cancellations,
				conversations: v.conversations,
			}
		})
		.filter((x): x is MonthlyTrend => x !== null)
}
