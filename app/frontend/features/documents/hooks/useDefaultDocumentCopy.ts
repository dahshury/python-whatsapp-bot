import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import {
  DEFAULT_DOCUMENT_WA_ID,
  TEMPLATE_USER_WA_ID,
} from "@/shared/libs/documents";
import { createDocumentsService } from "../services/documents.service.factory";

type UseDefaultDocumentCopyParams = {
  waId: string | null | undefined;
  snapshot: unknown | null;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Hook that automatically copies the default template document to a new customer
 * when they don't have a document yet. Works for both viewer and editor.
 *
 * This hook:
 * - Detects when a customer has no document (empty/null snapshot)
 * - Copies the template document from TEMPLATE_USER_WA_ID
 * - Invalidates the query cache to trigger a refetch
 * - Only runs once per waId to avoid infinite loops
 */
export function useDefaultDocumentCopy({
  waId,
  snapshot,
  isLoading,
  isError,
}: UseDefaultDocumentCopyParams): void {
  const queryClient = useQueryClient();
  const documentsService = createDocumentsService();
  const copiedWaIdsRef = useRef<Set<string>>(new Set());
  const lastWaIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset copied set when waId changes
    if (waId !== lastWaIdRef.current) {
      copiedWaIdsRef.current.clear();
      lastWaIdRef.current = waId ?? null;
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
      return;
    }

    // Check if document is empty
    const isEmpty = isDocumentEmpty(snapshot);

    if (!isEmpty) {
      // Document has content, mark as checked
      copiedWaIdsRef.current.add(waId);
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

      try {
        // Fetch template document
        const templateResp =
          await documentsService.getByWaId(TEMPLATE_USER_WA_ID);
        const templateDoc = templateResp?.document ?? null;

        if (!templateDoc || cancelled) {
          return;
        }

        // Check if template has content
        const templateHasContent = hasDocumentContent(templateDoc);
        if (!templateHasContent) {
          // Template is empty, nothing to copy
          copiedWaIdsRef.current.add(currentWaId);
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

          // Invalidate query cache to trigger refetch
          queryClient.invalidateQueries({
            queryKey: [...DOCUMENT_QUERY_KEY.byWaId(currentWaId), "canvas"],
          });

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
        }
      } catch {
        // On error, mark as checked to avoid retry loops
        if (!cancelled) {
          copiedWaIdsRef.current.add(currentWaId);
        }
      }
    }

    copyTemplate();

    return () => {
      cancelled = true;
    };
  }, [waId, snapshot, isLoading, isError, queryClient, documentsService]);
}

/**
 * Checks if a TLDraw document snapshot is empty (has no shapes/content)
 */
function isDocumentEmpty(snapshot: unknown | null): boolean {
  if (!snapshot) {
    return true;
  }

  return !hasDocumentContent(snapshot);
}

/**
 * Checks if a record key represents a shape (not instance/session state)
 */
function isShapeKey(key: string): boolean {
  if (key.startsWith("instance")) {
    return false;
  }
  if (key.startsWith("camera")) {
    return false;
  }
  if (key.startsWith("pointer")) {
    return false;
  }
  if (key.startsWith("presence")) {
    return false;
  }
  return true;
}

/**
 * Checks if a document has content (shapes/elements)
 * Handles both TLDraw format and legacy Excalidraw format
 */
function hasDocumentContent(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") {
    return false;
  }

  const docObj = doc as {
    type?: string;
    snapshot?: unknown;
    document?: unknown;
    elements?: unknown[];
    [key: string]: unknown;
  };

  // TLDraw format: { type: 'tldraw', snapshot: { document: {...} } }
  if (docObj.type === "tldraw" && docObj.snapshot) {
    const snapshot = docObj.snapshot as { document?: Record<string, unknown> };
    if (snapshot?.document) {
      const documentRecords = snapshot.document;
      return Object.keys(documentRecords).some(isShapeKey);
    }
    return false;
  }

  // Legacy Excalidraw format: { elements: [...] }
  if (Array.isArray(docObj.elements)) {
    return docObj.elements.length > 0;
  }

  // Direct TLDraw snapshot format: { document: {...} }
  if (docObj.document && typeof docObj.document === "object") {
    const documentRecords = docObj.document as Record<string, unknown>;
    return Object.keys(documentRecords).some(isShapeKey);
  }

  return false;
}

/**
 * Extracts the document for saving from template document
 * Preserves the original format of the template document
 */
function extractDocumentForSave(templateDoc: unknown): unknown {
  if (!templateDoc || typeof templateDoc !== "object") {
    return {
      type: "tldraw",
      snapshot: { document: {} },
    };
  }

  const docObj = templateDoc as {
    type?: string;
    snapshot?: { document?: Record<string, unknown> };
    document?: Record<string, unknown>;
    elements?: unknown[];
    [key: string]: unknown;
  };

  // TLDraw format: { type: 'tldraw', snapshot: { document: {...} } }
  if (docObj.type === "tldraw" && docObj.snapshot) {
    // Preserve the full structure
    return templateDoc;
  }

  // Direct TLDraw snapshot format: { document: {...} }
  if (docObj.document && typeof docObj.document === "object") {
    // Wrap it in the standard format
    return {
      type: "tldraw",
      snapshot: {
        document: docObj.document,
      },
    };
  }

  // Legacy Excalidraw format - return empty TLDraw format
  // This shouldn't happen for template, but handle it gracefully
  if (Array.isArray(docObj.elements)) {
    return {
      type: "tldraw",
      snapshot: { document: {} },
    };
  }

  // Unknown format - return empty
  return {
    type: "tldraw",
    snapshot: { document: {} },
  };
}
