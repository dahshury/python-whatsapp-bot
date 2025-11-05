import { apiClient } from "@/shared/api";
import type { DashboardUseCase } from "../usecase/dashboard.usecase";

export const DashboardService = (): DashboardUseCase => ({
  getStats: async () => {
    const data = await apiClient.get<{
      reservations?: number;
      cancellations?: number;
    }>("/stats");
    return {
      reservations: Number(
        (data as { data?: { reservations?: number } })?.data?.reservations || 0
      ),
      cancellations: Number(
        (data as { data?: { cancellations?: number } })?.data?.cancellations ||
          0
      ),
    };
  },
});
