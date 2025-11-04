'use cache'

import { Suspense } from 'react'
import { DashboardView } from '@/features/dashboard/dashboard-view'
import { SidebarInset } from '@/shared/ui/sidebar'

const ensureCacheBoundary = () => Promise.resolve()

export async function DashboardPage() {
	await ensureCacheBoundary()
	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<div className="mx-auto w-full max-w-7xl">
					<Suspense>
						<DashboardView />
					</Suspense>
				</div>
			</div>
		</SidebarInset>
	)
}
