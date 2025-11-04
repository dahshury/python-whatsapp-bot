import { useQuery } from '@tanstack/react-query'
import type { DashboardUseCase } from '../usecase/dashboard.usecase'

export const createUseDashboardStats = (svc: DashboardUseCase) => () =>
	useQuery({ queryKey: ['dashboard', 'stats'], queryFn: svc.getStats })
