/**
 * Documents Port (Domain-specific)
 * Defines the contract for document operations independent of storage backend.
 */

export type DocumentsPort = {
  loadDocument(waId: string): Promise<DocumentSnapshot>;
  saveDocument(waId: string, snapshot: DocumentSnapshot): Promise<void>;
  deleteDocument(waId: string): Promise<void>;
  listDocuments(): Promise<DocumentMetadata[]>;
};

export type DocumentSnapshot = {
  waId: string;
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
  lastModified?: string;
};

export type DocumentMetadata = {
  waId: string;
  name?: string;
  lastModified?: string;
  createdAt?: string;
};
