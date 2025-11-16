import { apiClient } from "@/shared/api";
import type { DashboardData } from "../types";
import type { DashboardUseCase } from "../usecase/dashboard.usecase";

type DashboardStatsResponse = {
  success?: boolean;
  data?: DashboardData;
  message?: string;
};

export const DashboardService = (): DashboardUseCase => ({
  getStats: async (params) => {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) {
      searchParams.set("from_date", params.fromDate);
    }
    if (params?.toDate) {
      searchParams.set("to_date", params.toDate);
    }
    if (params?.locale) {
      searchParams.set("locale", params.locale);
    }

    const query = searchParams.toString();
    const path = query ? `/stats?${query}` : "/stats";

    const response = await apiClient.get<DashboardStatsResponse>(path);
    if (!(response?.success && response.data)) {
      throw new Error(response?.message || "Failed to fetch dashboard stats");
    }

    // TypeScript narrowing: after the check above, response.data is guaranteed to be DashboardData
    return response.data as DashboardData;
  },
});
