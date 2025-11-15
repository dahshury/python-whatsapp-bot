"use client";

import dynamic from "next/dynamic";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Editor } from "tldraw";

import { DocumentViewerCameraManager } from "@/features/documents";
import type { TldrawStoreState } from "@/features/documents/hooks";
import type { SaveStatus } from "@/features/documents/types/save-state.types";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { cn } from "@/lib/utils";
import { i18n } from "@/shared/libs/i18n";
import { DocumentLockOverlay } from "@/widgets/documents/DocumentLockOverlay";
import { DocumentSavingIndicator } from "@/widgets/documents/DocumentSavingIndicator";

const DocumentViewerCanvas = dynamic(
  () =>
    import("@/widgets/documents/document-viewer").then((mod) => ({
      default: mod.DocumentViewerCanvas,
    })),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" />,
  }
);

type CameraState = { x: number; y: number; z: number };

type DocumentsViewerPanelProps = {
  isFullscreen: boolean;
  viewerProgress: number;
  storeErrorMessage?: string | undefined;
  saveStatus: SaveStatus;
  tldrawViewerStoreState: TldrawStoreState;
  viewerCamera?: CameraState | null;
  viewerCameraRef?: MutableRefObject<CameraState | null>;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  waId: string;
  isCanvasLocked: boolean;
  isCheckingLock: boolean;
  onViewerMount: (editor: Editor) => void;
  className?: string;
};

export function DocumentsViewerPanel({
  isFullscreen,
  storeErrorMessage,
  saveStatus,
  tldrawViewerStoreState,
  viewerCamera,
  viewerCameraRef,
  setSaveStatus,
  waId,
  isCanvasLocked,
  isCheckingLock,
  onViewerMount,
  className,
}: DocumentsViewerPanelProps) {
  const { isLocalized } = useLanguageStore();
  return (
    <div
      className={cn(
        `tldraw-viewer-container relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 ${isFullscreen ? "rounded-none border-0" : ""}`,
        className
      )}
    >
      <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
        <DocumentViewerCanvas
          className="h-full flex-1"
          storeState={tldrawViewerStoreState}
          {...(storeErrorMessage ? { errorMessage: storeErrorMessage } : {})}
          onEditorMount={onViewerMount}
        >
          {waId && tldrawViewerStoreState.status === "ready" ? (
            <DocumentViewerCameraManager
              setSaveStatus={setSaveStatus}
              viewerCamera={viewerCamera}
              {...(viewerCameraRef ? { viewerCameraRef } : {})}
              viewerStoreStatus={tldrawViewerStoreState.status}
              waId={waId}
            />
          ) : null}
        </DocumentViewerCanvas>

        <DocumentLockOverlay
          active={isCanvasLocked}
          loading={isCheckingLock}
          {...(isCanvasLocked
            ? {
                message: i18n.getMessage("document_lock_message", isLocalized),
              }
            : {})}
        />

        <div className="tldraw-status-overlay absolute top-4 right-4">
          <DocumentSavingIndicator status={saveStatus} />
        </div>
      </div>
    </div>
  );
}
