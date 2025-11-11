"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { getSnapshot, type TLPageId, useEditor } from "tldraw";

import type { TldrawStoreState } from "../../hooks/useTldrawStore";
import type { SaveStatus } from "../../types/save-state.types";
import type { DocumentsUseCase } from "../../usecase/documents.usecase";

const AUTOSAVE_IDLE_MS = 3000;
const AUTOSAVE_MAX_DIRTY_MS = 15_000;

export type DocumentAutosaveBridgeProps = {
  waId: string;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  viewerCameraRef?: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
  } | null>;
  editorCamera: { x: number; y: number; z: number } | null | undefined;
  editorPageId: TLPageId | null | undefined;
  editorStoreStatus: TldrawStoreState["status"];
  documentsService: DocumentsUseCase;
};

export function DocumentAutosaveBridge({
  waId,
  setSaveStatus,
  viewerCameraRef,
  editorCamera,
  editorPageId,
  editorStoreStatus,
  documentsService,
}: DocumentAutosaveBridgeProps) {
  const editor = useEditor();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDirtyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const latestSnapshotRef = useRef<string>("");
  const cameraLoadedRef = useRef(false);
  const pageLoadedRef = useRef(false);
  const lastWaIdRef = useRef<string | null>(null);
  const lastPageIdRef = useRef<string | null>(null);

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
    const source = (snapshot ?? {}) as {
      document?: unknown;
      session?: unknown;
    };
    const result: Record<string, unknown> = {};
    if (source.document !== undefined) {
      result.document = source.document;
    }
    return result;
  }, []);

  const captureState = useCallback(() => {
    if (!editor) {
      return null;
    }
    const snapshot = getSnapshot(editor.store);
    const currentEditorCamera = editor.getCamera();
    const currentEditorPageId = editor.getCurrentPageId();
    return {
      snapshot: formatSnapshotForPersist(snapshot),
      editorCamera: currentEditorCamera,
      editorPageId: currentEditorPageId,
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

    try {
      const suppressUntil = (
        globalThis as unknown as { __docSuppressAutosave?: number }
      ).__docSuppressAutosave;
      if (suppressUntil && Date.now() < suppressUntil) {
        clearIdleTimer();
        clearMaxDirtyTimer();
        return;
      }
    } catch {
      // Ignore check failures
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
      const viewerCamera = viewerCameraRef?.current ?? undefined;
      const success = await documentsService.save(waId, {
        document: {
          type: "tldraw",
          snapshot: capturedState.snapshot,
          editorCamera: capturedState.editorCamera,
          editorPageId: capturedState.editorPageId,
          ...(viewerCamera ? { viewerCamera } : {}),
        },
      });
      if (!success) {
        throw new Error("Save request failed");
      }

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
        // Fire and forget - errors are handled within performSave
        performSave().catch(() => {
          // Errors are already handled inside performSave function
        });
      }
    }
  }, [
    captureState,
    clearIdleTimer,
    clearMaxDirtyTimer,
    documentsService,
    editor,
    setSaveStatus,
    waId,
    viewerCameraRef?.current,
  ]);

  const scheduleIdleSave = useCallback(() => {
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

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      // Fire and forget - errors are handled within performSave
      performSave().catch(() => {
        // Errors are already handled inside performSave function
      });
    }, AUTOSAVE_IDLE_MS);
  }, [performSave]);

  const ensureMaxDirtySave = useCallback(() => {
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

    if (maxDirtyTimerRef.current) {
      return;
    }
    maxDirtyTimerRef.current = setTimeout(() => {
      // Fire and forget - errors are handled within performSave
      performSave().catch(() => {
        // Errors are already handled inside performSave function
      });
    }, AUTOSAVE_MAX_DIRTY_MS);
  }, [performSave]);

  useEffect(() => {
    if (!(editor && waId)) {
      return;
    }

    if (waId !== lastWaIdRef.current) {
      cameraLoadedRef.current = false;
      pageLoadedRef.current = false;
      lastWaIdRef.current = waId;
    }

    if (editorStoreStatus !== "ready") {
      return;
    }

    if (!pageLoadedRef.current) {
      if (editorPageId) {
        try {
          const pages = editor.getPages();
          const pageExists = pages.some((page) => page.id === editorPageId);
          if (pageExists) {
            editor.setCurrentPage(editorPageId);
            pageLoadedRef.current = true;

            if (editorCamera) {
              editor.setCamera(editorCamera, { animation: { duration: 0 } });
              cameraLoadedRef.current = true;
            } else {
              cameraLoadedRef.current = true;
            }
          }
        } catch {
          // Page might not exist yet, will retry on next render
        }
      } else {
        if (editorCamera && !cameraLoadedRef.current) {
          editor.setCamera(editorCamera, { animation: { duration: 0 } });
          cameraLoadedRef.current = true;
        }
        pageLoadedRef.current = true;
      }
    } else if (!cameraLoadedRef.current && editorCamera) {
      editor.setCamera(editorCamera, { animation: { duration: 0 } });
      cameraLoadedRef.current = true;
    }
  }, [editor, waId, editorCamera, editorPageId, editorStoreStatus]);

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

    const unlistenDocument = editor.store.listen(
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

    const unlistenCamera = editor.store.listen(
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

    if (lastPageIdRef.current === null) {
      lastPageIdRef.current = editor.getCurrentPageId();
    }
    const unlistenPage = editor.store.listen(
      () => {
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

        const currentPageId = editor.getCurrentPageId();
        if (currentPageId !== lastPageIdRef.current) {
          lastPageIdRef.current = currentPageId;
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
      { scope: "all" }
    );

    return () => {
      unlistenDocument();
      unlistenCamera();
      unlistenPage();
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
