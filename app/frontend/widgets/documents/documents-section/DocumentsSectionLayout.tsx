"use client";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { IDataSource } from "@/shared/libs/data-grid";
import { FullscreenProvider } from "@/shared/libs/data-grid";
import { i18n } from "@/shared/libs/i18n";
import { SidebarInset } from "@/shared/ui/sidebar";
import { DocumentLockOverlay } from "@/widgets/documents/DocumentLockOverlay";
import { DocumentSavingIndicator } from "@/widgets/documents/DocumentSavingIndicator";
import { DocumentEditorCanvas } from "@/widgets/documents/document-editor";
import { DocumentViewerCanvas } from "@/widgets/documents/document-viewer";

// Defer Grid import to client to avoid SSR window references inside the library
// Import outside component to prevent recreation on every render
const ClientGrid = dynamic(
  () => import("@/shared/libs/data-grid/components/Grid"),
  {
    ssr: false,
  }
);

type DocumentsSectionLayoutProps = {
  // State
  waId: string;
  scene: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  } | null;
  viewerScene: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  } | null;
  isUnlocked: boolean;
  isFullscreen: boolean;
  loading: boolean;
  isSceneTransitioning: boolean;
  customerDataSource: IDataSource | null;
  validationErrors: unknown[];
  saveStatus:
    | { status: "idle" }
    | { status: "dirty" }
    | { status: "saving" }
    | { status: "saved"; at: number }
    | { status: "error"; message?: string };
  themeMode: "light" | "dark";
  locale: string;
  isLocalized: boolean;
  editInterceptors: unknown[];
  // Refs
  fsContainerRef: React.RefObject<HTMLDivElement | null>;
  // Handlers
  handleCreateNewCustomer: () => Promise<void>;
  handleProviderReady: (provider: unknown) => Promise<void>;
  handleViewerCanvasChange: (
    elements: unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) => void;
  handleCanvasChange: (
    elements: unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) => void;
  onApiReadyWithApply: (api: ExcalidrawImperativeAPI) => void;
  onViewerApiReady: (api: ExcalidrawImperativeAPI) => void;
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
  scene,
  viewerScene,
  isUnlocked,
  isFullscreen,
  loading,
  isSceneTransitioning,
  customerDataSource,
  validationErrors,
  saveStatus,
  themeMode,
  locale,
  isLocalized,
  editInterceptors,
  fsContainerRef,
  waId,
  handleCreateNewCustomer,
  handleProviderReady,
  handleViewerCanvasChange,
  handleCanvasChange,
  onApiReadyWithApply,
  onViewerApiReady,
  enterFullscreen,
  exitFullscreen,
  gridDispatch,
}: DocumentsSectionLayoutProps) {
  const overlayLoading = loading || isSceneTransitioning;

  // Memoize grid props to prevent unnecessary re-renders
  // Only include dataSource in dependencies - callbacks should be stable via gridDispatch
  const gridProps = useMemo(
    () => ({
      className: "min-h-[64px] w-full",
      dataSource: customerDataSource as unknown as IDataSource,
      disableTrailingRow: true,
      documentsGrid: true,
      editInterceptors,
      fullWidth: true,
      hideAppendRowPlaceholder: true,
      loading: false,
      onAddRowOverride: handleCreateNewCustomer,
      onFieldPersist: (field: unknown) =>
        gridDispatch("doc:persist", { field, waId }),
      onNotify: (field: unknown) => gridDispatch("doc:notify", { field, waId }),
      onDataProviderReady: handleProviderReady,
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

  // Memoize the grid container to prevent remounting
  const gridContainer = useMemo(
    () => (
      <div
        className="w-full flex-shrink-0 rounded-md border border-border/50 bg-background/60 p-1"
        key="grid-container"
      >
        <FullscreenProvider>
          <ClientGrid key="documents-grid" {...gridProps} />
        </FullscreenProvider>
      </div>
    ),
    [gridProps]
  );

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
        {/* Header spacer (calendar icon exists elsewhere) */}
        <div className="flex items-center justify-end gap-2" />

        {/* Work area: grid + canvases */}
        <div
          className={`flex-1 rounded-lg border border-border/50 bg-card/50 p-2 ${isFullscreen ? "rounded-none border-0 p-0" : ""}`}
          ref={fsContainerRef}
        >
          <div
            className="flex min-h-0 flex-col gap-2"
            style={{ height: isFullscreen ? "100vh" : "calc(100vh - 6.5rem)" }}
          >
            {/* Top: customer grid */}
            {gridContainer}

            {/* Below: dual canvases */}
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {/* Viewer (top, ~150px) - real-time mirror of editor with independent camera */}
              <div className="relative h-[150px] flex-shrink-0 overflow-hidden rounded-md border border-border/50 bg-card/40">
                <DocumentViewerCanvas
                  langCode={locale || "en"}
                  onApiReady={onViewerApiReady}
                  onChange={
                    handleViewerCanvasChange as unknown as ExcalidrawProps["onChange"]
                  }
                  scene={viewerScene || undefined}
                  theme={themeMode}
                />
                {/* Saving indicator overlay */}
                <div className="pointer-events-none absolute top-2 right-2 z-[3]">
                  <DocumentSavingIndicator
                    loading={overlayLoading}
                    status={saveStatus}
                  />
                </div>
                {/* Lock overlay when not unlocked or loading (viewer - spinner only) */}
                <DocumentLockOverlay
                  active={overlayLoading || !isUnlocked}
                  loading={overlayLoading}
                  message=""
                />
              </div>

              {/* Editor (bottom, flex-fill) */}
              <div
                className={`relative min-h-0 flex-1 ${isFullscreen ? "rounded-none border-0" : "rounded-md border border-border/50"} flex flex-col overflow-hidden bg-card/40`}
              >
                <DocumentEditorCanvas
                  langCode={locale || "en"}
                  onApiReady={onApiReadyWithApply}
                  onChange={
                    handleCanvasChange as unknown as ExcalidrawProps["onChange"]
                  }
                  scene={scene || undefined}
                  theme={themeMode}
                />

                {/* Lock overlay when not unlocked; show loading when busy */}
                <DocumentLockOverlay
                  active={overlayLoading || !isUnlocked}
                  loading={overlayLoading}
                  message={
                    overlayLoading
                      ? i18n.getMessage("document_loading", isLocalized)
                      : i18n.getMessage("document_unlock_prompt", isLocalized)
                  }
                />
                {/* Fullscreen toggle button (theme-aware container) */}
                <div className="absolute right-2 bottom-2 z-[3]">
                  <div className="rounded-md border border-border bg-card/90 px-1.5 py-1 text-foreground shadow-sm backdrop-blur">
                    {isFullscreen ? (
                      <button
                        aria-label="Exit fullscreen"
                        className="excalidraw-fullscreen-button"
                        onClick={exitFullscreen}
                        type="button"
                      >
                        <Minimize2 className="size-4" />
                      </button>
                    ) : (
                      <button
                        aria-label="Enter fullscreen"
                        className="excalidraw-fullscreen-button"
                        onClick={enterFullscreen}
                        type="button"
                      >
                        <Maximize2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
