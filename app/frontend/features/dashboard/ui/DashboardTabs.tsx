'use client'

import { i18n } from '@shared/libs/i18n'
import {
	Tabs,
	TabsList,
	TabsTrigger,
} from '@/shared/ui/animate-ui/components/radix/tabs'
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

export function DashboardTabs({ controller, isLocalized }: DashboardTabsProps) {
	const { activeTab, setActiveTab, isLoading, dashboardData, safeDashboard } =
		controller

	if (isLoading && !dashboardData) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<Skeleton className="mb-2 h-8 w-48" />
						<Skeleton className="h-4 w-96" />
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{Array.from({ length: 6 }).map((_, index) => {
						const skeletonId = `kpi-skeleton-${index}`
						return (
							<Card className="h-32" key={skeletonId}>
								<CardHeader className="pb-2">
									<Skeleton className="h-4 w-24" />
								</CardHeader>
								<CardContent>
									<Skeleton className="mb-2 h-8 w-16" />
									<Skeleton className="h-3 w-20" />
								</CardContent>
							</Card>
						)
					})}
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<Card className="h-96">
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-64 w-full" />
						</CardContent>
					</Card>
					<Card className="h-96">
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-64 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<Tabs className="space-y-6" onValueChange={setActiveTab} value={activeTab}>
			<TabsList className="mx-auto grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[37.5rem]">
				<TabsTrigger className="w-full whitespace-nowrap" value="overview">
					{i18n.getMessage('dashboard_overview', isLocalized)}
				</TabsTrigger>
				<TabsTrigger className="w-full whitespace-nowrap" value="trends">
					{i18n.getMessage('dashboard_trends', isLocalized)}
				</TabsTrigger>
				<TabsTrigger className="w-full whitespace-nowrap" value="messages">
					{i18n.getMessage('dashboard_messages', isLocalized)}
				</TabsTrigger>
				<TabsTrigger className="w-full whitespace-nowrap" value="insights">
					{i18n.getMessage('dashboard_insights', isLocalized)}
				</TabsTrigger>
			</TabsList>

			<div className="overflow-hidden border-zinc-200 border-t dark:border-zinc-700">
				<div className="space-y-8 pt-4">
					{activeTab === 'overview' && (
						<OverviewTab
							isLocalized={isLocalized}
							safeDashboard={safeDashboard}
						/>
					)}
					{activeTab === 'trends' && (
						<TrendsTab
							isLocalized={isLocalized}
							safeDashboard={safeDashboard}
						/>
					)}
					{activeTab === 'messages' && (
						<MessagesTab
							isLocalized={isLocalized}
							safeDashboard={safeDashboard}
						/>
					)}
					{activeTab === 'insights' && (
						<InsightsTab
							isLocalized={isLocalized}
							safeDashboard={safeDashboard}
						/>
					)}
				</div>
			</div>
		</Tabs>
	)
}
