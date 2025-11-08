"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import "@/styles/tldraw.css";
import type { ReactNode } from "react";
import type { TldrawStoreState } from "@/features/documents/hooks/useTldrawStore";
import { cn } from "@/lib/utils";
import {
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressRoot,
  CircularProgressTrack,
  CircularProgressValueText,
} from "@/shared/ui/circular-progress";

type DocumentEditorCanvasProps = {
  storeState: TldrawStoreState;
  className?: string;
  readOnly?: boolean;
  focusMode?: boolean;
  loadingLabel?: string;
  errorMessage?: string;
  progress?: number | null;
  children?: ReactNode;
};

/**
 * TLDraw canvas component with loading/error handling.
 * Accepts an external TLDraw store state for flexible data loading workflows.
 */
export const DocumentEditorCanvas = ({
  storeState,
  className,
  readOnly = false,
  focusMode = false,
  errorMessage,
  progress,
  children,
}: DocumentEditorCanvasProps) => {
  const errorText = errorMessage ?? "Unable to load canvas";

  let content: ReactNode;

  if (storeState.status === "loading") {
    const progressValue = progress ?? null;
    content = (
      <div className="flex h-full w-full items-center justify-center">
        <CircularProgressRoot size={48} value={progressValue}>
          <CircularProgressIndicator size={48} strokeWidth={4}>
            <CircularProgressTrack />
            <CircularProgressRange />
          </CircularProgressIndicator>
          <CircularProgressValueText />
        </CircularProgressRoot>
      </div>
    );
  } else if (storeState.status === "error") {
    content = (
      <div className="flex h-full w-full items-center justify-center px-4 text-destructive/80 text-sm">
        {errorText}
      </div>
    );
  } else {
    content = (
      <Tldraw
        hideUi={focusMode}
        inferDarkMode
        onMount={(editor) => {
          if (readOnly) {
            editor.updateInstanceState({ isReadonly: true });
          }
        }}
        store={storeState.store}
      >
        {children}
      </Tldraw>
    );
  }

  return (
    <div
      className={cn(
        "tldraw-canvas-wrapper relative flex h-full w-full items-stretch",
        className
      )}
    >
      {content}
    </div>
  );
};
