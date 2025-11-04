'use client'

import { Badge } from '@ui/badge'
import { motion } from 'framer-motion'
import { Calendar, CheckCircle, Edit, X, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PrometheusMetrics } from '@/features/dashboard/types'
import { i18n } from '@/shared/libs/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { Skeleton } from '@/shared/ui/skeleton'

const PERCENT_SCALE = 100
const METRIC_ANIMATION_DURATION = 0.4
const METRIC_ANIMATION_DELAY_STEP = 0.1
const METRIC_INITIAL_OFFSET = 20

type OperationMetricsProps = {
	prometheusMetrics: PrometheusMetrics
	isLocalized: boolean
}

type OperationMetricCardProps = {
	title: string
	icon: ReactNode
	attempts: number
	success: number
	failures: number
	isLocalized: boolean
}

function OperationMetricCard({
	title,
	icon,
	attempts,
	success,
	failures,
	isLocalized,
}: OperationMetricCardProps) {
	const successRate = attempts > 0 ? (success / attempts) * PERCENT_SCALE : 0
	const failureRate = attempts > 0 ? (failures / attempts) * PERCENT_SCALE : 0

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			initial={{ opacity: 0, y: METRIC_INITIAL_OFFSET }}
			transition={{ duration: METRIC_ANIMATION_DURATION }}
		>
			<Card className="h-full">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">{title}</CardTitle>
					{icon}
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="font-bold text-2xl">{attempts}</div>
						<Badge className="text-xs" variant="outline">
							{i18n.getMessage('operation_attempts', isLocalized)}
						</Badge>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-1">
								<CheckCircle className="h-3 w-3 text-chart-1" />
								<span className="text-chart-1">{success}</span>
							</div>
							<div className="flex items-center gap-1">
								<XCircle className="h-3 w-3 text-destructive" />
								<span className="text-destructive">{failures}</span>
							</div>
						</div>

						<Progress className="h-2" value={successRate} />

						<div className="flex justify-between text-muted-foreground text-xs">
							<span>
								{successRate.toFixed(1)}%{' '}
								{i18n.getMessage('operation_success', isLocalized)}
							</span>
							<span>
								{failureRate.toFixed(1)}%{' '}
								{i18n.getMessage('operation_failed', isLocalized)}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}

export function OperationMetrics({
	prometheusMetrics,
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

	const operations = [
		{
			title: i18n.getMessage('operation_reservations', isLocalized),
			icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
			attempts: prometheusMetrics.reservations_requested_total || 0,
			success: prometheusMetrics.reservations_successful_total || 0,
			failures: prometheusMetrics.reservations_failed_total || 0,
		},
		{
			title: i18n.getMessage('operation_cancellations', isLocalized),
			icon: <X className="h-4 w-4 text-muted-foreground" />,
			attempts:
				prometheusMetrics.reservations_cancellation_requested_total || 0,
			success:
				prometheusMetrics.reservations_cancellation_successful_total || 0,
			failures: prometheusMetrics.reservations_cancellation_failed_total || 0,
		},
		{
			title: i18n.getMessage('operation_modifications', isLocalized),
			icon: <Edit className="h-4 w-4 text-muted-foreground" />,
			attempts:
				prometheusMetrics.reservations_modification_requested_total || 0,
			success:
				prometheusMetrics.reservations_modification_successful_total || 0,
			failures: prometheusMetrics.reservations_modification_failed_total || 0,
		},
	]

	return (
		<div className="space-y-4">
			<h2 className="font-semibold text-xl">
				{i18n.getMessage('operation_metrics_title', isLocalized)}
			</h2>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{operations.map((operation, index) => (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: METRIC_INITIAL_OFFSET }}
						key={operation.title}
						transition={{
							delay: index * METRIC_ANIMATION_DELAY_STEP,
							duration: METRIC_ANIMATION_DURATION,
						}}
					>
						<OperationMetricCard
							attempts={operation.attempts}
							failures={operation.failures}
							icon={operation.icon}
							isLocalized={isLocalized}
							success={operation.success}
							title={operation.title}
						/>
					</motion.div>
				))}
			</div>
		</div>
	)
}
