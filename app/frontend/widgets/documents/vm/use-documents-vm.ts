/**
 * Documents ViewModel
 * Encapsulates document business logic and state.
 * Foundation for document operations and state management.
 */

import { useMemo } from "react";
// Documents feature should be used directly; DI port removed.

export type DocumentsViewModelState = {
  isLoading: boolean;
  error: string | null;
};

export type DocumentsViewModelActions = Record<string, never>;

export type DocumentsViewModel = DocumentsViewModelState &
  DocumentsViewModelActions;

/**
 * Hook that provides the documents view model.
 * Currently a placeholder; will be extended as documents refactoring progresses.
 */
export function useDocumentsViewModel(): DocumentsViewModel {
  const vm = useMemo<DocumentsViewModelState>(
    () => ({
      isLoading: false,
      error: null,
    }),
    []
  );

  return vm as DocumentsViewModel;
}
