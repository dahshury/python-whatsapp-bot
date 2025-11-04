'use client'

import { useDashboardStats } from '@/features/dashboard'
import { EnhancedDashboardView } from '@/features/dashboard/dashboard/enhanced-dashboard-view'

export function DashboardView() {
	useDashboardStats()
	return <EnhancedDashboardView />
}
