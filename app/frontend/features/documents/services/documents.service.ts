import { type DocumentApiRepository, documentToDto } from "@/entities/document";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import type { DocumentsUseCase } from "../usecase/documents.usecase";

export const DocumentsService = (
  repository: DocumentApiRepository
): DocumentsUseCase => ({
  getByWaId: async (waId: string) => {
    const domain = await repository.getByWaId(waId);
    return documentToDto(domain);
  },

  save: async (
    waId: string,
    snapshot: Partial<{
      name?: string | null;
      age?: number | null;
      document?: unknown;
    }>
  ) => await repository.save(waId, snapshot),

  ensureInitialized: async (waId: string) => {
    if (!waId) {
      return true;
    }

    // Special handling for template user - ensure it exists with proper name
    if (waId === TEMPLATE_USER_WA_ID) {
      try {
        const existing = await repository.getByWaId(TEMPLATE_USER_WA_ID);
        // If template exists, ensure it has the correct name
        if (
          !existing.snapshot?.name ||
          existing.snapshot.name !== "Default document"
        ) {
          await repository.save(TEMPLATE_USER_WA_ID, {
            name: "Default document",
            age: null,
          });
        }
        return true;
      } catch {
        // Template doesn't exist, create it with empty document and proper name
        await repository.save(TEMPLATE_USER_WA_ID, {
          name: "Default document",
          age: null,
          document: {
            elements: [],
            appState: {
              viewBackgroundColor: "#ffffff",
              gridSize: null,
            },
            files: {},
          },
        });
        return true;
      }
    }

    // Regular user initialization - copy from template if needed
    const existing = await repository.getByWaId(waId);
    const hasElements = Array.isArray(
      (
        existing.snapshot?.document as
          | { elements?: unknown[] }
          | null
          | undefined
      )?.elements
    );
    if (existing.snapshot?.document && hasElements) {
      return true;
    }

    // Get template document to copy
    const tmpl = await repository.getByWaId(TEMPLATE_USER_WA_ID);
    const tmplDoc = tmpl.snapshot.document as { elements?: unknown[] } | null;
    if (
      !(tmplDoc && Array.isArray(tmplDoc.elements)) ||
      tmplDoc.elements.length === 0
    ) {
      return false;
    }
    return await repository.save(waId, { document: tmplDoc });
  },
});
