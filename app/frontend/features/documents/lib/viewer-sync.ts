import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { MutableRefObject } from "react";

type ViewerSceneData = {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

type ViewerSyncAdapterOptions = {
  viewerApiRef: MutableRefObject<ExcalidrawImperativeAPI | null>;
  pendingViewerInitRef: MutableRefObject<ViewerSceneData | null>;
  onError?: (context: string, error: unknown) => void;
};

export type ViewerSyncAdapter = {
  applyScene: (scene: ViewerSceneData, context?: string) => void;
  reset: (context?: string) => void;
};

export function createViewerSyncAdapter(
  options: ViewerSyncAdapterOptions
): ViewerSyncAdapter {
  const { viewerApiRef, pendingViewerInitRef, onError } = options;

  const applyScene = (scene: ViewerSceneData, context?: string) => {
    try {
      const api = viewerApiRef.current as unknown as {
        updateScene?: (s: ViewerSceneData) => void;
      } | null;
      if (api?.updateScene) {
        api.updateScene(scene);
        return;
      }
      pendingViewerInitRef.current = scene;
    } catch (error) {
      onError?.(context ?? "applyScene", error);
    }
  };

  const reset = (context?: string) => {
    applyScene({ elements: [], appState: {}, files: {} }, context);
  };

  return {
    applyScene,
    reset,
  };
}
