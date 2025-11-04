'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/shared/ui/skeleton'
import type { DashboardData } from '../../types'

const TrendCharts = dynamic(
	() => import('../../dashboard/trend-charts').then((m) => m.TrendCharts),
	{ ssr: false, loading: () => <Skeleton className="h-[28rem] w-full" /> }
)

type TrendsTabProps = {
	isLocalized: boolean
	safeDashboard: DashboardData
}

export function TrendsTab({ isLocalized, safeDashboard }: TrendsTabProps) {
	return (
		<TrendCharts
			customerSegments={safeDashboard.customerSegments}
			dailyTrends={safeDashboard.dailyTrends}
			dayOfWeekData={safeDashboard.dayOfWeekData}
			funnelData={safeDashboard.funnelData}
			isLocalized={isLocalized}
			monthlyTrends={safeDashboard.monthlyTrends}
			timeSlots={safeDashboard.timeSlots}
			typeDistribution={safeDashboard.typeDistribution}
			variant="full"
		/>
	)
}
