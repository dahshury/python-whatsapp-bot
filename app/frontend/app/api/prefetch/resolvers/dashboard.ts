import type { DashboardData } from '@/features/dashboard/types'
import { callPythonBackendCached } from '@/shared/libs/backend'
import { preloadPathModules } from '@/shared/libs/prefetch/registry'
import type { PrefetchQueryPayload, PrefetchResolver } from './types'

type DashboardStatsResponse = {
	success?: boolean
	data?: DashboardData
	message?: string
}

const DEFAULT_RANGE_DAYS = 30

function formatYmd(date: Date): string {
	return date.toISOString().slice(0, 10)
}

export const dashboardResolver: PrefetchResolver = async () => {
	await preloadPathModules('/dashboard').catch(() => {
		// Ignore module preload errors
	})

	const queries: PrefetchQueryPayload[] = []

	const toDate = new Date()
	const fromDate = new Date(toDate)
	fromDate.setDate(fromDate.getDate() - (DEFAULT_RANGE_DAYS - 1))
	const locale = 'en'

	const params = new URLSearchParams({
		from_date: formatYmd(fromDate),
		to_date: formatYmd(toDate),
		locale,
	})

	try {
		const stats = await callPythonBackendCached<DashboardStatsResponse>(
			`/stats?${params.toString()}`,
			undefined,
			{
				revalidate: 120,
				keyParts: [
					'prefetch',
					'dashboard',
					'stats',
					formatYmd(fromDate),
					formatYmd(toDate),
					locale,
				],
			}
		)
		if (stats?.success && stats.data) {
			queries.push({
				key: [
					'dashboard',
					'stats',
					formatYmd(fromDate),
					formatYmd(toDate),
					locale,
				],
				data: stats.data,
			})
		}
	} catch (_error) {
		// Prefetch errors are non-blocking
	}

	return {
		success: true,
		payload: queries.length ? { queries } : {},
	}
}
