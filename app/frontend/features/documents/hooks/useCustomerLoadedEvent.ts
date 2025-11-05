"use client";

import { useEffect } from "react";
import { logger } from "@/shared/libs/logger";

const logCustomerLoadedWarning = (context: string, error: unknown) => {
  logger.warn(`[useCustomerLoadedEvent] ${context}`, error);
};

export type UseCustomerLoadedEventParams = {
  waId: string;
  recomputeUnlock: () => Promise<void>;
};

/**
 * Hook for listening to customer data loaded event and recomputing unlock state.
 *
 * @param params - Hook parameters
 */
export function useCustomerLoadedEvent(
  params: UseCustomerLoadedEventParams
): void {
  const { waId, recomputeUnlock } = params;

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { waId?: string };
        const eventWaId = String(detail?.waId || "");
        if (eventWaId === waId) {
          recomputeUnlock().catch((error) => {
            logCustomerLoadedWarning(
              "Failed to recompute unlock state after customer loaded event",
              error
            );
          });
        }
      } catch (error) {
        logCustomerLoadedWarning(
          "Processing customer loaded event failed",
          error
        );
      }
    };
    window.addEventListener("doc:customer-loaded", handler as EventListener);
    return () =>
      window.removeEventListener(
        "doc:customer-loaded",
        handler as EventListener
      );
  }, [waId, recomputeUnlock]);
}
