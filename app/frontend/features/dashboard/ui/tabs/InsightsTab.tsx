'use client'

import { i18n } from '@shared/libs/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { DashboardData } from '../../types'

const RESPONSE_TIME_GOOD_MAX_MINUTES = 2
const RESPONSE_TIME_OK_MAX_MINUTES = 5
const RESPONSE_TIME_ATTENTION_MAX_MINUTES = 10
const AVG_MESSAGES_HIGH_THRESHOLD = 20
const AVG_MESSAGES_MEDIUM_THRESHOLD = 10

type InsightsTabProps = {
	isLocalized: boolean
	safeDashboard: DashboardData
}

export function InsightsTab({ isLocalized, safeDashboard }: InsightsTabProps) {
	const responseTimeAvg =
		safeDashboard.conversationAnalysis.responseTimeStats.avg
	const avgMessages = safeDashboard.conversationAnalysis.avgMessagesPerCustomer

	return (
		<div className="space-y-6">
			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>
							{i18n.getMessage('response_time_insights', isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							{responseTimeAvg <= RESPONSE_TIME_GOOD_MAX_MINUTES && (
								<div className="rounded-lg border border-chart-1/30 bg-chart-1/20 p-3">
									<p className="text-chart-1">
										{i18n.getMessage('response_time_excellent', isLocalized)}
									</p>
								</div>
							)}
							{responseTimeAvg > RESPONSE_TIME_GOOD_MAX_MINUTES &&
								responseTimeAvg <= RESPONSE_TIME_OK_MAX_MINUTES && (
									<div className="rounded-lg border border-chart-2/30 bg-chart-2/20 p-3">
										<p className="text-chart-2">
											{i18n.getMessage('response_time_good', isLocalized)}
										</p>
									</div>
								)}
							{responseTimeAvg > RESPONSE_TIME_OK_MAX_MINUTES &&
								responseTimeAvg <= RESPONSE_TIME_ATTENTION_MAX_MINUTES && (
									<div className="rounded-lg border border-chart-3/30 bg-chart-3/20 p-3">
										<p className="text-chart-3">
											{i18n.getMessage(
												'response_time_needs_improvement',
												isLocalized
											)}
										</p>
									</div>
								)}
							{responseTimeAvg > RESPONSE_TIME_ATTENTION_MAX_MINUTES && (
								<div className="rounded-lg border border-destructive/30 bg-destructive/20 p-3">
									<p className="text-destructive">
										{i18n.getMessage('response_time_poor', isLocalized)}
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							{i18n.getMessage('conversation_insights', isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							{avgMessages >= AVG_MESSAGES_HIGH_THRESHOLD && (
								<div className="rounded-lg border border-chart-1/30 bg-chart-1/20 p-3">
									<p className="text-chart-1">
										{i18n.getMessage('conversation_insight_high', isLocalized)}
									</p>
								</div>
							)}
							{avgMessages >= AVG_MESSAGES_MEDIUM_THRESHOLD &&
								avgMessages < AVG_MESSAGES_HIGH_THRESHOLD && (
									<div className="rounded-lg border border-chart-2/30 bg-chart-2/20 p-3">
										<p className="text-chart-2">
											{i18n.getMessage(
												'conversation_insight_medium',
												isLocalized
											)}
										</p>
									</div>
								)}
							{avgMessages < AVG_MESSAGES_MEDIUM_THRESHOLD && (
								<div className="rounded-lg border border-chart-3/30 bg-chart-3/20 p-3">
									<p className="text-chart-3">
										{i18n.getMessage('conversation_insight_low', isLocalized)}
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							{i18n.getMessage('dashboard_business_insights', isLocalized)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="rounded-lg border-accent border-l-4 bg-accent/10 p-4">
								<h4 className="font-semibold text-accent-foreground">
									{i18n.getMessage('dashboard_peak_hours_title', isLocalized)}
								</h4>
								<p className="mt-1 text-accent-foreground/80 text-sm">
									{i18n.getMessage('dashboard_peak_hours_desc', isLocalized)}
								</p>
								<span className="mt-2 inline-block rounded-full bg-accent/20 px-2 py-1 text-accent text-xs">
									{i18n.getMessage('demo_data_warning', isLocalized)}
								</span>
							</div>

							<div className="rounded-lg border-chart-1 border-l-4 bg-chart-1/10 p-4">
								<h4 className="font-semibold text-chart-1">
									{i18n.getMessage(
										'dashboard_customer_retention_title',
										isLocalized
									)}
								</h4>
								<p className="mt-1 text-chart-1/80 text-sm">
									{isLocalized
										? `${safeDashboard.stats.returningRate.toFixed(1)}% من العملاء يعودون لحجوزات أخرى. هذا يدل على رضا جيد عن الخدمة.`
										: `${safeDashboard.stats.returningRate.toFixed(1)}% of customers return for follow-up appointments. This indicates good service satisfaction.`}
								</p>
								<span className="mt-2 inline-block rounded-full bg-chart-1/20 px-2 py-1 text-chart-1 text-xs">
									{i18n.getMessage('real_data_available', isLocalized)}
								</span>
							</div>

							<div className="rounded-lg border-chart-3 border-l-4 bg-chart-3/10 p-4">
								<h4 className="font-semibold text-chart-3">
									{i18n.getMessage(
										'dashboard_response_time_title',
										isLocalized
									)}
								</h4>
								<p className="mt-1 text-chart-3/80 text-sm">
									{isLocalized
										? `متوسط زمن الاستجابة هو ${(safeDashboard.stats.avgResponseTime * 60).toFixed(1)} ثانية. فكر في تطبيق ردود تلقائية للاستفسارات الشائعة.`
										: `Average response time is ${(safeDashboard.stats.avgResponseTime * 60).toFixed(1)} seconds. Consider implementing automated responses for common queries.`}
								</p>
								<span className="mt-2 inline-block rounded-full bg-chart-3/20 px-2 py-1 text-chart-3 text-xs">
									{i18n.getMessage('real_data_available', isLocalized)}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
