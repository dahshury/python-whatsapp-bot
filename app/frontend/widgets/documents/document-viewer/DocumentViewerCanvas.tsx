"use client";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { memo } from "react";
import { DocumentCanvas } from "@/widgets/document-canvas/DocumentCanvas";
import "@/styles/excalidraw-viewer.css";

type DocumentViewerCanvasProps = {
  theme: "light" | "dark";
  langCode: string;
  onApiReady: (api: ExcalidrawImperativeAPI) => void;
  onChange: ExcalidrawProps["onChange"];
  scene?:
    | {
        elements?: unknown[];
        appState?: Record<string, unknown>;
        files?: Record<string, unknown>;
      }
    | undefined;
  className?: string;
};

/**
 * Reusable viewer canvas component.
 * Provides a read-only mirror of the editor with independent camera controls.
 */
function DocumentViewerCanvasComponent({
  theme,
  langCode,
  onApiReady,
  onChange,
  scene,
  className,
}: DocumentViewerCanvasProps) {
  return (
    <div
      className={`excalidraw-viewer-container h-full w-full ${className || ""}`}
    >
      <DocumentCanvas
        forceLTR={true}
        hideHelpIcon={true}
        hideToolbar={true}
        langCode={langCode}
        onApiReady={onApiReady}
        onChange={onChange}
        scrollable={false}
        theme={theme}
        {...(scene ? { scene } : {})}
        uiOptions={{
          canvasActions: {
            toggleTheme: false,
            export: false,
            saveAsImage: false,
            clearCanvas: false,
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
        viewModeEnabled={true}
        zenModeEnabled={true}
      />
    </div>
  );
}

export const DocumentViewerCanvas = memo(DocumentViewerCanvasComponent);
