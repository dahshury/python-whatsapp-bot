import { type DocumentApiRepository, documentToDto } from "@/entities/document";
import { TEMPLATE_USER_WA_ID } from "@/shared/libs/documents";
import type { DocumentsUseCase } from "../usecase/documents.usecase";
import { hasDocumentContent } from "../utils/documentContent";

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
            type: "tldraw",
            snapshot: {
              document: {},
            },
          },
        });
        return true;
      }
    }

    // Regular user initialization - copy from template if needed
    const existing = await repository.getByWaId(waId);

    // Check if user already has a document with content
    if (existing.snapshot?.document) {
      const doc = existing.snapshot.document;

      // Check if it has content using the same logic as useDefaultDocumentCopy
      if (hasDocumentContent(doc)) {
        return true; // Document already has content, don't overwrite
      }
    }

    // Document is empty or doesn't exist, copy from template
    const tmpl = await repository.getByWaId(TEMPLATE_USER_WA_ID);
    const tmplDoc = tmpl.snapshot.document;

    // Verify template has content before copying
    if (!(tmplDoc && hasDocumentContent(tmplDoc))) {
      return false; // Template is empty, can't copy
    }

    return await repository.save(waId, { document: tmplDoc });
  },
});
