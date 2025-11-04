export type DashboardUseCase = {
	getStats: () => Promise<{ reservations: number; cancellations: number }>
}
