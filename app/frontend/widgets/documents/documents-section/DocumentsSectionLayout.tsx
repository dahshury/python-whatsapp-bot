"use client";

import type { DataEditorRef } from "@glideapps/glide-data-grid";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Editor } from "tldraw";
import {
  useDocumentCanvas,
  useDocumentCanvasLockState,
  useDocumentStoreStatus,
  useDocumentStoreSync,
  useDocumentsGridAddRow,
  useDocumentsGridRefresh,
  useTldrawStore,
} from "@/features/documents/hooks";
import { createDocumentsService } from "@/features/documents/services/documents.service.factory";
import type { SaveStatus } from "@/features/documents/types/save-state.types";
import { useSettingsStore } from "@/infrastructure/store/app-store";
import type { IColumnDefinition, IDataSource } from "@/shared/libs/data-grid";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";
import { ResizableSplitPane } from "@/shared/ui/resizable-split-pane";
import { SidebarInset } from "@/shared/ui/sidebar";
import {
  DocumentsEditorPanel,
  DocumentsGridPanel,
  DocumentsViewerPanel,
} from "./ui";
import "./documents-grid.css";

const DEFAULT_VIEWER_SPLIT_PERCENT = 30;

// Viewer canvas disabled - sync interval no longer needed
const STORE_SYNC_INTERVAL_MS = 16; // ~60fps sync interval

type DocumentsSectionLayoutProps = {
  // State
  waId: string;
  isFullscreen: boolean;
  loading: boolean;
  isSceneTransitioning: boolean;
  customerDataSource: IDataSource | null;
  customerColumns: IColumnDefinition[];
  providerRef: React.MutableRefObject<DataProvider | null>;
  validationErrors: unknown[];
  saveStatus: SaveStatus;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  editInterceptors: unknown[];
  // Refs
  fsContainerRef: React.RefObject<HTMLDivElement | null>;
  // Handlers
  handleProviderReady: (provider: unknown) => Promise<void>;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  startNewCustomer: () => Promise<string | null | undefined>;
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
  customerColumns,
  providerRef,
  validationErrors,
  saveStatus,
  editInterceptors,
  fsContainerRef,
  waId,
  handleProviderReady,
  gridDispatch,
  setSaveStatus,
  enterFullscreen,
  exitFullscreen,
  startNewCustomer,
}: DocumentsSectionLayoutProps) {
  const overlayLoading = loading || isSceneTransitioning;

  const documentsService = useMemo(() => createDocumentsService(), []);

  // Refs for editor instances to enable proper canvas clearing
  const editorRef = useRef<Editor | null>(null);
  const viewerRef = useRef<Editor | null>(null);

  const handleEditorMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleViewerMount = useCallback((editor: Editor) => {
    viewerRef.current = editor;
  }, []);

  // Ref to track viewer camera for autosave bridge
  const viewerCameraRef = useRef<{ x: number; y: number; z: number } | null>(
    null
  );

  // Ref for grid data editor to enable programmatic updates
  const gridDataEditorRef = useRef<DataEditorRef | null>(null);

  const { isCanvasLocked, isCheckingLock, setIsCanvasLocked } =
    useDocumentCanvasLockState({
      customerDataSource,
      waId,
    });

  const canLoadCanvas = !(isCheckingLock || isCanvasLocked);

  const {
    data: canvasData,
    isLoading: isCanvasLoading,
    isFetching: isCanvasFetching,
    isError: isCanvasError,
    error: canvasError,
  } = useDocumentCanvas(waId);

  // Extract snapshot, cameras, and page ID
  const remoteSnapshot = canvasData?.snapshot ?? null;
  const editorCamera = canvasData?.editorCamera ?? null;
  const viewerCamera = canvasData?.viewerCamera ?? null;
  const editorPageId = canvasData?.editorPageId ?? null;

  const snapshotKey = useMemo(() => {
    if (!remoteSnapshot) {
      return null;
    }
    try {
      return JSON.stringify(remoteSnapshot);
    } catch {
      return null;
    }
  }, [remoteSnapshot]);

  // Initialize viewer camera ref for autosave bridge
  useEffect(() => {
    if (viewerCamera) {
      viewerCameraRef.current = viewerCamera;
    }
  }, [viewerCamera]);

  // Dispatch customer-loaded event when canvas data successfully loads
  // This ensures the lock overlay is removed when loading the same customer again after clearing
  useEffect(() => {
    if (isCanvasLoading || isCanvasFetching || isCanvasError) {
      return;
    }

    if (!waId || waId.trim() === "") {
      return;
    }

    if (canvasData === undefined) {
      return;
    }

    // Canvas data has successfully loaded - dispatch events to:
    // 1. Trigger lock state re-evaluation (doc:customer-loaded)
    // 2. Reload customer row data (doc:force-customer-reload)
    try {
      window.dispatchEvent(
        new CustomEvent("doc:customer-loaded", {
          detail: { waId },
        })
      );
      window.dispatchEvent(
        new CustomEvent("doc:force-customer-reload", {
          detail: { waId },
        })
      );
    } catch {
      // Ignore dispatch errors (e.g., server-side rendering)
    }
  }, [isCanvasLoading, isCanvasFetching, isCanvasError, waId, canvasData]);

  // Get viewer enabled setting
  const {
    viewerEnabled,
    viewerSplitPaneLocked,
    viewerSplitPaneHeight,
    setViewerSplitPaneHeight,
  } = useSettingsStore();

  // Prevent hydration mismatch: only enable viewer after client mounts
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  const viewerActive = isHydrated && viewerEnabled;

  // Create separate stores for editor and viewer
  const tldrawEditorStoreState = useTldrawStore({
    snapshot: remoteSnapshot,
    snapshotKey,
    isLoading: isCanvasLoading || isCanvasFetching,
    hasError: isCanvasError,
    error: canvasError,
    waId,
    enabled: canLoadCanvas,
  });

  // Always create viewer store, but conditionally use it based on viewerEnabled setting
  const tldrawViewerStoreStateFull = useTldrawStore({
    snapshot: remoteSnapshot,
    snapshotKey,
    isLoading: isCanvasLoading || isCanvasFetching,
    hasError: isCanvasError,
    error: canvasError,
    waId,
    enabled: viewerActive && canLoadCanvas,
  });

  // Create minimal state for when viewer is disabled
  const tldrawViewerStoreStateMinimal = useMemo(() => {
    if (isCanvasError) {
      return { status: "error" as const, error: canvasError };
    }
    if (isCanvasLoading || isCanvasFetching) {
      return { status: "loading" as const };
    }
    return { status: "loading" as const };
  }, [isCanvasError, isCanvasLoading, isCanvasFetching, canvasError]);

  // Conditionally use full store or minimal state based on viewerEnabled setting
  const tldrawViewerStoreState = viewerActive
    ? tldrawViewerStoreStateFull
    : tldrawViewerStoreStateMinimal;

  // Self-contained hook for documents grid "Add row" button behavior
  const { onAddRowOverride } = useDocumentsGridAddRow({
    customerDataSource,
    customerColumns,
    providerRef,
    editorRef,
    viewerRef,
    setIsCanvasLocked,
    setSaveStatus,
    waId,
    onStartNewCustomer: startNewCustomer,
  });

  // Conditionally sync stores based on viewerEnabled setting
  useDocumentStoreSync({
    editorStoreState: tldrawEditorStoreState,
    viewerStoreState: tldrawViewerStoreState,
    syncIntervalMs: STORE_SYNC_INTERVAL_MS,
    enabled: viewerActive && canLoadCanvas,
  });

  const { storeErrorMessage } = useDocumentStoreStatus({
    canvasError,
    isCanvasError,
    isCanvasFetching,
    isCanvasLoading,
    canLoadCanvas,
    overlayLoading,
    remoteSnapshot,
    setSaveStatus,
    tldrawEditorStoreState,
    tldrawViewerStoreState,
    waId,
  });

  // Handle grid refresh logic (API setup, data change detection, event listeners)
  useDocumentsGridRefresh({
    gridDataEditorRef,
    customerDataSource,
    customerColumns,
  });

  // Memoize grid props to prevent unnecessary re-renders
  // Only include dataSource in dependencies - callbacks should be stable via gridDispatch
  const gridProps = useMemo(
    () => ({
      className: "min-h-[55px] w-full",
      dataSource: customerDataSource as unknown as IDataSource,
      dataEditorRef: gridDataEditorRef,
      disableTrailingRow: true,
      documentsGrid: true,
      editInterceptors,
      fullWidth: true,
      headerHeight: 21, // Reduced by 40% from default 35px (35 * 0.6 = 21)
      hideAppendRowPlaceholder: true,
      hideOuterFrame: true, // Hide grid border since container already has border
      loading: false,
      onAddRowOverride,
      onFieldPersist: (field: unknown) =>
        gridDispatch("doc:persist", { field, waId }),
      onNotify: (field: unknown) => gridDispatch("doc:notify", { field, waId }),
      onDataProviderReady: handleProviderReady,
      rowHeight: 43, // Increased by 30% from default 33px (33 * 1.3 = 42.9 ≈ 43)
      rowMarkers: "none" as const,
      showThemeToggle: false,
      toolbarAnchor: "overlay" as const,
      toolbarAlwaysVisible: false,
      toolbarHiddenActions: ["downloadCsv", "fullscreen", "search"] as const,
      validationErrors,
    }),
    [
      customerDataSource,
      editInterceptors,
      onAddRowOverride,
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

        {/* Fullscreen container wrapping all panels (grid + canvases) */}
        <div
          className="flex flex-1 flex-col gap-3"
          ref={fsContainerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0",
            minHeight: 0,
            ...(isFullscreen && {
              backgroundColor: "hsl(var(--muted))",
            }),
          }}
        >
          <DocumentsGridPanel
            gridProps={gridProps}
            isFullscreen={isFullscreen}
          />

          {viewerActive ? (
            <ResizableSplitPane
              bottom={
                <DocumentsEditorPanel
                  className="h-full min-h-0"
                  documentsService={documentsService}
                  editorCamera={editorCamera}
                  editorPageId={editorPageId}
                  enterFullscreen={enterFullscreen}
                  exitFullscreen={exitFullscreen}
                  isCanvasLocked={isCanvasLocked}
                  isCheckingLock={isCheckingLock}
                  isFullscreen={isFullscreen}
                  onEditorMount={handleEditorMount}
                  saveStatus={saveStatus}
                  setSaveStatus={setSaveStatus}
                  storeErrorMessage={storeErrorMessage}
                  tldrawEditorStoreState={tldrawEditorStoreState}
                  viewerActive={viewerActive}
                  viewerCameraRef={viewerCameraRef}
                  waId={waId}
                />
              }
              defaultTopHeight={
                viewerSplitPaneHeight ?? DEFAULT_VIEWER_SPLIT_PERCENT
              }
              locked={viewerSplitPaneLocked}
              minBottomHeight={150}
              minTopHeight={150}
              onHeightChange={(height) => {
                if (!viewerSplitPaneLocked) {
                  setViewerSplitPaneHeight(height);
                }
              }}
              top={
                <DocumentsViewerPanel
                  className="min-h-0"
                  isCanvasLocked={isCanvasLocked}
                  isCheckingLock={isCheckingLock}
                  isFullscreen={isFullscreen}
                  onViewerMount={handleViewerMount}
                  saveStatus={saveStatus}
                  setSaveStatus={setSaveStatus}
                  storeErrorMessage={storeErrorMessage}
                  tldrawViewerStoreState={tldrawViewerStoreState}
                  viewerCamera={viewerCamera}
                  viewerCameraRef={viewerCameraRef}
                  viewerProgress={0}
                  waId={waId}
                />
              }
            />
          ) : (
            <div
              className="flex min-h-0 flex-1 flex-col"
              suppressHydrationWarning={!isHydrated}
            >
              <DocumentsEditorPanel
                className="h-full min-h-0"
                documentsService={documentsService}
                editorCamera={editorCamera}
                editorPageId={editorPageId}
                enterFullscreen={enterFullscreen}
                exitFullscreen={exitFullscreen}
                isCanvasLocked={isCanvasLocked}
                isCheckingLock={isCheckingLock}
                isFullscreen={isFullscreen}
                onEditorMount={handleEditorMount}
                saveStatus={saveStatus}
                setSaveStatus={setSaveStatus}
                storeErrorMessage={storeErrorMessage}
                tldrawEditorStoreState={tldrawEditorStoreState}
                viewerActive={viewerActive}
                viewerCameraRef={viewerCameraRef}
                waId={waId}
              />
            </div>
          )}
        </div>
      </div>
    </SidebarInset>
  );
}
