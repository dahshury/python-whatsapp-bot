import { useQuery } from "@tanstack/react-query";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import { createDocumentsService } from "../services/documents.service.factory";
import {
  hasDocumentContent,
  normalizeDocumentSnapshot,
} from "../utils/documentContent";

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

      let response = await documentsService.getByWaId(waId);
      let rawDocument = response?.document ?? null;

      const shouldInitialize =
        waId !== TEMPLATE_USER_WA_ID && !hasDocumentContent(rawDocument);

      if (shouldInitialize) {
        try {
          const initialized = await documentsService.ensureInitialized(waId);
          if (initialized) {
            response = await documentsService.getByWaId(waId);
            rawDocument = response?.document ?? rawDocument;
          }
        } catch {
          // Ignore initialization errors here; query result will reflect current state
        }
      }

      // Extract snapshot and cameras separately
      const doc = rawDocument as {
        type?: string;
        snapshot?: unknown;
        editorCamera?: { x: number; y: number; z: number };
        viewerCamera?: { x: number; y: number; z: number };
        editorPageId?: string;
      } | null;

      return {
        snapshot: normalizeDocumentSnapshot(rawDocument),
        editorCamera: doc?.editorCamera ?? null,
        viewerCamera: doc?.viewerCamera ?? null,
        editorPageId: doc?.editorPageId ?? null,
      };
    },
    enabled: Boolean(waId && waId.trim() !== ""),
    staleTime: 0, // Always consider data stale - refetch when switching documents
    gcTime: 300_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when mounting/switching documents
    retry: 1,
  });
}
