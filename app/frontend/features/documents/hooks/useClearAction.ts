"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback } from "react";
import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import {
  DEFAULT_DOCUMENT_WA_ID,
  toSceneFromDoc,
} from "@/shared/libs/documents";
import { logger } from "@/shared/libs/logger";
import { ClearActionService } from "../services/clear-action.service";

const logClearActionError = (context: string, error: unknown) => {
  logger.warn(`[useClearAction] ${context}`, error);
};

export type UseClearActionParams = {
  customerDataSource: IDataSource | null;
  customerColumns: IColumnDefinition[];
  providerRef: React.MutableRefObject<DataProvider | null>;
  pendingInitialLoadWaIdRef: React.MutableRefObject<string | null>;
  viewerApiRef: React.MutableRefObject<ExcalidrawImperativeAPI | null>;
  setWaId: (waId: string) => void;
  setScene: (
    scene: {
      elements?: unknown[];
      appState?: Record<string, unknown>;
      files?: Record<string, unknown>;
    } | null
  ) => void;
  setIsUnlocked: (unlocked: boolean) => void;
  initializeCamera: (viewerCamera: Record<string, unknown>) => void;
};

/**
 * Hook for clearing customer row data and resetting document state.
 * UI-only action: resets grid row and scene, locks until new input.
 *
 * @param params - Hook parameters
 * @returns Clear action handler
 */
export function useClearAction(params: UseClearActionParams): {
  handleClear: () => Promise<void>;
} {
  const {
    customerDataSource,
    customerColumns,
    providerRef,
    pendingInitialLoadWaIdRef,
    viewerApiRef,
    setWaId,
    setScene,
    setIsUnlocked,
    initializeCamera,
  } = params;

  const handleClear = useCallback(async () => {
    try {
      if (!customerDataSource) {
        return;
      }

      await ClearActionService.clearRow({
        customerDataSource,
        customerColumns,
        providerRef,
      });

      // Reset to default document and mark as pending initial load
      pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID;
      // Reset viewer camera tracking when clearing
      initializeCamera({});
      setWaId(DEFAULT_DOCUMENT_WA_ID);
      setScene(toSceneFromDoc(null));
      try {
        const api = viewerApiRef.current as unknown as {
          updateScene?: (s: Record<string, unknown>) => void;
        } | null;
        api?.updateScene?.({ elements: [], files: {} });
      } catch (error) {
        logClearActionError(
          "Unable to reset viewer canvas while clearing document",
          error
        );
      }
      setIsUnlocked(false);
    } catch (error) {
      logClearActionError("Failed to clear customer document row", error);
    }
  }, [
    customerColumns,
    customerDataSource,
    providerRef,
    pendingInitialLoadWaIdRef,
    viewerApiRef,
    setWaId,
    setScene,
    setIsUnlocked,
    initializeCamera,
  ]);

  return {
    handleClear,
  };
}
