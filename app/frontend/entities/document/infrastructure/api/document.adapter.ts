import type { ApiResponse } from "@/shared/api";
import { fetchCustomer, saveCustomerDocument } from "@/shared/api";
import type { DocumentDto } from "../dto/document.dto";

export const DocumentAdapter = () => ({
  getByWaId: async (
    waId: string
  ): Promise<
    ApiResponse<{
      document?: unknown;
      name?: string | null;
      age?: number | null;
    }>
  > =>
    (await fetchCustomer(waId)) as ApiResponse<{
      document?: unknown;
      name?: string | null;
      age?: number | null;
    }>,

  save: async (
    waId: string,
    snapshot: Partial<DocumentDto>
  ): Promise<ApiResponse<unknown>> =>
    (await saveCustomerDocument({ waId, ...snapshot })) as ApiResponse<unknown>,
});
