import type { DocumentDomain } from "./document.domain";

export type DocumentRepository = {
  getByWaId(waId: string): Promise<DocumentDomain>;
  save(
    waId: string,
    snapshot: Partial<{
      document?: unknown;
      name?: string | null;
      age?: number | null;
    }>
  ): Promise<boolean>;
};
