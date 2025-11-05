"use client";

import { useEffect } from "react";
import { logger } from "@/shared/libs/logger";
import {
  type PersistenceGuardRefs,
  PersistenceGuardsService,
} from "../model/persistence-guards";

const CUSTOMER_SELECTION_PERSIST_SUPPRESSION_MS = 900;

const logCustomerSelectionWarning = (context: string, error: unknown) => {
  logger.warn(`[useCustomerSelection] ${context}`, error);
};

export type UseCustomerSelectionParams = {
  ensureInitialized: (waId: string) => Promise<unknown>;
  setWaId: (waId: string) => void;
  pendingInitialLoadWaIdRef: React.MutableRefObject<string | null>;
  persistenceGuards: PersistenceGuardRefs;
  initializeCamera: (viewerCamera: Record<string, unknown>) => void;
};

/**
 * Hook for handling customer selection from grid phone or drawer calendar.
 * Handles waId switching with guards to suppress persist operations.
 *
 * @param params - Hook parameters
 */
export function useCustomerSelection(params: UseCustomerSelectionParams): void {
  const {
    ensureInitialized,
    setWaId,
    pendingInitialLoadWaIdRef,
    persistenceGuards,
    initializeCamera,
  } = params;

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { waId?: string };
        const next = String(detail?.waId || "");
        if (!next) {
          return;
        }
        // Guard: briefly suppress persist while switching customers
        PersistenceGuardsService.scheduleIgnoreWindow(
          persistenceGuards,
          CUSTOMER_SELECTION_PERSIST_SUPPRESSION_MS
        );
        // Mark this waId as pending initial load
        pendingInitialLoadWaIdRef.current = next;
        // Reset viewer camera tracking for new document
        initializeCamera({});
        // Initialize the customer's document with template on first selection
        ensureInitialized(next).catch((error) => {
          logCustomerSelectionWarning(
            `Failed to ensure document initialized for waId ${next}`,
            error
          );
        });
        setWaId(next);
        // Document load is handled by useDocumentScene hook automatically when waId changes
      } catch (error) {
        logCustomerSelectionWarning(
          "Processing customer selection failed",
          error
        );
      }
    };
    window.addEventListener("doc:user-select", handler as EventListener);
    return () =>
      window.removeEventListener("doc:user-select", handler as EventListener);
  }, [
    ensureInitialized,
    setWaId,
    pendingInitialLoadWaIdRef,
    persistenceGuards,
    initializeCamera,
  ]);
}
