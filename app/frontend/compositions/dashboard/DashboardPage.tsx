'use cache'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { registerPrefetchModules } from '@/shared/libs/prefetch/registry'
import { SidebarInset } from '@/shared/ui/sidebar'

const DashboardView = dynamic(
	() =>
		import('@/features/dashboard/dashboard-view').then(
			(mod) => mod.DashboardView
		),
	{ loading: () => <div>Loading...</div> }
)

export const preloadDashboardView = async () =>
	import('@/features/dashboard/dashboard-view').then((mod) => mod.DashboardView)

export const preloadTrendCharts = async () =>
	import('@/features/dashboard/dashboard/trend-charts').then(
		(mod) => mod.TrendCharts
	)

export const preloadResponseTimeAnalysis = async () =>
	import('@/features/dashboard/dashboard/response-time-analysis').then(
		(mod) => mod.ResponseTimeAnalysis
	)

export const preloadConversationLengthAnalysis = async () =>
	import('@/features/dashboard/dashboard/conversation-length-analysis').then(
		(mod) => mod.ConversationLengthAnalysis
	)

export const preloadMessageAnalysis = async () =>
	import('@/features/dashboard/dashboard/message-analysis').then(
		(mod) => mod.MessageAnalysis
	)

;(DashboardView as { preload?: typeof preloadDashboardView }).preload =
	preloadDashboardView

registerPrefetchModules('/dashboard', preloadDashboardView)
registerPrefetchModules('/dashboard', preloadTrendCharts)
registerPrefetchModules('/dashboard', preloadResponseTimeAnalysis)
registerPrefetchModules('/dashboard', preloadConversationLengthAnalysis)
registerPrefetchModules('/dashboard', preloadMessageAnalysis)

const ensureCacheBoundary = () => Promise.resolve()

export async function DashboardPage() {
	await ensureCacheBoundary()
	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<div className="mx-auto w-full max-w-7xl">
					<Suspense fallback={<div>Loading...</div>}>
						<DashboardView />
					</Suspense>
				</div>
			</div>
		</SidebarInset>
	)
}
