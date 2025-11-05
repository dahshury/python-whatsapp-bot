"use client";

import { useCallback, useEffect } from "react";
import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import { UnlockValidationService } from "../services/unlock-validation.service";

export type UseUnlockValidationParams = {
  waId: string;
  customerDataSource: IDataSource | null;
  customerColumns: IColumnDefinition[];
  isUnlocked: boolean;
  setIsUnlocked: (unlocked: boolean) => void;
  providerRef: React.MutableRefObject<DataProvider | null>;
  pendingInitialLoadWaIdRef: React.MutableRefObject<string | null>;
};

/**
 * Hook for validating and managing document unlock state.
 * Validates unlock conditions whenever customer data changes.
 *
 * @param params - Hook parameters
 * @returns Callback to recompute unlock state
 */
export function useUnlockValidation(params: UseUnlockValidationParams): {
  recomputeUnlock: () => Promise<void>;
} {
  const {
    waId,
    customerDataSource,
    customerColumns,
    isUnlocked,
    setIsUnlocked,
    providerRef,
    pendingInitialLoadWaIdRef,
  } = params;

  const recomputeUnlock = useCallback(async () => {
    try {
      // Skip check if no customer selected (blank document)
      if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
        if (isUnlocked) {
          setIsUnlocked(false);
        }
        return;
      }

      if (!customerDataSource) {
        setIsUnlocked(false);
        return;
      }

      const result = await UnlockValidationService.validate({
        waId,
        customerDataSource,
        customerColumns,
        provider: providerRef.current,
        pendingInitialLoadWaId: pendingInitialLoadWaIdRef.current,
      });

      setIsUnlocked(result.shouldUnlock);
    } catch (_err) {
      setIsUnlocked(false);
    }
  }, [
    customerColumns,
    customerDataSource,
    waId,
    isUnlocked,
    setIsUnlocked,
    providerRef,
    pendingInitialLoadWaIdRef,
  ]);

  useEffect(() => {
    const handler = (event: Event) => {
      try {
        const detail = (event as CustomEvent).detail as { waId?: string };
        if (detail?.waId && detail.waId !== waId) {
          return;
        }
        recomputeUnlock().catch(() => {
          // Ignore errors here; existing hooks manage failure states
        });
      } catch {
        // Ignore malformed events
      }
    };

    window.addEventListener("doc:unlock-request", handler as EventListener);
    return () => {
      window.removeEventListener(
        "doc:unlock-request",
        handler as EventListener
      );
    };
  }, [waId, recomputeUnlock]);

  return {
    recomputeUnlock,
  };
}
