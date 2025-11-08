"use client";

import dynamic from "next/dynamic";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RecordId } from "tldraw";
import { getSnapshot, useEditor } from "tldraw";
import {
  type TldrawStoreState,
  useDefaultDocumentCopy,
  useDocumentCanvas,
  useTldrawStore,
} from "@/features/documents/hooks";
import { useCanvasLoadingProgress } from "@/features/documents/hooks/useCanvasLoadingProgress";
import { createDocumentsService } from "@/features/documents/services/documents.service.factory";
import type { SaveStatus } from "@/features/documents/types/save-state.types";
import type { IDataSource } from "@/shared/libs/data-grid";
import { FullscreenProvider } from "@/shared/libs/data-grid";
import { DEFAULT_DOCUMENT_WA_ID } from "@/shared/libs/documents";
import {
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressRoot,
  CircularProgressTrack,
  CircularProgressValueText,
} from "@/shared/ui/circular-progress";
import { SidebarInset } from "@/shared/ui/sidebar";
import { DocumentLockOverlay } from "@/widgets/documents/DocumentLockOverlay";
import { DocumentSavingIndicator } from "@/widgets/documents/DocumentSavingIndicator";
import { DocumentEditorCanvas } from "@/widgets/documents/document-editor";
import "./documents-grid.css";

const documentsService = createDocumentsService();

// Timing constants
const LOCK_CHECK_DEBOUNCE_MS = 100;
const FRAME_SYNC_INTERVAL_MS = 16; // ~60fps, sync every frame

// Defer Grid import to client to avoid SSR window references inside the library
// Import outside component to prevent recreation on every render
const ClientGrid = dynamic(
  () => import("@/shared/libs/data-grid/components/Grid"),
  {
    ssr: false,
  }
);

// Defer TLDraw import to client to avoid SSR window references
const DocumentViewerCanvas = dynamic(
  () =>
    import("@/widgets/documents/document-viewer").then((mod) => ({
      default: mod.DocumentViewerCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <CircularProgressRoot size={48} value={null}>
          <CircularProgressIndicator size={48} strokeWidth={4}>
            <CircularProgressTrack />
            <CircularProgressRange />
          </CircularProgressIndicator>
          <CircularProgressValueText />
        </CircularProgressRoot>
      </div>
    ),
  }
);

const AUTOSAVE_IDLE_MS = 3000;
const AUTOSAVE_MAX_DIRTY_MS = 15_000;

function DocumentAutosaveBridge({
  waId,
  setSaveStatus,
  viewerCameraRef,
  editorCamera,
  editorStoreStatus,
}: {
  waId: string;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  viewerCameraRef?: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
  } | null>;
  editorCamera: { x: number; y: number; z: number } | null | undefined;
  editorStoreStatus: TldrawStoreState["status"];
}) {
  const editor = useEditor();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDirtyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const latestSnapshotRef = useRef<string>("");
  const cameraLoadedRef = useRef(false);
  const lastWaIdRef = useRef<string | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearMaxDirtyTimer = useCallback(() => {
    if (maxDirtyTimerRef.current) {
      clearTimeout(maxDirtyTimerRef.current);
      maxDirtyTimerRef.current = null;
    }
  }, []);

  const formatSnapshotForPersist = useCallback((snapshot: unknown) => {
    // getSnapshot returns { document, session }
    // We only persist document (shared state), not session (user-specific)
    const source = (snapshot ?? {}) as {
      document?: unknown;
      session?: unknown;
    };
    const result: Record<string, unknown> = {};
    if (source.document !== undefined) {
      result.document = source.document;
    }
    // Note: We don't persist session state as it's user-specific
    return result;
  }, []);

  const captureState = useCallback(() => {
    if (!editor) {
      return null;
    }
    const snapshot = getSnapshot(editor.store);
    // Include camera in state capture so camera changes trigger dirty state
    const currentEditorCamera = editor.getCamera();
    return {
      snapshot: formatSnapshotForPersist(snapshot),
      editorCamera: currentEditorCamera,
    };
  }, [editor, formatSnapshotForPersist]);

  const captureStateString = useCallback(() => {
    const current = captureState();
    return current ? JSON.stringify(current) : "";
  }, [captureState]);

  const performSave = useCallback(async () => {
    if (!(editor && waId)) {
      return;
    }

    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }

    const capturedState = captureState();
    if (!capturedState) {
      return;
    }

    const serialized = JSON.stringify(capturedState);
    if (serialized === latestSnapshotRef.current) {
      clearIdleTimer();
      clearMaxDirtyTimer();
      setSaveStatus((prev) => {
        if (prev.status === "dirty") {
          return { status: "saved", at: Date.now() };
        }
        return prev;
      });
      return;
    }

    savingRef.current = true;
    setSaveStatus({ status: "saving" });

    try {
      // Camera is already included in capturedState, use it from there
      // Also include viewer camera if available
      const viewerCamera = viewerCameraRef?.current ?? undefined;
      const success = await documentsService.save(waId, {
        document: {
          type: "tldraw",
          snapshot: capturedState.snapshot,
          editorCamera: capturedState.editorCamera,
          ...(viewerCamera ? { viewerCamera } : {}),
        },
      });
      if (!success) {
        throw new Error("Save request failed");
      }

      // Don't update cache after saving - it causes flickering
      // The cache will naturally refetch when switching documents (staleTime: 0)
      // and the current store already has the saved data

      latestSnapshotRef.current = serialized;
      setSaveStatus({ status: "saved", at: Date.now() });
    } catch (error) {
      setSaveStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to save document",
      });
    } finally {
      savingRef.current = false;
      clearIdleTimer();
      clearMaxDirtyTimer();
      if (pendingRef.current) {
        pendingRef.current = false;
        performSave();
      }
    }
  }, [
    captureState,
    clearIdleTimer,
    clearMaxDirtyTimer,
    editor,
    setSaveStatus,
    waId,
    viewerCameraRef?.current,
  ]);

  const scheduleIdleSave = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      performSave();
    }, AUTOSAVE_IDLE_MS);
  }, [performSave]);

  const ensureMaxDirtySave = useCallback(() => {
    if (maxDirtyTimerRef.current) {
      return;
    }
    maxDirtyTimerRef.current = setTimeout(() => {
      performSave();
    }, AUTOSAVE_MAX_DIRTY_MS);
  }, [performSave]);

  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    // Reset camera loaded flag when waId changes
    if (waId !== lastWaIdRef.current) {
      cameraLoadedRef.current = false;
      lastWaIdRef.current = waId;
    }

    // Only load camera once when store is ready and camera hasn't been loaded yet
    if (
      editorStoreStatus === "ready" &&
      editorCamera &&
      !cameraLoadedRef.current
    ) {
      editor.setCamera(editorCamera, { animation: { duration: 0 } });
      cameraLoadedRef.current = true;
    }
  }, [editor, waId, editorCamera, editorStoreStatus]);

  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    latestSnapshotRef.current = captureStateString();
    setSaveStatus((prev) => {
      if (prev.status === "loading") {
        return { status: "saved", at: Date.now() };
      }
      return prev;
    });

    // Listen for document changes (shapes, etc.)
    const unlistenDocument = editor.store.listen(
      ({ changes }) => {
        // Trigger on document changes (but not instance/pointer/presence)
        const hasDocumentChange =
          Object.keys(changes.added).some(
            (id) =>
              !(
                id.startsWith("instance") ||
                id.startsWith("pointer") ||
                id.startsWith("presence")
              )
          ) ||
          Object.keys(changes.updated).some(
            (id) =>
              !(
                id.startsWith("instance") ||
                id.startsWith("pointer") ||
                id.startsWith("presence")
              )
          ) ||
          Object.keys(changes.removed).some(
            (id) =>
              !(
                id.startsWith("instance") ||
                id.startsWith("pointer") ||
                id.startsWith("presence")
              )
          );

        if (!hasDocumentChange) {
          return;
        }

        setSaveStatus((prev) => {
          if (prev.status === "saving" || prev.status === "dirty") {
            return prev;
          }
          return { status: "dirty" };
        });
        scheduleIdleSave();
        ensureMaxDirtySave();
      },
      { scope: "document", source: "user" }
    );

    // Listen for camera changes (camera is in session scope, not document scope)
    const unlistenCamera = editor.store.listen(
      ({ changes }) => {
        // Only listen for camera changes
        const hasCameraChange =
          Object.keys(changes.updated).some((id) => id.startsWith("camera")) ||
          Object.keys(changes.added).some((id) => id.startsWith("camera"));

        if (hasCameraChange) {
          setSaveStatus((prev) => {
            if (prev.status === "saving" || prev.status === "dirty") {
              return prev;
            }
            return { status: "dirty" };
          });
          scheduleIdleSave();
          ensureMaxDirtySave();
        }
      },
      { scope: "session", source: "user" }
    );

    return () => {
      unlistenDocument();
      unlistenCamera();
      clearIdleTimer();
      clearMaxDirtyTimer();
      savingRef.current = false;
      pendingRef.current = false;
    };
  }, [
    captureStateString,
    clearIdleTimer,
    clearMaxDirtyTimer,
    editor,
    ensureMaxDirtySave,
    scheduleIdleSave,
    setSaveStatus,
    waId,
  ]);

  return null;
}

// Component to manage viewer camera - only triggers dirty state, doesn't save
function DocumentViewerCameraManager({
  waId,
  setSaveStatus,
  viewerCameraRef,
  viewerCamera,
  viewerStoreStatus,
}: {
  waId: string;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  viewerCameraRef?: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
  } | null>;
  viewerCamera: { x: number; y: number; z: number } | null | undefined;
  viewerStoreStatus: TldrawStoreState["status"];
}) {
  const editor = useEditor();
  const cameraLoadedRef = useRef(false);
  const lastWaIdRef = useRef<string | null>(null);

  // Load viewer camera after store is ready (only once)
  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    // Reset camera loaded flag when waId changes
    if (waId !== lastWaIdRef.current) {
      cameraLoadedRef.current = false;
      lastWaIdRef.current = waId;
    }

    // Only load camera once when store is ready and camera hasn't been loaded yet
    if (
      viewerStoreStatus === "ready" &&
      viewerCamera &&
      !cameraLoadedRef.current
    ) {
      editor.setCamera(viewerCamera, { animation: { duration: 0 } });
      // Initialize viewer camera ref
      if (viewerCameraRef) {
        viewerCameraRef.current = viewerCamera;
      }
      cameraLoadedRef.current = true;
    }
  }, [editor, waId, viewerCamera, viewerCameraRef, viewerStoreStatus]);

  // Only trigger dirty state on camera changes
  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    const unlisten = editor.store.listen(
      ({ changes }) => {
        // Only listen for camera changes
        const hasCameraChange =
          Object.keys(changes.updated).some((id) => id.startsWith("camera")) ||
          Object.keys(changes.added).some((id) => id.startsWith("camera"));
        if (hasCameraChange) {
          // Update viewer camera ref for autosave bridge
          if (viewerCameraRef) {
            viewerCameraRef.current = editor.getCamera();
          }
          // Trigger shared dirty state (same as editor camera)
          setSaveStatus((prev) => {
            if (prev.status === "saving" || prev.status === "dirty") {
              return prev;
            }
            return { status: "dirty" };
          });
        }
      },
      { scope: "all" }
    );

    return () => {
      unlisten();
    };
  }, [editor, waId, setSaveStatus, viewerCameraRef]);

  return null;
}

type DocumentsSectionLayoutProps = {
  // State
  waId: string;
  isFullscreen: boolean;
  loading: boolean;
  isSceneTransitioning: boolean;
  customerDataSource: IDataSource | null;
  validationErrors: unknown[];
  saveStatus: SaveStatus;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  editInterceptors: unknown[];
  // Refs
  fsContainerRef: React.RefObject<HTMLDivElement | null>;
  // Handlers
  handleCreateNewCustomer: () => void;
  handleProviderReady: (provider: unknown) => Promise<void>;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  gridDispatch: (
    type:
      | "doc:user-select"
      | "doc:customer-loaded"
      | "grid:age-request"
      | "doc:persist"
      | "doc:notify",
    detail: unknown
  ) => void;
};

/**
 * Presentational layout component for DocumentsSection.
 * Pure presentation - all state and handlers provided via props.
 */
export function DocumentsSectionLayout({
  isFullscreen,
  loading,
  isSceneTransitioning,
  customerDataSource,
  validationErrors,
  saveStatus,
  editInterceptors,
  fsContainerRef,
  waId,
  handleCreateNewCustomer,
  handleProviderReady,
  gridDispatch,
  setSaveStatus,
}: DocumentsSectionLayoutProps) {
  const overlayLoading = loading || isSceneTransitioning;

  // Ref to track viewer camera for autosave bridge
  const viewerCameraRef = useRef<{ x: number; y: number; z: number } | null>(
    null
  );

  // Determine if canvases should be locked
  // Lock when: no customer loaded AND (no name OR no phone)
  // Unlock when: customer loaded OR (name AND phone are both valid)
  const [isCanvasLocked, setIsCanvasLocked] = useState(true);
  const [isCheckingLock, setIsCheckingLock] = useState(false);

  // Check lock state based on grid data and customer loaded state
  useEffect(() => {
    let isMounted = true;
    setIsCheckingLock(true);

    const checkLockState = async () => {
      try {
        if (!customerDataSource) {
          if (isMounted) {
            setIsCanvasLocked(true);
            setIsCheckingLock(false);
          }
          return;
        }

        // Check if customer is loaded (waId is valid and not default)
        const isCustomerLoaded = Boolean(
          waId && waId.trim() !== "" && waId !== DEFAULT_DOCUMENT_WA_ID
        );

        // If customer is loaded, unlock
        if (isCustomerLoaded) {
          if (isMounted) {
            setIsCanvasLocked(false);
            setIsCheckingLock(false);
          }
          return;
        }

        // If no customer loaded, check if name and phone are both filled
        const columns = customerDataSource.getColumnDefinitions();
        const nameCol = columns.findIndex(
          (c: (typeof columns)[number]) => c.id === "name"
        );
        const phoneCol = columns.findIndex(
          (c: (typeof columns)[number]) => c.id === "phone"
        );

        if (nameCol === -1 || phoneCol === -1) {
          if (isMounted) {
            setIsCanvasLocked(true);
            setIsCheckingLock(false);
          }
          return;
        }

        const [nameVal, phoneVal] = await Promise.all([
          customerDataSource.getCellData(nameCol, 0),
          customerDataSource.getCellData(phoneCol, 0),
        ]);

        const nameOk = typeof nameVal === "string" && nameVal.trim().length > 0;
        const phoneOk =
          typeof phoneVal === "string" &&
          phoneVal.trim().length > 0 &&
          phoneVal.trim().startsWith("+");

        // Unlock if both name and phone are valid
        const shouldUnlock = nameOk && phoneOk;

        if (isMounted) {
          setIsCanvasLocked(!shouldUnlock);
          setIsCheckingLock(false);
        }
      } catch (_error) {
        // On error, lock the canvas
        if (isMounted) {
          setIsCanvasLocked(true);
          setIsCheckingLock(false);
        }
      }
    };

    checkLockState();

    return () => {
      isMounted = false;
    };
  }, [customerDataSource, waId]);

  // Listen for grid data changes to recheck lock state
  useEffect(() => {
    if (!customerDataSource) {
      return;
    }

    const handleDataChange = () => {
      setIsCheckingLock(true);
      // Small delay to allow grid to update
      setTimeout(() => {
        const checkLockState = async () => {
          try {
            const isCustomerLoaded = Boolean(
              waId && waId.trim() !== "" && waId !== DEFAULT_DOCUMENT_WA_ID
            );

            if (isCustomerLoaded) {
              setIsCanvasLocked(false);
              setIsCheckingLock(false);
              return;
            }

            const columns = customerDataSource.getColumnDefinitions();
            const nameCol = columns.findIndex(
              (c: (typeof columns)[number]) => c.id === "name"
            );
            const phoneCol = columns.findIndex(
              (c: (typeof columns)[number]) => c.id === "phone"
            );

            if (nameCol === -1 || phoneCol === -1) {
              setIsCanvasLocked(true);
              setIsCheckingLock(false);
              return;
            }

            const [nameVal, phoneVal] = await Promise.all([
              customerDataSource.getCellData(nameCol, 0),
              customerDataSource.getCellData(phoneCol, 0),
            ]);

            const nameOk =
              typeof nameVal === "string" && nameVal.trim().length > 0;
            const phoneOk =
              typeof phoneVal === "string" &&
              phoneVal.trim().length > 0 &&
              phoneVal.trim().startsWith("+");

            setIsCanvasLocked(!(nameOk && phoneOk));
            setIsCheckingLock(false);
          } catch {
            setIsCanvasLocked(true);
            setIsCheckingLock(false);
          }
        };

        checkLockState();
      }, LOCK_CHECK_DEBOUNCE_MS);
    };

    // Listen for unlock request events
    window.addEventListener("doc:unlock-request", handleDataChange);
    // Also listen for customer loaded events
    window.addEventListener("doc:customer-loaded", handleDataChange);
    // Listen for grid data persistence events
    window.addEventListener("doc:persist", handleDataChange);

    return () => {
      window.removeEventListener("doc:unlock-request", handleDataChange);
      window.removeEventListener("doc:customer-loaded", handleDataChange);
      window.removeEventListener("doc:persist", handleDataChange);
    };
  }, [customerDataSource, waId]);

  const {
    data: canvasData,
    isLoading: isCanvasLoading,
    isFetching: isCanvasFetching,
    isError: isCanvasError,
    error: canvasError,
  } = useDocumentCanvas(waId);

  // Extract snapshot and cameras
  const remoteSnapshot = canvasData?.snapshot ?? null;
  const editorCamera = canvasData?.editorCamera ?? null;
  const viewerCamera = canvasData?.viewerCamera ?? null;

  // Copy default document for new customers without a document
  useDefaultDocumentCopy({
    waId,
    snapshot: remoteSnapshot,
    isLoading: isCanvasLoading || isCanvasFetching,
    isError: isCanvasError,
  });

  // Initialize viewer camera ref for autosave bridge
  useEffect(() => {
    if (viewerCamera) {
      viewerCameraRef.current = viewerCamera;
    }
  }, [viewerCamera]);

  // Create separate stores for editor and viewer
  const tldrawEditorStoreState = useTldrawStore({
    snapshot: remoteSnapshot,
    isLoading: isCanvasLoading || isCanvasFetching,
    hasError: isCanvasError,
    error: canvasError,
    waId,
  });

  const tldrawViewerStoreState = useTldrawStore({
    snapshot: remoteSnapshot,
    isLoading: isCanvasLoading || isCanvasFetching,
    hasError: isCanvasError,
    error: canvasError,
    waId,
  });

  // Sync editor store changes to viewer store in real-time
  useEffect(() => {
    if (
      tldrawEditorStoreState.status !== "ready" ||
      tldrawViewerStoreState.status !== "ready"
    ) {
      return;
    }

    const editorStore = tldrawEditorStoreState.store;
    const viewerStore = tldrawViewerStoreState.store;

    // Batch sync changes to avoid lag
    let pendingSync: ReturnType<typeof setTimeout> | null = null;
    const pendingIds = {
      added: new Set<string>(),
      updated: new Set<string>(),
      removed: new Set<string>(),
    };

    const performSync = () => {
      if (
        pendingIds.added.size === 0 &&
        pendingIds.updated.size === 0 &&
        pendingIds.removed.size === 0
      ) {
        return;
      }

      viewerStore.mergeRemoteChanges(() => {
        const recordsToSync: unknown[] = [];

        // Get all records that need to be added or updated
        for (const id of pendingIds.added) {
          const record = editorStore.get(id as RecordId);
          if (record) {
            recordsToSync.push(record);
          }
        }

        for (const id of pendingIds.updated) {
          const record = editorStore.get(id as RecordId);
          if (record) {
            recordsToSync.push(record);
          }
        }

        // Apply all changes
        if (recordsToSync.length > 0) {
          viewerStore.put(recordsToSync);
        }

        // Remove deleted records
        if (pendingIds.removed.size > 0) {
          viewerStore.remove(Array.from(pendingIds.removed) as RecordId[]);
        }
      });

      // Clear pending changes
      pendingIds.added.clear();
      pendingIds.updated.clear();
      pendingIds.removed.clear();
    };

    // Listen to editor store changes and sync document changes to viewer store
    const unsubscribe = editorStore.listen(
      ({ changes }) => {
        // Filter document IDs (exclude instance/session state)
        for (const id of Object.keys(changes.added)) {
          if (
            !(
              id.startsWith("instance") ||
              id.startsWith("pointer") ||
              id.startsWith("presence") ||
              id.startsWith("camera")
            )
          ) {
            pendingIds.added.add(id);
            pendingIds.updated.delete(id); // If it was updated, now it's added
            pendingIds.removed.delete(id); // If it was removed, now it's added
          }
        }

        for (const id of Object.keys(changes.updated)) {
          if (
            !(
              id.startsWith("instance") ||
              id.startsWith("pointer") ||
              id.startsWith("presence") ||
              id.startsWith("camera")
            )
          ) {
            // Only add to updated if not already in added
            if (!pendingIds.added.has(id)) {
              pendingIds.updated.add(id);
            }
            pendingIds.removed.delete(id); // If it was removed, now it's updated
          }
        }

        for (const id of Object.keys(changes.removed)) {
          if (
            !(
              id.startsWith("instance") ||
              id.startsWith("pointer") ||
              id.startsWith("presence") ||
              id.startsWith("camera")
            )
          ) {
            pendingIds.removed.add(id);
            pendingIds.added.delete(id); // If it was added, now it's removed
            pendingIds.updated.delete(id); // If it was updated, now it's removed
          }
        }

        // Debounce sync to batch rapid changes
        if (pendingSync) {
          clearTimeout(pendingSync);
        }
        pendingSync = setTimeout(() => {
          performSync();
          pendingSync = null;
        }, FRAME_SYNC_INTERVAL_MS); // ~60fps, sync every frame
      },
      { scope: "document", source: "user" }
    );

    return () => {
      if (pendingSync) {
        clearTimeout(pendingSync);
      }
      unsubscribe();
    };
  }, [
    tldrawEditorStoreState.status,
    tldrawViewerStoreState.status,
    tldrawEditorStoreState.store,
    tldrawViewerStoreState.store,
  ]);

  // Calculate loading progress for both canvases
  const editorProgress = useCanvasLoadingProgress({
    isLoading: isCanvasLoading,
    isFetching: isCanvasFetching,
    hasData: Boolean(remoteSnapshot),
    storeStatus: tldrawEditorStoreState.status,
  });

  const viewerProgress = useCanvasLoadingProgress({
    isLoading: isCanvasLoading,
    isFetching: isCanvasFetching,
    hasData: Boolean(remoteSnapshot),
    storeStatus: tldrawViewerStoreState.status,
  });

  const storeErrorMessage = useMemo(() => {
    if (isCanvasError) {
      if (canvasError instanceof Error) {
        return canvasError.message || "Failed to load document canvas.";
      }
      return "Failed to load document canvas.";
    }
    if (tldrawEditorStoreState.status === "error") {
      const cause = tldrawEditorStoreState.error;
      if (cause instanceof Error) {
        return cause.message || "Unable to initialize TLDraw store.";
      }
      return "Unable to initialize TLDraw store.";
    }
    return;
  }, [canvasError, isCanvasError, tldrawEditorStoreState]);

  useEffect(() => {
    if (!waId) {
      setSaveStatus((prev) =>
        prev.status === "ready" ? prev : { status: "ready" }
      );
      return;
    }

    setSaveStatus((prev) => {
      if (storeErrorMessage) {
        return {
          status: "error",
          message: storeErrorMessage,
        };
      }

      if (
        isCanvasLoading ||
        isCanvasFetching ||
        tldrawEditorStoreState.status === "loading" ||
        overlayLoading
      ) {
        return prev.status === "dirty" || prev.status === "saving"
          ? prev
          : { status: "loading" };
      }

      if (
        tldrawEditorStoreState.status === "ready" &&
        prev.status === "loading"
      ) {
        return { status: "saved", at: Date.now() };
      }

      return prev;
    });
  }, [
    isCanvasFetching,
    isCanvasLoading,
    overlayLoading,
    storeErrorMessage,
    tldrawEditorStoreState,
    waId,
    setSaveStatus,
  ]);

  // Memoize grid props to prevent unnecessary re-renders
  // Only include dataSource in dependencies - callbacks should be stable via gridDispatch
  const gridProps = useMemo(
    () => ({
      className: "min-h-[55px] w-full",
      dataSource: customerDataSource as unknown as IDataSource,
      disableTrailingRow: true,
      documentsGrid: true,
      editInterceptors,
      fullWidth: true,
      headerHeight: 21, // Reduced by 40% from default 35px (35 * 0.6 = 21)
      hideAppendRowPlaceholder: true,
      hideOuterFrame: true, // Hide grid border since container already has border
      loading: false,
      onAddRowOverride: handleCreateNewCustomer,
      onFieldPersist: (field: unknown) =>
        gridDispatch("doc:persist", { field, waId }),
      onNotify: (field: unknown) => gridDispatch("doc:notify", { field, waId }),
      onDataProviderReady: handleProviderReady,
      rowHeight: 43, // Increased by 30% from default 33px (33 * 1.3 = 42.9 ≈ 43)
      rowMarkers: "none" as const,
      showThemeToggle: false,
      validationErrors,
    }),
    [
      customerDataSource,
      editInterceptors,
      handleCreateNewCustomer,
      handleProviderReady,
      gridDispatch,
      waId,
      validationErrors,
    ]
  );

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-3 px-3 pt-0 pb-3 sm:px-4 sm:pb-4">
        {/* Header spacer (calendar icon exists elsewhere) */}
        <div className="flex items-center justify-end gap-2" />

        {/* Grid container - only as big as grid needs */}
        <div
          className={`overflow-hidden rounded-lg border border-border/50 bg-card/50 ${isFullscreen ? "rounded-none border-0" : ""}`}
          ref={fsContainerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "0 0 auto",
          }}
        >
          <div
            className="documents-grid-container m-2 rounded-md border border-border/50 bg-background/60 p-1"
            key="grid-container-wrapper"
          >
            <FullscreenProvider>
              <ClientGrid key="documents-grid" {...gridProps} />
            </FullscreenProvider>
          </div>
        </div>

        {/* Top container - TLDraw Viewer Canvas (smaller) */}
        <div
          className={`tldraw-viewer-container relative overflow-hidden rounded-lg border border-border/50 bg-card/50 ${isFullscreen ? "rounded-none border-0" : ""}`}
        >
          {/* TLDraw Viewer - fills entire space */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <DocumentViewerCanvas
              className="h-full w-full"
              progress={viewerProgress}
              storeState={tldrawViewerStoreState}
              {...(storeErrorMessage
                ? { errorMessage: storeErrorMessage }
                : {})}
            >
              {waId && tldrawViewerStoreState.status === "ready" ? (
                <DocumentViewerCameraManager
                  setSaveStatus={setSaveStatus}
                  viewerCamera={viewerCamera}
                  viewerCameraRef={viewerCameraRef}
                  viewerStoreStatus={tldrawViewerStoreState.status}
                  waId={waId}
                />
              ) : null}
            </DocumentViewerCanvas>

            {/* Lock overlay */}
            <DocumentLockOverlay
              active={isCanvasLocked}
              loading={isCheckingLock}
              {...(isCanvasLocked
                ? {
                    message:
                      "Please enter both name and phone, or load a customer",
                  }
                : {})}
            />

            {/* Status indicator - overlay top right */}
            <div className="tldraw-status-overlay absolute top-4 right-4">
              <DocumentSavingIndicator status={saveStatus} />
            </div>
          </div>
        </div>

        {/* Bottom container - TLDraw Editor Canvas with tools (4x larger) */}
        <div
          className={`tldraw-editor-container relative flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 ${isFullscreen ? "rounded-none border-0" : ""}`}
        >
          {/* TLDraw Editor - fills space with tools visible */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <DocumentEditorCanvas
              className="h-full w-full"
              progress={editorProgress}
              storeState={tldrawEditorStoreState}
              {...(storeErrorMessage
                ? { errorMessage: storeErrorMessage }
                : {})}
            >
              {waId && tldrawEditorStoreState.status === "ready" ? (
                <DocumentAutosaveBridge
                  editorCamera={editorCamera}
                  editorStoreStatus={tldrawEditorStoreState.status}
                  setSaveStatus={setSaveStatus}
                  viewerCameraRef={viewerCameraRef}
                  waId={waId}
                />
              ) : null}
            </DocumentEditorCanvas>

            {/* Lock overlay */}
            <DocumentLockOverlay
              active={isCanvasLocked}
              loading={isCheckingLock}
              {...(isCanvasLocked
                ? {
                    message:
                      "Please enter both name and phone, or load a customer",
                  }
                : {})}
            />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
