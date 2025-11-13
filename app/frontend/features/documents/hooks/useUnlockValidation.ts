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
    console.log("[useUnlockValidation] recomputeUnlock() called", {
      waId,
      isUnlocked,
      hasDataSource: !!customerDataSource,
      hasProvider: !!providerRef.current,
    });

    try {
      // Skip check if no customer selected (blank document)
      if (!waId || waId === DEFAULT_DOCUMENT_WA_ID) {
        console.log("[useUnlockValidation] Skipping - no waId or default document");
        if (isUnlocked) {
          setIsUnlocked(false);
          console.log("[useUnlockValidation] Set isUnlocked to FALSE");
        }
        return;
      }

      if (!customerDataSource) {
        console.log("[useUnlockValidation] No customerDataSource, setting unlocked to false");
        setIsUnlocked(false);
        return;
      }

      console.log("[useUnlockValidation] Calling UnlockValidationService.validate...");
      const result = await UnlockValidationService.validate({
        waId,
        customerDataSource,
        customerColumns,
        provider: providerRef.current,
        pendingInitialLoadWaId: pendingInitialLoadWaIdRef.current,
      });

      console.log("[useUnlockValidation] Setting isUnlocked to:", result.shouldUnlock);
      setIsUnlocked(result.shouldUnlock);
    } catch (err) {
      console.error("[useUnlockValidation] Error during recomputeUnlock:", err);
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
        console.log("[useUnlockValidation] doc:unlock-request event received", {
          eventWaId: detail?.waId,
          currentWaId: waId,
          matches: !detail?.waId || detail.waId === waId,
        });

        if (detail?.waId && detail.waId !== waId) {
          console.log("[useUnlockValidation] Ignoring event - waId mismatch");
          return;
        }

        console.log("[useUnlockValidation] Triggering recomputeUnlock...");
        recomputeUnlock().catch((err) => {
          console.error("[useUnlockValidation] recomputeUnlock error:", err);
        });
      } catch (err) {
        console.error("[useUnlockValidation] Event handler error:", err);
      }
    };

    console.log("[useUnlockValidation] Registering doc:unlock-request listener for waId:", waId);
    window.addEventListener("doc:unlock-request", handler as EventListener);
    return () => {
      console.log("[useUnlockValidation] Removing doc:unlock-request listener for waId:", waId);
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
