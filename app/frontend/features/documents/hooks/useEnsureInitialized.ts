/**
 * Hook to ensure document is initialized
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import { logger } from "@/shared/libs/logger";
import { createDocumentsService } from "../services/documents.service.factory";

/**
 * Hook for ensuring a document exists for a given waId
 * Calls the service's ensureInitialized method which copies the default template
 * for users who don't have a document yet
 */
export function useEnsureInitialized() {
  const queryClient = useQueryClient();
  const documentsService = useMemo(() => createDocumentsService(), []);

  const ensureInitialized = useCallback(
    async (waId: string): Promise<boolean> => {
      try {
        logger.info(
          `[useEnsureInitialized] Ensuring document ${waId} is initialized`
        );
        const result = await documentsService.ensureInitialized(waId);
        logger.info(
          `[useEnsureInitialized] Document ${waId} initialization result: ${result}`
        );

        // If initialization was successful (template was copied), refetch queries
        // to immediately load the new document into the canvas
        if (result) {
          await queryClient.refetchQueries({
            queryKey: DOCUMENT_QUERY_KEY.byWaId(waId),
          });
          // Also refetch canvas query to load the copied template
          await queryClient.refetchQueries({
            queryKey: [...DOCUMENT_QUERY_KEY.byWaId(waId), "canvas"],
          });
          logger.info(
            `[useEnsureInitialized] Refetched queries for ${waId} after initialization`
          );
        }

        return result;
      } catch (error) {
        logger.error(
          `[useEnsureInitialized] Failed to initialize document ${waId}`,
          error
        );
        return false;
      }
    },
    [documentsService, queryClient]
  );

  return ensureInitialized;
}
