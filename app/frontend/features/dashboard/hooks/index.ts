import { createDashboardService } from '../services/dashboard.service.factory'
import { createUseDashboardStats } from './useDashboardStats'

const svc = createDashboardService()
export const useDashboardStats = createUseDashboardStats(svc)

export type { UsePaginationOptions, UsePaginationReturn } from './usePagination'
export { usePagination } from './usePagination'
