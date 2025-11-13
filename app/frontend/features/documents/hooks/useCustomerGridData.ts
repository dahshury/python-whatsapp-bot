import { useQuery } from "@tanstack/react-query";
import { customerKeys } from "@/shared/api/query-keys";
import { createDocumentsService } from "../services/documents.service.factory";

type CustomerGridData = {
  name: string;
  age: number | null;
};

/**
 * Hook for fetching customer grid data (name and age) for the document grid.
 * Uses TanStack Query for caching and state management.
 * Note: Document loading is handled separately by useGetByWaId hook.
 */
export function useCustomerGridData(waId: string | null | undefined) {
  const documentsService = createDocumentsService();

  return useQuery<CustomerGridData>({
    queryKey: customerKeys.gridData(waId ?? ""),
    queryFn: async (): Promise<CustomerGridData> => {
      if (!waId || waId.trim() === "") {
        return { name: "", age: null };
      }

      const resp = await documentsService.getByWaId(waId);
      return {
        name: (resp?.name ?? "") as string,
        age: (resp?.age ?? null) as number | null,
      };
    },
    enabled: Boolean(waId && waId.trim() !== ""),
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });
}
