import {
	getMessageDate,
	getMessageRole,
} from '@/features/dashboard/model/normalize'
import type { DashboardConversationMessage } from '@/features/dashboard/types'
import { average, median } from '@/shared/libs/math/stats'

const MILLISECONDS_PER_MINUTE = 60_000
const MINUTES_PER_MS = 1 / MILLISECONDS_PER_MINUTE
const MAX_ALLOWED_AVG_MINUTES = 60

export function computeResponseDurationsMinutes(
	entries: [string, DashboardConversationMessage[]][]
): number[] {
	const diffs: number[] = []
	for (const [, msgs] of entries) {
		const sorted = (Array.isArray(msgs) ? msgs : [])
			.map((m) => ({
				d: getMessageDate(m),
				role: getMessageRole(m).toLowerCase(),
			}))
			.filter((x) => Boolean(x.d))
			.sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime())
		for (let i = 1; i < sorted.length; i += 1) {
			const prev = sorted[i - 1]
			const curr = sorted[i]
			if (!prev) {
				continue
			}
			if (!curr) {
				continue
			}
			const prevIsCustomer = prev.role !== 'assistant'
			const currIsAssistant = curr.role === 'assistant'
			if (prevIsCustomer && currIsAssistant) {
				const deltaMs = (curr.d as Date).getTime() - (prev.d as Date).getTime()
				if (deltaMs > 0) {
					diffs.push(deltaMs * MINUTES_PER_MS)
				}
			}
		}
	}
	return diffs
}

export function computeResponseTimeStats(
	entries: [string, DashboardConversationMessage[]][]
): {
	avg: number
	median: number
	max: number
} {
	const mins = computeResponseDurationsMinutes(entries)
	const avgVal = Math.min(MAX_ALLOWED_AVG_MINUTES, average(mins))
	const medVal = median(mins)
	const maxVal = mins.length ? Math.max(...mins) : 0
	return {
		avg: Number.isFinite(avgVal) ? avgVal : 0,
		median: medVal,
		max: maxVal,
	}
}
