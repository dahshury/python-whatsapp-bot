/**
 * Hook to ensure document is initialized
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import { logger } from "@/shared/libs/logger";
import { createDocumentsService } from "../services/documents.service.factory";

/**
 * Hook for ensuring a document exists for a given waId
 * Calls the service's ensureInitialized method which copies the default template
 * for users who don't have a document yet
 */
export function useEnsureInitialized(): (waId: string) => Promise<boolean> {
  const queryClient = useQueryClient();
  const documentsService = useMemo(() => createDocumentsService(), []);
  const ensurePromisesRef = useRef(new Map<string, Promise<boolean>>());
  const initializedSetRef = useRef(new Set<string>());

  const ensureInitialized = useCallback(
    (waId: string): Promise<boolean> => {
      const normalizedWaId = (waId || "").trim();
      if (!normalizedWaId) {
        return Promise.resolve(false);
      }

      if (initializedSetRef.current.has(normalizedWaId)) {
        return Promise.resolve(true);
      }

      const existing = ensurePromisesRef.current.get(normalizedWaId);
      if (existing) {
        return existing;
      }

      logger.info(
        `[useEnsureInitialized] Ensuring document ${waId} is initialized`
      );
      const promise = (async (): Promise<boolean> => {
        try {
          const result = await documentsService.ensureInitialized(waId);
          const { success, modified } = result;
          logger.info(
            `[useEnsureInitialized] Document ${waId} initialization result`,
            {
              success,
              modified,
            }
          );

          if (success) {
            initializedSetRef.current.add(normalizedWaId);
          }

          if (success && modified) {
            // Invalidate queries to mark them as stale
            // They will refetch automatically when components using them are mounted
            await queryClient.invalidateQueries({
              queryKey: DOCUMENT_QUERY_KEY.byWaId(waId),
            });
            await queryClient.invalidateQueries({
              queryKey: [...DOCUMENT_QUERY_KEY.byWaId(waId), "canvas"],
            });
            logger.info(
              `[useEnsureInitialized] Invalidated queries for ${waId} after initialization`
            );
          }

          return success;
        } catch (error) {
          logger.error(
            `[useEnsureInitialized] Failed to initialize document ${waId}`,
            error
          );
          throw error;
        } finally {
          ensurePromisesRef.current.delete(normalizedWaId);
        }
      })();

      ensurePromisesRef.current.set(normalizedWaId, promise);
      return promise;
    },
    [documentsService, queryClient]
  );

  return ensureInitialized;
}
