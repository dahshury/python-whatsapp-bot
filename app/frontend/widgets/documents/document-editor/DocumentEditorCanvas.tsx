"use client";

import type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import { memo } from "react";
import { DocumentCanvas } from "@/widgets/document-canvas/DocumentCanvas";

type DocumentEditorCanvasProps = {
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
 * Reusable editor canvas component.
 * Provides full editing capabilities for document canvases.
 */
function DocumentEditorCanvasComponent({
  theme,
  langCode,
  onApiReady,
  onChange,
  scene,
  className,
}: DocumentEditorCanvasProps) {
  return (
    <div className={`h-full w-full ${className || ""}`}>
      <DocumentCanvas
        langCode={langCode}
        onApiReady={onApiReady}
        onChange={onChange}
        theme={theme}
        {...(scene ? { scene } : {})}
        forceLTR={true}
        hideHelpIcon={true}
        scrollable={false}
        viewModeEnabled={false}
        zenModeEnabled={false}
      />
    </div>
  );
}

export const DocumentEditorCanvas = memo(DocumentEditorCanvasComponent);
