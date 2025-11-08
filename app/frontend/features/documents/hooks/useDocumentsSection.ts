"use client";

import { useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { IDataSource } from "@/shared/libs/data-grid";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import { useDocumentTransitionState } from "../model/useDocumentTransitionState";
import { useWaIdSource } from "../model/useWaidSource";
import { createDocumentsService } from "../services/documents.service.factory";
import type { SaveStatus } from "../types/save-state.types";
import useDocumentCustomerRow from "./useDocumentCustomerRow";
import { createUseDocuments } from "./useDocuments";
import { useEnsureInitialized } from "./useEnsureInitialized";
import { useFullscreenManagement } from "./useFullscreenManagement";

// Create the documents hooks
const documentsService = createDocumentsService();
const { useGetByWaId } = createUseDocuments(documentsService);

export type UseDocumentsSectionParams = Record<string, never>;

export type UseDocumentsSectionResult = {
  waId: string;
  isUnlocked: boolean;
  isFullscreen: boolean;
  isSceneTransitioning: boolean;
  customerDataSource: IDataSource | null;
  validationErrors: unknown[];
  loading: boolean;
  saveStatus: SaveStatus;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  fsContainerRef: React.RefObject<HTMLDivElement | null>;
  handleCreateNewCustomer: () => void;
  handleProviderReady: (provider: unknown) => Promise<void>;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
};

/**
 * Main hook for documents section without canvas functionality.
 * Handles customer loading from calendar, grid management, and document queries.
 */
export function useDocumentsSection(): UseDocumentsSectionResult {
  const searchParams = useSearchParams();
  const ensureInitialized = useEnsureInitialized();

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

  const { waId } = useWaIdSource({
    defaultWaId: DEFAULT_DOCUMENT_WA_ID,
    searchParams,
    ensureInitialized,
    initializeCameraRef,
    pendingInitialLoadWaIdRef,
    persistenceGuards,
    ignorePersistDelayMs: 900,
    storageKey: "documents:lastWaId",
  });

  // Document transition state
  const { isSceneTransitioning } = useDocumentTransitionState();

  // Load document data (keep database queries)
  const { isLoading: loading } = useGetByWaId(waId, { enabled: Boolean(waId) });

  // Customer row management
  const {
    customerDataSource,
    validationErrors,
    onDataProviderReady: onDataProviderReadyFromHook,
  } = useDocumentCustomerRow(waId);

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

  // Handle creating new customer (placeholder for now)
  const handleCreateNewCustomer = useCallback(() => {
    // TODO: Implement new customer creation flow
  }, []);

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
    validationErrors,
    loading,
    saveStatus,
    setSaveStatus,
    fsContainerRef,
    handleCreateNewCustomer,
    handleProviderReady,
    enterFullscreen,
    exitFullscreen,
  };
}
