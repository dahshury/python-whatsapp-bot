import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import {
  DEFAULT_DOCUMENT_WA_ID,
  TEMPLATE_USER_WA_ID,
} from "@/shared/libs/documents";
import { createDocumentsService } from "../services/documents.service.factory";
import {
  extractDocumentForSave,
  hasDocumentContent,
  isDocumentEmpty,
  normalizeDocumentSnapshot,
} from "../utils/documentContent";

type UseDefaultDocumentCopyParams = {
  waId: string | null | undefined;
  snapshot: unknown | null;
  isLoading: boolean;
  isError: boolean;
};

type UseDefaultDocumentCopyResult = {
  isCopying: boolean;
};

/**
 * Hook that automatically copies the default template document to a new customer
 * when they don't have a document yet. Works for both viewer and editor.
 *
 * This hook:
 * - Detects when a customer has no document (empty/null snapshot)
 * - Copies the template document from TEMPLATE_USER_WA_ID
 * - Directly updates the query cache with the template data (no refetch needed)
 * - Only runs once per waId to avoid infinite loops
 * - Returns isCopying state to prevent rendering empty canvas while copying
 */
export function useDefaultDocumentCopy({
  waId,
  snapshot,
  isLoading,
  isError,
}: UseDefaultDocumentCopyParams): UseDefaultDocumentCopyResult {
  const queryClient = useQueryClient();
  const documentsService = useMemo(() => createDocumentsService(), []);
  const copiedWaIdsRef = useRef<Set<string>>(new Set());
  const lastWaIdRef = useRef<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    // Reset copied set when waId changes
    if (waId !== lastWaIdRef.current) {
      copiedWaIdsRef.current.clear();
      lastWaIdRef.current = waId ?? null;
      setIsCopying(false);
    }

    // Skip if:
    // - No waId or empty waId
    // - Template user (don't copy template to itself)
    // - Still loading
    // - Has error
    // - Already copied for this waId
    if (
      !waId ||
      waId.trim() === "" ||
      waId === DEFAULT_DOCUMENT_WA_ID ||
      waId === TEMPLATE_USER_WA_ID ||
      isLoading ||
      isError ||
      copiedWaIdsRef.current.has(waId)
    ) {
      setIsCopying(false);
      return;
    }

    const isEmpty = isDocumentEmpty(snapshot);

    if (!isEmpty) {
      // Document has content, mark as checked
      copiedWaIdsRef.current.add(waId);
      setIsCopying(false);
      return;
    }

    // Document is empty, copy from template
    let cancelled = false;

    async function copyTemplate() {
      // waId is guaranteed to be non-null here due to early return checks
      if (!waId) {
        return;
      }

      const currentWaId = waId;
      setIsCopying(true);

      try {
        // Fetch template document
        const templateResp =
          await documentsService.getByWaId(TEMPLATE_USER_WA_ID);
        const templateDoc = templateResp?.document ?? null;

        if (!templateDoc || cancelled) {
          setIsCopying(false);
          return;
        }

        // Check if template has content
        const templateHasContent = hasDocumentContent(templateDoc);
        if (!templateHasContent) {
          // Template is empty, nothing to copy
          copiedWaIdsRef.current.add(currentWaId);
          setIsCopying(false);
          return;
        }

        // Copy template document to current user
        // The template document might be in different formats, so we need to preserve its structure
        const templateDocumentToSave = extractDocumentForSave(templateDoc);

        const success = await documentsService.save(currentWaId, {
          document: templateDocumentToSave,
        });

        if (success && !cancelled) {
          // Mark as copied
          copiedWaIdsRef.current.add(currentWaId);

          // Extract cameras from template if available
          const editorCamera =
            (
              templateDoc as {
                editorCamera?: { x: number; y: number; z: number };
              }
            )?.editorCamera ?? null;
          const viewerCamera =
            (
              templateDoc as {
                viewerCamera?: { x: number; y: number; z: number };
              }
            )?.viewerCamera ?? null;
          const editorPageId =
            (templateDoc as { editorPageId?: string })?.editorPageId ?? null;

          // Directly update query cache with the new data instead of invalidating
          // This prevents the empty canvas from rendering
          queryClient.setQueryData(
            [...DOCUMENT_QUERY_KEY.byWaId(currentWaId), "canvas"],
            {
              snapshot: normalizeDocumentSnapshot(templateDocumentToSave),
              editorCamera,
              viewerCamera,
              editorPageId,
            }
          );

          // Broadcast event for immediate UI update
          try {
            window.dispatchEvent(
              new CustomEvent("documents:external-update", {
                detail: {
                  wa_id: currentWaId,
                  document: templateDocumentToSave,
                },
              })
            );
          } catch {
            // Silently ignore event dispatch errors
          }

          setIsCopying(false);
        }
      } catch {
        // On error, mark as checked to avoid retry loops
        if (!cancelled) {
          copiedWaIdsRef.current.add(currentWaId);
          setIsCopying(false);
        }
      }
    }

    copyTemplate();

    return () => {
      cancelled = true;
      setIsCopying(false);
    };
  }, [waId, snapshot, isLoading, isError, queryClient, documentsService]);

  return { isCopying };
}
