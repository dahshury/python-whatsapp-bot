'use client'

import { i18n } from '@shared/libs/i18n'
import { LayoutGrid, LineChart, MessageSquare, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import type { EnhancedDashboardControllerResult } from '../services/enhanced-dashboard-controller'
import { InsightsTab } from './tabs/InsightsTab'
import { MessagesTab } from './tabs/MessagesTab'
import { OverviewTab } from './tabs/OverviewTab'
import { TrendsTab } from './tabs/TrendsTab'

type DashboardTabsProps = {
	controller: EnhancedDashboardControllerResult
	isLocalized: boolean
}

// Skeleton loading placeholders for consistent keys
const OVERVIEW_SKELETON_COUNT = 8
const OPERATIONS_CARD_COUNT = 2
const OPERATIONS_BAR_COUNT = 4

const OVERVIEW_SKELETON_IDS = Array.from({
	length: OVERVIEW_SKELETON_COUNT,
}).map((_, i) => `overview-stat-skeleton-${i}`)
const OPERATIONS_CARD_IDS = Array.from({ length: OPERATIONS_CARD_COUNT }).map(
	(_, i) => `operations-card-skeleton-${i}`
)
const OPERATIONS_BAR_IDS = (cardIndex: number) =>
	Array.from({ length: OPERATIONS_BAR_COUNT }).map(
		(_, i) => `operations-bar-skeleton-${cardIndex}-${i}`
	)

const tabConfig = [
	{
		value: 'overview',
		labelKey: 'dashboard_overview',
		descriptionKey: 'dashboard_nav_overview_desc',
		icon: LayoutGrid,
	},
	{
		value: 'trends',
		labelKey: 'dashboard_trends',
		descriptionKey: 'dashboard_nav_trends_desc',
		icon: LineChart,
	},
	{
		value: 'messages',
		labelKey: 'dashboard_messages',
		descriptionKey: 'dashboard_nav_messages_desc',
		icon: MessageSquare,
	},
	{
		value: 'insights',
		labelKey: 'dashboard_insights',
		descriptionKey: 'dashboard_nav_insights_desc',
		icon: Sparkles,
	},
]

export function DashboardTabs({ controller, isLocalized }: DashboardTabsProps) {
	const { activeTab, isLoading, dashboardData, safeDashboard } = controller

	if (isLoading && !dashboardData) {
		return (
			<div className="space-y-8">
				<div className="space-y-4">
					<Skeleton className="h-5 w-48" />
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{OVERVIEW_SKELETON_IDS.map((skeletonId) => (
							<div
								className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm"
								key={skeletonId}
							>
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-5 w-5 rounded-full" />
								</div>
								<div className="mt-4 flex items-end justify-between gap-4">
									<div className="flex flex-col gap-2">
										<Skeleton className="h-8 w-24" />
										<Skeleton className="h-3 w-16" />
									</div>
									<Skeleton className="h-12 w-28 rounded-md" />
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{OPERATIONS_CARD_IDS.map((cardId, cardIndex) => (
						<div
							className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
							key={cardId}
						>
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-8 w-8 rounded-full" />
							</div>
							<Skeleton className="mt-4 h-9 w-24" />
							<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
								{OPERATIONS_BAR_IDS(cardIndex).map((barId) => (
									<div className="flex flex-col items-center gap-2" key={barId}>
										<Skeleton className="h-32 w-full rounded-lg" />
										<Skeleton className="h-3 w-16" />
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				<Card className="h-full">
					<CardHeader>
						<Skeleton className="h-5 w-48" />
						<Skeleton className="h-4 w-64" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-[21.875rem] w-full" />
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="mt-6 space-y-8">
			{activeTab === 'overview' && (
				<OverviewTab isLocalized={isLocalized} safeDashboard={safeDashboard} />
			)}
			{activeTab === 'trends' && (
				<TrendsTab isLocalized={isLocalized} safeDashboard={safeDashboard} />
			)}
			{activeTab === 'messages' && (
				<MessagesTab isLocalized={isLocalized} safeDashboard={safeDashboard} />
			)}
			{activeTab === 'insights' && (
				<InsightsTab isLocalized={isLocalized} safeDashboard={safeDashboard} />
			)}
		</div>
	)
}

export function DashboardTabButtons({
	controller,
	isLocalized,
}: DashboardTabsProps) {
	const { activeTab, setActiveTab } = controller
	return (
		<div className="rounded-2xl border border-border/60 bg-card/60 p-1 shadow-black/5 shadow-inner">
			<div className="flex flex-row gap-1">
				{tabConfig.map((tab) => {
					const Icon = tab.icon
					const isActive = activeTab === tab.value
					return (
						<button
							className={`flex flex-1 flex-col items-start rounded-xl border border-transparent p-4 text-left transition duration-300 ${
								isActive
									? 'bg-primary/10 text-primary shadow-lg shadow-primary/10'
									: 'hover:border-border/60 hover:bg-background/40'
							}`}
							key={tab.value}
							onClick={() => setActiveTab(tab.value)}
							type="button"
						>
							<div className="flex w-full items-center justify-between font-semibold text-sm">
								<span>{i18n.getMessage(tab.labelKey, isLocalized)}</span>
								<Icon className="h-4 w-4 flex-shrink-0" />
							</div>
							<p className="mt-2 text-muted-foreground text-xs">
								{i18n.getMessage(tab.descriptionKey, isLocalized)}
							</p>
							{isActive && (
								<div className="mt-3 h-1 w-full rounded-full bg-primary" />
							)}
						</button>
					)
				})}
			</div>
		</div>
	)
}
