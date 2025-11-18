'use client'

import { i18n } from '@shared/libs/i18n'
import dynamic from 'next/dynamic'
import { AnalyticsDashboard } from '@/shared/ui/analytics-dashboard'
import { Skeleton } from '@/shared/ui/skeleton'
import { OperationMetrics } from '../../dashboard/operation-metrics'
import type { DashboardData } from '../../types'

const DailyTrendsOverview = dynamic(
	() =>
		import('../../dashboard/daily-trends-overview').then(
			(m) => m.DailyTrendsOverview
		),
	{ ssr: false, loading: () => <Skeleton className="h-[24rem] w-full" /> }
)

type OverviewTabProps = {
	isLocalized: boolean
	safeDashboard: DashboardData
}

export function OverviewTab({ isLocalized, safeDashboard }: OverviewTabProps) {
	return (
		<div className="space-y-6">
			{/* Main analytics cards with graphs */}
			<div className="space-y-4">
				<h2 className="font-semibold text-xl">
					{i18n.getMessage('kpi_performance_metrics', isLocalized)}
				</h2>
				<AnalyticsDashboard
					dailyTrends={safeDashboard.dailyTrends}
					isLocalized={isLocalized}
					safeStats={safeDashboard.stats}
				/>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<div className="lg:col-span-5">
					<OperationMetrics
						dailyTrends={safeDashboard.dailyTrends}
						isLocalized={isLocalized}
						prometheusMetrics={safeDashboard.prometheusMetrics}
						stats={safeDashboard.stats}
					/>
				</div>
				<div className="lg:col-span-7">
					<DailyTrendsOverview
						dailyTrends={safeDashboard.dailyTrends}
						isLocalized={isLocalized}
					/>
				</div>
			</div>
		</div>
	)
}
