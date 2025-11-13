import { useQuery } from "@tanstack/react-query";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import { createDocumentsService } from "../services/documents.service.factory";
import { normalizeDocumentSnapshot } from "../utils/documentContent";

/**
 * Hook for fetching document canvas data for TLDraw viewer
 * Returns snapshot and camera positions separately
 * Uses TanStack Query for caching and state management
 */
export function useDocumentCanvas(waId: string | null | undefined) {
  const documentsService = createDocumentsService();

  return useQuery({
    queryKey: [...DOCUMENT_QUERY_KEY.byWaId(waId ?? ""), "canvas"],
    queryFn: async () => {
      if (!waId || waId.trim() === "") {
        return {
          snapshot: null,
          editorCamera: null,
          viewerCamera: null,
          editorPageId: null,
        };
      }

      // Fetch document data - initialization is handled by useWaidSource
      // Do NOT call ensureInitialized here to prevent double refetching
      const response = await documentsService.getByWaId(waId);
      const rawDocument = response?.document ?? null;

      // Extract snapshot and cameras separately
      const doc = rawDocument as {
        type?: string;
        snapshot?: unknown;
        editorCamera?: { x: number; y: number; z: number };
        viewerCamera?: { x: number; y: number; z: number };
        editorPageId?: string;
      } | null;

      const result = {
        snapshot: normalizeDocumentSnapshot(rawDocument),
        editorCamera: doc?.editorCamera ?? null,
        viewerCamera: doc?.viewerCamera ?? null,
        editorPageId: doc?.editorPageId ?? null,
      };

      return result;
    },
    enabled: Boolean(waId && waId.trim() !== ""),
    staleTime: 0, // Always consider data stale - refetch when switching documents
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when mounting/switching documents
    retry: 1,
  });
}
