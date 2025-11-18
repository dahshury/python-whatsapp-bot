'use client'

import { Calendar, Gauge } from 'lucide-react'
import type {
	DashboardStats,
	PrometheusMetrics,
} from '@/features/dashboard/types'
import { i18n } from '@/shared/libs/i18n'
import { AnalyticsCard } from '@/shared/ui/analytics-card'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

const PERCENT_SCALE = 100
const PERCENT_MAX = 100
const PERCENT_MULTIPLIER = 100
const BYTES_PER_KIB = 1024
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB
const BYTES_PER_GIB = BYTES_PER_MIB * BYTES_PER_KIB
const MEMORY_USAGE_FALLBACK_GIB = 0.5
const DEFAULT_MEMORY_CAPACITY_GIB = 8
const CPU_USAGE_FALLBACK_PERCENT = 45.2

type OperationMetricsProps = {
	prometheusMetrics: PrometheusMetrics
	stats: DashboardStats
	dailyTrends: Array<{
		date: string
		reservations: number
		cancellations: number
		modifications: number
	}>
	isLocalized: boolean
}

const clampPercent = (value?: number) => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return 0
	}
	return Math.max(0, Math.min(PERCENT_MAX, value))
}

const formatMemoryUsage = (bytes?: number) => {
	if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
		return `${MEMORY_USAGE_FALLBACK_GIB.toFixed(1)}GB`
	}

	if (bytes >= BYTES_PER_GIB) {
		return `${(bytes / BYTES_PER_GIB).toFixed(1)}GB`
	}
	if (bytes >= BYTES_PER_MIB) {
		return `${(bytes / BYTES_PER_MIB).toFixed(1)}MB`
	}
	return `${(bytes / BYTES_PER_KIB).toFixed(1)}KB`
}

const getMemoryUsagePercent = (bytes?: number) => {
	const fallbackBytes = MEMORY_USAGE_FALLBACK_GIB * BYTES_PER_GIB
	const usage =
		typeof bytes === 'number' && !Number.isNaN(bytes) ? bytes : fallbackBytes
	const capacity = DEFAULT_MEMORY_CAPACITY_GIB * BYTES_PER_GIB
	return (usage / capacity) * PERCENT_MULTIPLIER
}

export function OperationMetrics({
	prometheusMetrics,
	stats,
	dailyTrends,
	isLocalized,
}: OperationMetricsProps) {
	const hasMetrics =
		prometheusMetrics && Object.keys(prometheusMetrics).length > 0

	if (!hasMetrics) {
		return (
			<div className="space-y-4">
				<h2 className="font-semibold text-xl">
					{i18n.getMessage('operation_metrics_title', isLocalized)}
				</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={`operation-skeleton-card-${i + 1}`}>
							<CardHeader className="space-y-0 pb-2">
								<Skeleton className="h-4 w-[7.5rem]" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-[5rem]" />
								<Skeleton className="mt-2 h-3 w-[6.25rem]" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		)
	}

	// Calculate total reservations (sum of all operations)
	const totalReservations =
		(Number(prometheusMetrics.reservations_requested_total) || 0) +
		(Number(prometheusMetrics.reservations_cancellation_requested_total) || 0) +
		(Number(prometheusMetrics.reservations_modification_requested_total) || 0)

	// Calculate overall success rate
	const totalSuccess =
		(Number(prometheusMetrics.reservations_successful_total) || 0) +
		(Number(prometheusMetrics.reservations_cancellation_successful_total) ||
			0) +
		(Number(prometheusMetrics.reservations_modification_successful_total) || 0)
	const overallSuccessRate =
		totalReservations > 0
			? (totalSuccess / totalReservations) * PERCENT_SCALE
			: 0

	const locale = isLocalized ? 'ar-SA' : 'en-US'

	// Calculate totals from dailyTrends (same source as the daily trends graph)
	const totalReservationsFromTrends = dailyTrends.reduce(
		(sum, day) => sum + (Number(day.reservations) || 0),
		0
	)
	const totalCancellationsFromTrends = dailyTrends.reduce(
		(sum, day) => sum + (Number(day.cancellations) || 0),
		0
	)
	const totalModificationsFromTrends = dailyTrends.reduce(
		(sum, day) => sum + (Number(day.modifications) || 0),
		0
	)

	// Find max value for bar scaling (use actual numbers, not percentages)
	const maxValue = Math.max(
		totalReservationsFromTrends,
		totalCancellationsFromTrends,
		totalModificationsFromTrends,
		1 // Avoid division by zero
	)

	const operationsData = [
		{
			label: i18n.getMessage('operation_reservations', isLocalized),
			value: totalReservationsFromTrends,
			maxValue,
		},
		{
			label: i18n.getMessage('operation_cancellations', isLocalized),
			value: totalCancellationsFromTrends,
			maxValue,
		},
		{
			label: i18n.getMessage('operation_modifications', isLocalized),
			value: totalModificationsFromTrends,
			maxValue,
		},
		{
			label: i18n.getMessage('kpi_returning_rate', isLocalized),
			value: clampPercent(stats.returningRate),
			maxValue: 100, // Returning rate is a percentage
		},
	]

	const operationsCardTitle =
		i18n.getMessage('operation_activity_breakdown', isLocalized) ||
		i18n.getMessage('operation_metrics_title', isLocalized)

	const operationsCardTotal = totalReservationsFromTrends.toLocaleString(locale)

	const cpuPercent =
		typeof prometheusMetrics.cpu_percent === 'number'
			? prometheusMetrics.cpu_percent
			: CPU_USAGE_FALLBACK_PERCENT
	const cpuPercentValue = clampPercent(cpuPercent)
	const memoryUsagePercent = clampPercent(
		getMemoryUsagePercent(prometheusMetrics.memory_bytes)
	)
	const memoryUsageLabel = formatMemoryUsage(prometheusMetrics.memory_bytes)

	const systemData = [
		{
			label: i18n.getMessage('kpi_success_rate', isLocalized),
			value: clampPercent(overallSuccessRate),
			maxValue: 100,
		},
		{
			label: i18n.getMessage('kpi_cpu_usage', isLocalized),
			value: cpuPercentValue,
			maxValue: 100,
		},
		{
			label: `${i18n.getMessage('kpi_memory_usage', isLocalized)} (${memoryUsageLabel})`,
			value: memoryUsagePercent,
			maxValue: 100,
		},
	]

	const systemHealthScore =
		systemData.length > 0
			? systemData.reduce((sum, metric) => sum + metric.value, 0) /
				systemData.length
			: 0

	const systemCardTitle =
		i18n.getMessage('system_resource_overview', isLocalized) ||
		i18n.getMessage('kpi_cpu_usage', isLocalized)

	const systemCardTotal = `${clampPercent(systemHealthScore).toFixed(0)}%`

	return (
		<div className="space-y-4">
			<h2 className="font-semibold text-xl">
				{i18n.getMessage('operation_metrics_title', isLocalized)}
			</h2>

			<div className="grid gap-4 xl:grid-cols-2">
				<AnalyticsCard
					className="h-full"
					data={operationsData}
					icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
					isLocalized={isLocalized}
					title={operationsCardTitle}
					totalAmount={operationsCardTotal}
				/>

				<AnalyticsCard
					className="h-full"
					data={systemData}
					icon={<Gauge className="h-4 w-4 text-muted-foreground" />}
					isLocalized={isLocalized}
					title={systemCardTitle}
					totalAmount={systemCardTotal}
				/>
			</div>
		</div>
	)
}
