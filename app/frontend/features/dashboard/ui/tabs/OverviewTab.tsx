'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/shared/ui/skeleton'
import { KPICards } from '../../dashboard/kpi-cards'
import { OperationMetrics } from '../../dashboard/operation-metrics'
import type { DashboardData } from '../../types'

const TrendCharts = dynamic(
	() => import('../../dashboard/trend-charts').then((m) => m.TrendCharts),
	{ ssr: false, loading: () => <Skeleton className="h-[24rem] w-full" /> }
)

type OverviewTabProps = {
	isLocalized: boolean
	safeDashboard: DashboardData
}

export function OverviewTab({ isLocalized, safeDashboard }: OverviewTabProps) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<div className="lg:col-span-12">
				<KPICards
					isLocalized={isLocalized}
					prometheusMetrics={safeDashboard.prometheusMetrics}
					stats={safeDashboard.stats}
				/>
			</div>
			<div className="lg:col-span-4">
				<OperationMetrics
					isLocalized={isLocalized}
					prometheusMetrics={safeDashboard.prometheusMetrics}
				/>
			</div>
			<div className="lg:col-span-8">
				<TrendCharts
					customerSegments={safeDashboard.customerSegments}
					dailyTrends={safeDashboard.dailyTrends}
					dayOfWeekData={safeDashboard.dayOfWeekData}
					funnelData={safeDashboard.funnelData}
					isLocalized={isLocalized}
					monthlyTrends={safeDashboard.monthlyTrends}
					timeSlots={safeDashboard.timeSlots}
					typeDistribution={safeDashboard.typeDistribution}
					variant="compact"
				/>
			</div>
		</div>
	)
}
