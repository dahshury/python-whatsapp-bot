import { apiClient } from "@/shared/api";
import type { AppConfigDto, AppConfigUpdateDto } from "../dto/app-config.dto";

const unwrapResponse = (payload: unknown): AppConfigDto => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as { data?: unknown })
  ) {
    const data = (payload as { data?: unknown }).data;
    if (data) {
      return data as AppConfigDto;
    }
  }
  return payload as AppConfigDto;
};

export const AppConfigAdapter = () => ({
  fetch: async (): Promise<AppConfigDto> => {
    const response = await apiClient.get<AppConfigDto>("/api/config");
    return unwrapResponse(response);
  },
  update: async (payload: AppConfigUpdateDto): Promise<AppConfigDto> => {
    const response = await apiClient.put<AppConfigDto>("/api/config", payload);
    return unwrapResponse(response);
  },
});
