export const DOCUMENT_QUERY_KEY = {
  byWaId: (waId: string) => ["document", waId] as const,
};
