"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import {
  DEFAULT_DOCUMENT_WA_ID,
  TEMPLATE_USER_WA_ID,
} from "@/shared/libs/documents";
import { i18n } from "@/shared/libs/i18n";
import { toastService } from "@/shared/libs/toast";
import { PersistenceGuardsService } from "../model/persistence-guards";
import { useDocumentTransitionState } from "../model/useDocumentTransitionState";
import { useWaIdSource } from "../model/useWaidSource";
import { createDocumentsService } from "../services/documents.service.factory";
import type { SaveStatus } from "../types/save-state.types";
import { useCustomerRowPersistence } from "./useCustomerRowPersistence";
import useDocumentCustomerRow from "./useDocumentCustomerRow";
import { createUseDocuments } from "./useDocuments";
import { useEnsureInitialized } from "./useEnsureInitialized";
import { useFullscreenManagement } from "./useFullscreenManagement";
import { usePersistTrigger } from "./usePersistTrigger";

// Create the documents hooks
const documentsService = createDocumentsService();
const { useSave } = createUseDocuments(documentsService);

export type UseDocumentsSectionParams = Record<string, never>;

export type UseDocumentsSectionResult = {
  waId: string;
  isUnlocked: boolean;
  isFullscreen: boolean;
  isSceneTransitioning: boolean;
  customerDataSource: IDataSource | null;
  customerColumns: IColumnDefinition[];
  providerRef: React.MutableRefObject<DataProvider | null>;
  validationErrors: unknown[];
  loading: boolean;
  saveStatus: SaveStatus;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  fsContainerRef: React.RefObject<HTMLDivElement | null>;
  handleProviderReady: (provider: unknown) => Promise<void>;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  startNewCustomer: () => Promise<string | null | undefined>;
};

/**
 * Main hook for documents section without canvas functionality.
 * Handles customer loading from calendar, grid management, and document queries.
 */
export function useDocumentsSection(): UseDocumentsSectionResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ensureInitialized = useEnsureInitialized();
  const { isLocalized } = useLanguageStore();
  const saveMutation = useSave();

  // Refs for persistence guards - must be at top level, not inside useMemo
  const ignorePersistUntilRef = useRef<number>(0);
  const persistTimerRef = useRef<number | null>(null);

  // WaId management with persistence
  const persistenceGuards = useMemo(
    () => ({
      ignorePersistUntilRef,
      persistTimerRef,
    }),
    []
  );

  const pendingInitialLoadWaIdRef = useRef<string | null>(
    DEFAULT_DOCUMENT_WA_ID
  );
  const initializeCameraRef = useRef<
    ((viewerCamera: Record<string, unknown>) => void) | null
  >(null);

  const ensureInitializedForWaSource = useCallback(
    async () => true,
    []
  );

  const { waId, setWaId, persistWaId, replaceWaIdInUrl } = useWaIdSource({
    defaultWaId: DEFAULT_DOCUMENT_WA_ID,
    searchParams,
    ensureInitialized: ensureInitializedForWaSource,
    initializeCameraRef,
    pendingInitialLoadWaIdRef,
    persistenceGuards,
    ignorePersistDelayMs: 900,
    storageKey: "documents:lastWaId",
  });

  // Document transition state
  const { isSceneTransitioning } = useDocumentTransitionState();

  // Loading state is now managed by useDocumentCanvas in DocumentsSectionLayout
  // This prevents double loading - removed duplicate useGetByWaId call here
  const loading = false;

  // Customer row management
  const {
    customerDataSource,
    customerColumns,
    providerRef,
    validationErrors,
    onDataProviderReady: onDataProviderReadyFromHook,
  } = useDocumentCustomerRow(waId);

  // Create new customer callback - uses TanStack Query mutation with template document
  const onCreateNewCustomer = useCallback(
    async (input: { name: string; phone: string; age: number | null }) => {
      const { name, phone, age } = input;
      const sanitizedPhone = phone.replace(/\D+/g, "");
      if (!sanitizedPhone) {
        return null;
      }

      try {
        // Fetch the template document BEFORE saving the customer
        // This ensures we save the customer WITH the template in one mutation
        // Avoiding the empty document flicker
        let templateDocument: unknown = null;
        try {
          const templateResp =
            await documentsService.getByWaId(TEMPLATE_USER_WA_ID);
          templateDocument = templateResp?.document ?? null;
        } catch {
          // Template fetch failed, proceed without document (will be copied later)
        }

        // Save customer with name, age, AND template document in one mutation
        // This prevents the empty canvas flicker
        const success = await toastService.promise(
          saveMutation.mutateAsync({
            waId: sanitizedPhone,
            snapshot: {
              name,
              age,
              ...(templateDocument ? { document: templateDocument } : {}),
            },
          }),
          {
            loading: i18n.getMessage("saving", isLocalized),
            success: () => i18n.getMessage("saved", isLocalized),
            error: () => i18n.getMessage("save_failed", isLocalized),
          }
        );

        if (success) {
          // If we saved with template, populate cache immediately with known data
          // This eliminates flicker since we don't need to wait for a fetch
          if (templateDocument) {
            // Set document query cache with the data we just saved
            queryClient.setQueryData(
              DOCUMENT_QUERY_KEY.byWaId(sanitizedPhone),
              {
                name,
                age,
                document: templateDocument,
              }
            );

            // Set canvas query cache with the template document
            queryClient.setQueryData(
              [...DOCUMENT_QUERY_KEY.byWaId(sanitizedPhone), "canvas"],
              {
                snapshot: templateDocument,
                editorCamera: null,
                viewerCamera: null,
                editorPageId: null,
              }
            );
          } else {
            // Template wasn't included, ensure it's copied and cache is populated
            await ensureInitialized(sanitizedPhone);
          }

          // Update URL to navigate to the new customer
          // Cache is now populated with the template, canvas loads instantly
          try {
            const params = new URLSearchParams(searchParams.toString());
            params.set("waId", sanitizedPhone);
            const query = params.toString();
            const url = query ? `/documents?${query}` : "/documents";
            router.push(url);
          } catch {
            // Fallback to replaceWaIdInUrl if router.push fails
            replaceWaIdInUrl(sanitizedPhone);
          }
          return sanitizedPhone;
        }
        return null;
      } catch (error) {
        toastService.error(
          i18n.getMessage("save_failed", isLocalized),
          error instanceof Error ? error.message : String(error)
        );
        return null;
      }
    },
    [
      router,
      searchParams,
      replaceWaIdInUrl,
      isLocalized,
      saveMutation,
      ensureInitialized,
      queryClient,
    ]
  );

  // Customer row persistence
  const { persistRow } = useCustomerRowPersistence({
    waId,
    customerDataSource,
    customerColumns,
    onCreateNewCustomer,
  });

  // Listen for persist triggers from the grid
  usePersistTrigger({
    persistRow,
    ignorePersistUntilRef,
    persistTimerRef,
  });

  // Fullscreen management
  const fsContainerRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } =
    useFullscreenManagement({ fsContainerRef });

  // Unlock state (always unlocked for now - can add logic later)
  const [isUnlocked] = useState(true);

  // Save status state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    waId ? { status: "loading" } : { status: "ready" }
  );
  const previousWaIdRef = useRef<string | null>(waId ?? null);

  const startNewCustomer = useCallback((): Promise<
    string | null | undefined
  > => {
    const nextWaId = DEFAULT_DOCUMENT_WA_ID;
    const SUPPRESS_MS = 900;
    PersistenceGuardsService.scheduleIgnoreWindow(
      persistenceGuards,
      SUPPRESS_MS
    );
    pendingInitialLoadWaIdRef.current = nextWaId;
    initializeCameraRef.current?.({});

    try {
      persistWaId(null);
    } catch {
      // Ignore persistence errors
    }

    replaceWaIdInUrl(null);

    setWaId(nextWaId);
    setSaveStatus({ status: "ready" });

    return Promise.resolve(nextWaId);
  }, [persistenceGuards, persistWaId, replaceWaIdInUrl, setWaId]);

  useEffect(() => {
    const previousWaId = previousWaIdRef.current;
    if (waId === previousWaId) {
      return;
    }

    previousWaIdRef.current = waId ?? null;
    if (waId) {
      setSaveStatus({ status: "loading" });
    } else {
      setSaveStatus({ status: "ready" });
    }
  }, [waId]);

  // Handle data provider ready
  const handleProviderReady = useCallback(
    async (provider: unknown) => {
      await onDataProviderReadyFromHook(provider);
    },
    [onDataProviderReadyFromHook]
  );

  return {
    waId,
    isUnlocked,
    isFullscreen,
    isSceneTransitioning,
    customerDataSource,
    customerColumns,
    providerRef,
    validationErrors,
    loading,
    saveStatus,
    setSaveStatus,
    fsContainerRef,
    handleProviderReady,
    enterFullscreen,
    exitFullscreen,
    startNewCustomer,
  };
}
