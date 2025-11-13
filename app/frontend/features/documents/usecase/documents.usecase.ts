export type EnsureInitializedResult = {
  success: boolean;
  modified: boolean;
};

export type DocumentsUseCase = {
  getByWaId: (waId: string) => Promise<{
    name?: string | null;
    age?: number | null;
    document?: unknown;
  }>;
  save: (
    waId: string,
    snapshot: Partial<{
      name?: string | null;
      age?: number | null;
      document?: unknown;
    }>
  ) => Promise<boolean>;
  ensureInitialized: (waId: string) => Promise<EnsureInitializedResult>;
};
