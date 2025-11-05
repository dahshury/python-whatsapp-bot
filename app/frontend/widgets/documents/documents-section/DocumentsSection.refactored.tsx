"use client";

import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import {
  useDocumentCustomerRow,
  useDocumentScene,
  useEnsureInitialized,
} from "@/features/documents";
// TODO: These hooks don't exist yet - need to implement or remove usage
// useCustomerPersistence,
// useDocumentLock,
// useDualCanvasState,
// useFullscreen,
// useViewerSync,
import {
  DEFAULT_DOCUMENT_WA_ID,
  toSceneFromDoc,
} from "@/shared/libs/documents";
import { i18n } from "@/shared/libs/i18n";
import { logger } from "@/shared/libs/logger";
import { useLanguage } from "@/shared/libs/state/language-context";
import { SidebarInset } from "@/shared/ui/sidebar";

// TODO: DocumentWorkArea doesn't exist - need to implement or use alternative
// import { DocumentWorkArea } from '@/widgets/documents/work-area/DocumentWorkArea'

// Stub implementations for missing hooks/components
const logMissingImplementation = (feature: string) => {
  logger.warn(`[DocumentsSection] ${feature} is not implemented yet.`);
};

const useDualCanvasState = () => {
  const [scene, setScene] = useState<Record<string, unknown> | null>(null);
  return {
    scene,
    setScene,
    editorCameraRef: { current: null },
    viewerCameraRef: { current: null },
    resetViewerCamera: () => logMissingImplementation("resetViewerCamera"),
    updateViewerCamera: (_appState: Record<string, unknown>) => true,
  };
};
const useDocumentLock = (_opts: { waId: string }) => ({ isUnlocked: true });
const useViewerSync = () => ({
  mirrorToViewer: (_elements: unknown[], _files: Record<string, unknown>) =>
    logMissingImplementation("mirrorToViewer"),
  onViewerApiReady: (_api: unknown) =>
    logMissingImplementation("onViewerApiReady"),
});
const useCustomerPersistence = (_opts: { waId: string }) => ({
  setIgnorePersistUntil: (_ms: number) =>
    logMissingImplementation("setIgnorePersistUntil"),
  clearPersistTimer: () => logMissingImplementation("clearPersistTimer"),
});
const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  return {
    isFullscreen,
    containerRef: { current: null },
    enterFullscreen: () => setIsFullscreen(true),
    exitFullscreen: () => setIsFullscreen(false),
  };
};
const DocumentWorkArea = (_props: Record<string, unknown>) => null;

// Constants
const PERSIST_SUPPRESS_MS = 900;

function DocumentsPageContent() {
  const { resolvedTheme } = useTheme();
  const { locale, isLocalized } = useLanguage();
  const searchParams = useSearchParams();

  // Document initialization
  const ensureInitialized = useEnsureInitialized();
  const [waId, setWaId] = useState<string>(DEFAULT_DOCUMENT_WA_ID);

  // Dual canvas state management
  const {
    scene,
    setScene,
    viewerCameraRef,
    resetViewerCamera,
    updateViewerCamera,
  } = useDualCanvasState();

  // Customer row data and grid
  const {
    customerColumns,
    customerDataSource,
    customerLoading,
    validationErrors,
    onDataProviderReady,
  } = useDocumentCustomerRow(waId);

  // Document lock state
  const { isUnlocked } = useDocumentLock({
    waId,
  });

  // Document scene (autosave, loading)
  const {
    handleCanvasChange: originalHandleCanvasChange,
    onExcalidrawAPI,
    saveStatus,
    loading,
  } = useDocumentScene(waId, { enabled: true, isUnlocked });

  // Viewer synchronization
  const { mirrorToViewer, onViewerApiReady } = useViewerSync();

  // Customer persistence
  const { setIgnorePersistUntil, clearPersistTimer } = useCustomerPersistence({
    waId,
  });

  // Fullscreen mode
  const { isFullscreen, containerRef, enterFullscreen, exitFullscreen } =
    useFullscreen();

  // Initialize default waId on mount
  useEffect(() => {
    setWaId(DEFAULT_DOCUMENT_WA_ID);
  }, []);

  // Handle URL waId parameter
  useEffect(() => {
    const urlWaId = searchParams.get("waId");
    if (urlWaId && urlWaId !== DEFAULT_DOCUMENT_WA_ID) {
      setIgnorePersistUntil(PERSIST_SUPPRESS_MS);
      clearPersistTimer();
      resetViewerCamera();
      ensureInitialized(urlWaId).catch(() => {
        // Silently handle initialization errors
      });
      setWaId(urlWaId);
    }
  }, [
    searchParams,
    ensureInitialized,
    setIgnorePersistUntil,
    clearPersistTimer,
    resetViewerCamera,
  ]);

  // Handle customer selection events from grid/calendar
  useEffect(() => {
    const handler = (e: Event) => {
      const next = String((e as CustomEvent).detail?.waId || "");
      if (!next) {
        return;
      }

      setIgnorePersistUntil(PERSIST_SUPPRESS_MS);
      clearPersistTimer();
      resetViewerCamera();
      ensureInitialized(next).catch(() => {
        // Silently handle initialization errors
      });
      setWaId(next);
    };

    window.addEventListener("doc:user-select", handler as EventListener);
    return () =>
      window.removeEventListener("doc:user-select", handler as EventListener);
  }, [
    ensureInitialized,
    setIgnorePersistUntil,
    clearPersistTimer,
    resetViewerCamera,
  ]);

  // Viewer canvas change handler (track camera for persistence)
  const handleViewerCanvasChange = useCallback(
    (
      _elements: unknown[],
      appState: Record<string, unknown>,
      _files: Record<string, unknown>
    ) => {
      const changed = updateViewerCamera(appState);
      if (!changed) {
        return;
      }

      // Trigger autosave with viewer camera change
      try {
        if (
          scene &&
          typeof scene === "object" &&
          "elements" in scene &&
          scene.elements &&
          isUnlocked
        ) {
          const sceneAppState =
            scene && typeof scene === "object" && "appState" in scene
              ? (scene.appState as Record<string, unknown>)
              : undefined;
          const editorCamera = sceneAppState
            ? {
                zoom: sceneAppState.zoom,
                scrollX: sceneAppState.scrollX,
                scrollY: sceneAppState.scrollY,
              }
            : undefined;

          originalHandleCanvasChange({
            elements: scene.elements as unknown[],
            appState: (scene.appState || {}) as Record<string, unknown>,
            files: (scene.files || {}) as Record<string, unknown>,
            viewerAppState: viewerCameraRef.current ?? undefined,
            editorAppState: editorCamera,
          });
        }
      } catch {
        // Silently handle autosave errors
      }
    },
    [
      scene,
      isUnlocked,
      updateViewerCamera,
      originalHandleCanvasChange,
      viewerCameraRef,
    ]
  );

  // Editor canvas change handler (mirror to viewer + autosave)
  const handleCanvasChange = useCallback(
    (
      elements: unknown[],
      appState: Record<string, unknown>,
      files: Record<string, unknown>
    ) => {
      // Mirror elements/files to viewer (not appState/camera)
      mirrorToViewer(elements, files as Record<string, unknown>);

      // Extract editor camera for persistence
      const editorCamera = {
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      };

      // Trigger autosave with both cameras
      originalHandleCanvasChange({
        elements,
        appState,
        files,
        viewerAppState: viewerCameraRef.current ?? undefined,
        editorAppState: editorCamera,
      });
    },
    [mirrorToViewer, originalHandleCanvasChange, viewerCameraRef]
  );

  // Clear action: reset to default document
  const handleClear = useCallback(async () => {
    try {
      const ds = customerDataSource;
      const nameCol = customerColumns.findIndex((c) => c.id === "name");
      const ageCol = customerColumns.findIndex((c) => c.id === "age");
      const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

      await ds.setCellData(nameCol, 0, "");
      await ds.setCellData(ageCol, 0, null);
      await ds.setCellData(phoneCol, 0, "");

      resetViewerCamera();
      setWaId(DEFAULT_DOCUMENT_WA_ID);
      setScene(toSceneFromDoc(null));
    } catch {
      // Silently handle clear errors
    }
  }, [customerColumns, customerDataSource, resetViewerCamera, setScene]);

  const themeMode = resolvedTheme === "dark" ? "dark" : "light";
  const lockMessage = isUnlocked
    ? i18n.getMessage("document_loading", isLocalized)
    : i18n.getMessage("document_unlock_prompt", isLocalized);

  return (
    <SidebarInset>
      <div className="flex flex-1 flex-col gap-3 px-4 pt-1 pb-4">
        {/* Header spacer */}
        <div className="flex items-center justify-end gap-2" />

        {/* Main work area */}
        <DocumentWorkArea
          containerRef={containerRef}
          customerColumns={customerColumns}
          customerDataSource={customerDataSource}
          customerLoading={customerLoading}
          isFullscreen={isFullscreen}
          isUnlocked={isUnlocked}
          langCode={locale || "en"}
          loading={loading}
          lockMessage={lockMessage}
          onClear={handleClear}
          onDataProviderReady={onDataProviderReady}
          onEditorApiReady={onExcalidrawAPI}
          onEditorChange={
            handleCanvasChange as unknown as ExcalidrawProps["onChange"]
          }
          onEnterFullscreen={enterFullscreen}
          onExitFullscreen={exitFullscreen}
          onViewerApiReady={onViewerApiReady}
          onViewerChange={
            handleViewerCanvasChange as unknown as ExcalidrawProps["onChange"]
          }
          saveStatus={saveStatus}
          scene={scene}
          theme={themeMode}
          validationErrors={validationErrors}
        />
      </div>
    </SidebarInset>
  );
}

export default function DocumentsSection() {
  return <DocumentsPageContent />;
}
