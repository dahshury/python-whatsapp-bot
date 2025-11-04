'use client'

import { i18n } from '@shared/libs/i18n'
import { useLanguage } from '@shared/libs/state/language-context'
import { Button } from '@ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { useEnhancedDashboardController } from '../services/enhanced-dashboard-controller'
import { DashboardHeader } from '../ui/DashboardHeader'
import { DashboardTabs } from '../ui/DashboardTabs'

export function EnhancedDashboardView() {
	const controller = useEnhancedDashboardController()
	const { isLocalized } = useLanguage()

	if (controller.error) {
		return (
			<div className="flex min-h-[25rem] items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="p-6 text-center">
						<div className="mb-4 text-destructive">
							<svg
								aria-label="Error icon"
								className="mx-auto h-12 w-12"
								fill="none"
								role="img"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Error icon</title>
								<path
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-lg">
							{i18n.getMessage('dashboard_error_title', isLocalized)}
						</h3>
						<p className="mb-4 text-muted-foreground">{controller.error}</p>
						<Button
							onClick={() => controller.refreshDashboard()}
							variant="outline"
						>
							{i18n.getMessage('dashboard_try_again', isLocalized)}
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				daysCount={controller.daysCount}
				filters={controller.filters}
				isLocalized={isLocalized}
				isUsingMockData={controller.isUsingMockData}
				onDateRangeChange={controller.handleDateRangeChange}
				onExport={controller.handleExport}
				safeStats={controller.safeDashboard.stats}
			/>
			<DashboardTabs controller={controller} isLocalized={isLocalized} />
		</div>
	)
}
