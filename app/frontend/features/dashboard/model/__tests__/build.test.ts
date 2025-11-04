import { describe, expect, it } from 'vitest'
import { buildDashboardData } from '@/features/dashboard/model/build'
import type {
	DashboardConversationMessage,
	DashboardReservation,
	PrometheusMetrics,
} from '@/features/dashboard/types'

describe('buildDashboardData orchestrator', () => {
	it('produces basic stats for simple inputs', () => {
		const conversations: Record<string, DashboardConversationMessage[]> = {
			wa1: [
				{
					ts: '2024-01-01T09:00:00.000Z',
					role: 'user',
					text: 'hi',
				} as DashboardConversationMessage,
			],
		}
		const reservations: Record<string, DashboardReservation[]> = {
			wa1: [
				{
					start: '2024-01-01T10:00:00.000Z',
					cancelled: false,
				} as DashboardReservation,
			],
		}
		const options = {
			activeRange: { fromDate: '2023-12-31', toDate: '2024-01-02' },
			prometheusMetrics: {} as PrometheusMetrics,
		}
		const data = buildDashboardData(conversations, reservations, options)
		expect(data._isMockData).toBe(false)
		expect(data.stats.totalReservations).toBe(1)
		expect(data.stats.uniqueCustomers).toBe(1)
		expect(data.stats.returningCustomers).toBe(0)
		const PERCENT = 100
		expect(data.stats.conversionRate).toBe(PERCENT)
	})
})
