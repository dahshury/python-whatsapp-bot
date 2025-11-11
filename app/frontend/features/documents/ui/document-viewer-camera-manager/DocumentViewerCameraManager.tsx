"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { useEditor } from "tldraw";

import type { TldrawStoreState } from "../../hooks/useTldrawStore";
import type { SaveStatus } from "../../types/save-state.types";

export type DocumentViewerCameraManagerProps = {
  waId: string;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  viewerCameraRef?: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
  } | null>;
  viewerCamera: { x: number; y: number; z: number } | null | undefined;
  viewerStoreStatus: TldrawStoreState["status"];
};

export function DocumentViewerCameraManager({
  waId,
  setSaveStatus,
  viewerCameraRef,
  viewerCamera,
  viewerStoreStatus,
}: DocumentViewerCameraManagerProps) {
  const editor = useEditor();
  const cameraLoadedRef = useRef(false);
  const lastWaIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    if (waId !== lastWaIdRef.current) {
      cameraLoadedRef.current = false;
      lastWaIdRef.current = waId;
    }

    if (
      viewerStoreStatus === "ready" &&
      viewerCamera &&
      !cameraLoadedRef.current
    ) {
      editor.setCamera(viewerCamera, { animation: { duration: 0 } });
      if (viewerCameraRef) {
        viewerCameraRef.current = viewerCamera;
      }
      cameraLoadedRef.current = true;
    }
  }, [editor, waId, viewerCamera, viewerCameraRef, viewerStoreStatus]);

  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    const unlisten = editor.store.listen(
      ({ changes }) => {
        try {
          const suppressUntil = (
            globalThis as unknown as { __docSuppressAutosave?: number }
          ).__docSuppressAutosave;
          if (suppressUntil && Date.now() < suppressUntil) {
            return;
          }
        } catch {
          // Ignore check failures
        }

        const hasCameraChange =
          Object.keys(changes.updated).some((id) => id.startsWith("camera")) ||
          Object.keys(changes.added).some((id) => id.startsWith("camera"));
        if (hasCameraChange) {
          if (viewerCameraRef) {
            viewerCameraRef.current = editor.getCamera();
          }
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
