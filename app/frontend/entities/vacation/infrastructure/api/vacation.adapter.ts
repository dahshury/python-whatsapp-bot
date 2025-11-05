import { apiClient } from "@/shared/api";
import type { VacationDto } from "../dto/vacation.dto";

export const VacationAdapter = () => ({
  list: async (): Promise<VacationDto[]> => {
    const res = await apiClient.get<VacationDto[]>("/vacations");
    return (res?.data as VacationDto[]) || [];
  },
  save: async (dto: VacationDto): Promise<VacationDto> => {
    const res = await apiClient.post<VacationDto>("/vacations", dto);
    return (res?.data as VacationDto) || dto;
  },
  delete: async (id: string): Promise<boolean> => {
    const res = await apiClient.post<{ success: boolean }>(
      `/vacations/${encodeURIComponent(id)}/delete`
    );
    return Boolean((res as { success?: unknown })?.success);
  },
});
