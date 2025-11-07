import { useQuery } from "@tanstack/react-query";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import { createDocumentsService } from "../services/documents.service.factory";

function normalizeDocumentSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const value = raw as {
    type?: string;
    snapshot?: unknown;
    document?: unknown;
    session?: unknown;
    schema?: unknown;
  };

  // If backend stored as: { type: 'tldraw', snapshot: { document: ... } }
  if (value.type === "tldraw" && "snapshot" in value) {
    const snapshot = value.snapshot as { document?: unknown } | null;
    // Unwrap the document from the snapshot wrapper
    if (snapshot && typeof snapshot === "object" && "document" in snapshot) {
      return snapshot.document;
    }
    return value.snapshot;
  }

  // Legacy format: { type: 'tldraw', state: ... }
  if (value.type === "tldraw" && "state" in value) {
    return (value as { state?: unknown }).state ?? null;
  }

  // If already in { document, session, schema } format
  if ("document" in value || "session" in value || "schema" in value) {
    return raw;
  }

  return raw;
}

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
        return { snapshot: null, editorCamera: null, viewerCamera: null };
      }

      const resp = await documentsService.getByWaId(waId);
      const rawDocument = resp?.document ?? null;
      
      // Extract snapshot and cameras separately
      const doc = rawDocument as {
        type?: string;
        snapshot?: unknown;
        editorCamera?: { x: number; y: number; z: number };
        viewerCamera?: { x: number; y: number; z: number };
      } | null;

      return {
        snapshot: normalizeDocumentSnapshot(rawDocument),
        editorCamera: doc?.editorCamera ?? null,
        viewerCamera: doc?.viewerCamera ?? null,
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

