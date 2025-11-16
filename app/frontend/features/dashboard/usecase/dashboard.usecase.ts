import type { DashboardData } from "../types";

export type DashboardUseCase = {
  getStats: (params?: {
    fromDate?: string;
    toDate?: string;
    locale?: string;
  }) => Promise<DashboardData>;
};
