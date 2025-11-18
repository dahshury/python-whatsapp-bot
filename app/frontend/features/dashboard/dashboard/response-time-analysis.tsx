'use client'

import { Badge } from '@ui/badge'
import { motion } from 'framer-motion'
import { Clock, Minus, Timer, TrendingUp } from 'lucide-react'
import type { ConversationAnalysis } from '@/features/dashboard/types'
import { i18n } from '@/shared/libs/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'

const PERFORMANCE_VARIANT_FAST_THRESHOLD_MIN = 2
const PERFORMANCE_VARIANT_DEFAULT_THRESHOLD_MIN = 5
const PERFORMANCE_VARIANT_WARNING_THRESHOLD_MIN = 10
const PERFORMANCE_SCORE_BASE = 100
const PERFORMANCE_SCORE_DECAY_PER_MIN = 10
const PERFORMANCE_SCORE_SUCCESS_THRESHOLD = 80
const PERFORMANCE_SCORE_WARNING_THRESHOLD = 60
const METRIC_ANIMATION_DURATION = 0.4
const METRIC_ANIMATION_OFFSET = 20
const METRIC_ANIMATION_DELAY_STEP = 0.1

// Format response time: show seconds if less than 60 seconds, otherwise show minutes
function formatResponseTime(
	minutes: number,
	isLocalized: boolean
): { value: number; unit: string } {
	const seconds = minutes * 60
	if (seconds < 60) {
		return {
			value: seconds,
			unit: i18n.getMessage('msg_seconds', isLocalized) || 's',
		}
	}
	return {
		value: minutes,
		unit: i18n.getMessage('msg_minutes', isLocalized),
	}
}

type ResponseTimeAnalysisProps = {
	conversationAnalysis: ConversationAnalysis
	isLocalized: boolean
}

type ResponseTimeMetricProps = {
	title: string
	value: number
	unit: string
	icon: React.ReactNode
	variant?: 'default' | 'success' | 'warning' | 'danger'
	description?: string
}

function ResponseTimeMetric({
	title,
	value,
	unit,
	icon,
	variant = 'default',
	description,
}: ResponseTimeMetricProps) {
	const getVariantClasses = () => {
		switch (variant) {
			case 'success':
				return 'border-green-200 bg-green-50/50'
			case 'warning':
				return 'border-yellow-200 bg-yellow-50/50'
			case 'danger':
				return 'border-red-200 bg-red-50/50'
			default:
				return ''
		}
	}

	const getValueColor = () => {
		switch (variant) {
			case 'success':
				return 'text-green-700'
			case 'warning':
				return 'text-yellow-700'
			case 'danger':
				return 'text-red-700'
			default:
				return 'text-foreground'
		}
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			initial={{ opacity: 0, y: METRIC_ANIMATION_OFFSET }}
			transition={{ duration: METRIC_ANIMATION_DURATION }}
		>
			<Card className={`h-full ${getVariantClasses()}`}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">{title}</CardTitle>
					{icon}
				</CardHeader>
				<CardContent>
					<div className={`font-bold text-2xl ${getValueColor()}`}>
						{value.toFixed(1)}
						{unit}
					</div>
					{description && (
						<p className="mt-1 text-muted-foreground text-xs">{description}</p>
					)}
				</CardContent>
			</Card>
		</motion.div>
	)
}

export function ResponseTimeAnalysis({
	conversationAnalysis,
	isLocalized,
}: ResponseTimeAnalysisProps) {
	const { responseTimeStats } = conversationAnalysis

	// Determine performance levels based on response times
	const getPerformanceVariant = (
		time: number
	): 'success' | 'warning' | 'danger' | 'default' => {
		if (time <= PERFORMANCE_VARIANT_FAST_THRESHOLD_MIN) {
			return 'success'
		}
		if (time <= PERFORMANCE_VARIANT_DEFAULT_THRESHOLD_MIN) {
			return 'default'
		}
		if (time <= PERFORMANCE_VARIANT_WARNING_THRESHOLD_MIN) {
			return 'warning'
		}
		return 'danger'
	}

	const avgFormatted = formatResponseTime(responseTimeStats.avg, isLocalized)
	const medianFormatted = formatResponseTime(
		responseTimeStats.median,
		isLocalized
	)
	const maxFormatted = formatResponseTime(responseTimeStats.max, isLocalized)

	const responseTimeMetrics = [
		{
			title: i18n.getMessage('response_time_average', isLocalized),
			value: avgFormatted.value,
			unit: avgFormatted.unit,
			icon: <Clock className="h-4 w-4 text-muted-foreground" />,
			variant: getPerformanceVariant(responseTimeStats.avg),
			description: i18n.getMessage('response_time_avg_desc', isLocalized),
		},
		{
			title: i18n.getMessage('response_time_median', isLocalized),
			value: medianFormatted.value,
			unit: medianFormatted.unit,
			icon: <Minus className="h-4 w-4 text-muted-foreground" />,
			variant: getPerformanceVariant(responseTimeStats.median),
			description: i18n.getMessage('response_time_median_desc', isLocalized),
		},
		{
			title: i18n.getMessage('response_time_maximum', isLocalized),
			value: maxFormatted.value,
			unit: maxFormatted.unit,
			icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
			variant: getPerformanceVariant(responseTimeStats.max),
			description: i18n.getMessage('response_time_max_desc', isLocalized),
		},
	]

	// Calculate performance score based on average response time
	const performanceScore = Math.max(
		0,
		PERFORMANCE_SCORE_BASE -
			responseTimeStats.avg * PERFORMANCE_SCORE_DECAY_PER_MIN
	)
	const getScoreColor = (score: number) => {
		if (score >= PERFORMANCE_SCORE_SUCCESS_THRESHOLD) {
			return 'text-green-600'
		}
		if (score >= PERFORMANCE_SCORE_WARNING_THRESHOLD) {
			return 'text-yellow-600'
		}
		return 'text-red-600'
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-xl">
					{i18n.getMessage('response_time_analysis_title', isLocalized)}
				</h2>
				<Badge className={getScoreColor(performanceScore)} variant="outline">
					{i18n.getMessage('response_time_score', isLocalized)}:{' '}
					{performanceScore.toFixed(0)}%
				</Badge>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{responseTimeMetrics.map((metric, index) => (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: METRIC_ANIMATION_OFFSET }}
						key={metric.title}
						transition={{
							delay: index * METRIC_ANIMATION_DELAY_STEP,
							duration: METRIC_ANIMATION_DURATION,
						}}
					>
						<ResponseTimeMetric
							description={metric.description}
							icon={metric.icon}
							title={metric.title}
							unit={metric.unit}
							value={metric.value}
							variant={metric.variant}
						/>
					</motion.div>
				))}
			</div>

			{/* Performance Progress Bar */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<Timer className="h-4 w-4" />
						{i18n.getMessage('response_time_performance', isLocalized)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								{i18n.getMessage('response_time_performance_desc', isLocalized)}
							</span>
							<span
								className={`font-semibold text-sm ${getScoreColor(performanceScore)}`}
							>
								{performanceScore.toFixed(0)}%
							</span>
						</div>
						<Progress className="h-2" value={performanceScore} />
						<div className="flex justify-between text-muted-foreground text-xs">
							<span>{i18n.getMessage('response_time_slow', isLocalized)}</span>
							<span>{i18n.getMessage('response_time_fast', isLocalized)}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
